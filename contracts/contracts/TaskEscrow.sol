// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ReputationRegistry.sol";
import "./MockYieldVault.sol";

/**
 * @title TaskEscrow (Yield Enabled)
 * @dev Manages funds, task lifecycle, and payouts on Arc Network.
 * NOW WITH YIELD: Funds are automatically deposited into MockYieldVault to earn 5% APY.
 */
contract TaskEscrow {
    enum TaskStatus { Created, Submitted, Approved, Rejected, Cancelled }

    struct Task {
        uint256 id;
        address agency;
        uint256 reward;     // In Assets (USDC)
        uint256 depositShares; // In Vault Shares
        uint256 deadline;
        TaskStatus status;
        string metadataHash;
        uint256 requiredSubmissions; // How many workers needed
        uint256 currentSubmissions;  // Counter
        bytes32 correctAnswerHash;   // For Golden Set (Ground Truth)
    }

    struct Submission {
        address worker;
        string answer;
        bool approved;
    }

    uint256 public taskCounter;
    mapping(uint256 => Task) public tasks;
    mapping(uint256 => Submission[]) public taskSubmissions;
    
    // Track if a worker already participated in a task
    mapping(uint256 => mapping(address => bool)) public taskParticipated;

    // Internal Savings Accounts (Shares in the Vault)
    mapping(address => uint256) public savingsShares;

    ReputationRegistry public reputationRegistry;
    MockYieldVault public vault;
    address public admin;
    
    uint256 public accumulatedFeeShares;
    uint256 public constant PLATFORM_FEE_BPS = 500; // 5%

    event TaskCreated(uint256 indexed taskId, address indexed agency, uint256 reward, uint256 requiredSubmissions);
    event TaskSubmitted(uint256 indexed taskId, address indexed worker, string answer);
    event TaskApproved(uint256 indexed taskId, address indexed worker, uint256 payout);
    event TaskRejected(uint256 indexed taskId, address indexed worker);
    event TaskCancelled(uint256 indexed taskId, address indexed agency);
    event SavingsWithdrawn(address indexed user, uint256 assets, uint256 yieldEarned);

    constructor(address _reputationRegistry, address payable _vault) {
        reputationRegistry = ReputationRegistry(_reputationRegistry);
        vault = MockYieldVault(_vault);
        admin = msg.sender;
    }

    receive() external payable {}
    fallback() external payable {}

    /**
     * @dev Create multiple tasks at once.
     * @param _requiredSubmissions Number of workers required for this task.
     * @param _correctAnswerHash Optional hash for Golden Set (0 if not used).
     */
    function createTasksBatch(uint256 _rewardPerTask, uint256 _count, uint256 _deadline, string calldata _metadataHash, uint256 _requiredSubmissions, bytes32 _correctAnswerHash) external payable {
        require(_count > 0, "Count must be > 0");
        require(_requiredSubmissions > 0, "Required submissions must be > 0");
        
        uint256 fee = (_rewardPerTask * PLATFORM_FEE_BPS) / 10000;
        uint256 requiredPerSubmission = _rewardPerTask + fee;
        uint256 totalRequired = requiredPerSubmission * _count * _requiredSubmissions;

        require(msg.value >= totalRequired, "Insufficient total deposit");

        uint256 totalSharesMinted = vault.deposit{value: msg.value}();
        uint256 sharesPerTask = totalSharesMinted / _count;

        for (uint256 i = 0; i < _count; i++) {
            taskCounter++;
            tasks[taskCounter] = Task({
                id: taskCounter,
                agency: msg.sender,
                reward: _rewardPerTask,
                depositShares: sharesPerTask,
                deadline: block.timestamp + _deadline,
                status: TaskStatus.Created,
                metadataHash: _metadataHash,
                requiredSubmissions: _requiredSubmissions,
                currentSubmissions: 0,
                correctAnswerHash: _correctAnswerHash
            });
            emit TaskCreated(taskCounter, msg.sender, _rewardPerTask, _requiredSubmissions);
        }

        uint256 dust = totalSharesMinted % _count;
        if (dust > 0) {
            tasks[taskCounter].depositShares += dust;
        }
    }

    function submitTask(uint256 _taskId, string calldata _answer) external {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Created, "Invalid status");
        require(task.currentSubmissions < task.requiredSubmissions, "Task full");
        require(!taskParticipated[_taskId][msg.sender], "Already participated");
        require(block.timestamp <= task.deadline, "Deadline passed");

        taskParticipated[_taskId][msg.sender] = true;
        taskSubmissions[_taskId].push(Submission({
            worker: msg.sender,
            answer: _answer,
            approved: false
        }));
        task.currentSubmissions++;
        
        emit TaskSubmitted(_taskId, msg.sender, _answer);

        // --- AUTOMATIC VERIFICATION LOGIC ---
        
        // 1. GOLDEN SET (Immediate Approval)
        if (task.correctAnswerHash != bytes32(0)) {
            if (keccak256(abi.encodePacked(_answer)) == task.correctAnswerHash) {
                _approveSubmission(_taskId, task.currentSubmissions - 1);
            }
        }
        
        // 2. CONSENSUS (Check if all required subs are in)
        if (task.currentSubmissions == task.requiredSubmissions) {
            bool allApproved = true;
            for (uint256 i = 0; i < taskSubmissions[_taskId].length; i++) {
                if (!taskSubmissions[_taskId][i].approved) {
                    allApproved = false;
                    break;
                }
            }
            task.status = allApproved ? TaskStatus.Approved : TaskStatus.Submitted;
        }
    }

    /**
     * @dev Internal approval logic for a specific submission.
     */
    function _approveSubmission(uint256 _taskId, uint256 _submissionIndex) internal {
        Task storage task = tasks[_taskId];
        Submission storage sub = taskSubmissions[_taskId][_submissionIndex];
        require(!sub.approved, "Already approved");

        sub.approved = true;

        // Calculate Proportional Pay (+ Yield)
        // Shares per submission = total task shares / required submissions
        uint256 sharesPerSub = task.depositShares / task.requiredSubmissions;
        uint256 currentAssetValue = vault.convertToAssets(sharesPerSub);
        
        // Use fixed reward as primary, surplus (yield) goes to agency later or is handled proportionally
        uint256 rewardAssets = task.reward;
        uint256 rewardShares = (sharesPerSub * rewardAssets) / currentAssetValue;

        savingsShares[sub.worker] += rewardShares;

        uint256 feeAssets = (task.reward * PLATFORM_FEE_BPS) / 10000;
        uint256 feeShares = (sharesPerSub * feeAssets) / currentAssetValue;
        accumulatedFeeShares += feeShares;

        // Refund Surplus (Yield) to Agency
        uint256 surplusShares = sharesPerSub - rewardShares - feeShares;
        if (surplusShares > 0) {
            savingsShares[task.agency] += surplusShares;
        }

        reputationRegistry.recordApproval(sub.worker);
        emit TaskApproved(_taskId, sub.worker, rewardAssets);
    }

    /**
     * @dev Approve task and distribute funds + YIELD.
     * Agency gets the yield generated during the task duration.
     * Worker gets the Agile reward (principal) but can choose to keep it in savings to earn future yield.
     */
    function approveTask(uint256 _taskId) public {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.agency || msg.sender == admin, "Not authorized");
        require(task.status == TaskStatus.Submitted, "Not submitted");

        task.status = TaskStatus.Approved;

        // Approve ALL pending submissions for this task
        for (uint256 i = 0; i < taskSubmissions[_taskId].length; i++) {
            if (!taskSubmissions[_taskId][i].approved) {
                _approveSubmission(_taskId, i);
            }
        }
    }

    /**
     * @dev Allows agency to approve a SPECIFIC submission (Granular control)
     */
    function approveSubmission(uint256 _taskId, uint256 _submissionIndex) public {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.agency || msg.sender == admin, "Not authorized");
        _approveSubmission(_taskId, _submissionIndex);
    }

    function approveTasksBatch(uint256[] calldata _taskIds) external {
        for (uint256 i = 0; i < _taskIds.length; i++) {
            approveTask(_taskIds[i]);
        }
    }

    function rejectTask(uint256 _taskId) public {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.agency || msg.sender == admin, "Not authorized");
        
        task.status = TaskStatus.Rejected;
        
        // When a task is rejected, we refund EVERYTHING back to the agency's savings
        savingsShares[task.agency] += task.depositShares;
        task.depositShares = 0;

        emit TaskRejected(_taskId, address(0)); // address(0) means whole task rejected
    }

    function cancelTask(uint256 _taskId) public {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.agency, "Not agency");
        require(task.status == TaskStatus.Created, "Too late");
        
        task.status = TaskStatus.Cancelled;

        // Refund all shares to Agency Savings
        savingsShares[task.agency] += task.depositShares;
        
        emit TaskCancelled(_taskId, msg.sender);
    }

    function cancelTasksBatch(uint256[] calldata _taskIds) external {
        for (uint256 i = 0; i < _taskIds.length; i++) {
            cancelTask(_taskIds[i]);
        }
    }

    /**
     * @dev Withdraw funds from Savings Account.
     * _amountAssets: How much USDC you want to take out. 0 = ALL.
     */
    function withdrawSavings(uint256 _amountAssets) external {
        uint256 userShares = savingsShares[msg.sender];
        require(userShares > 0, "No savings");

        uint256 maxAssets = vault.convertToAssets(userShares);
        
        uint256 assetsToWithdraw;
        uint256 sharesToBurn;

        if (_amountAssets == 0 || _amountAssets >= maxAssets) {
            // Withdraw ALL
            assetsToWithdraw = maxAssets;
            sharesToBurn = userShares;
        } else {
            // Withdraw Partial
            // We calculate shares to burn based on current rate
            // formula: shares = assets * (totalShares / totalAssets) implies convertToShares
            // But we use the vault's inverse func for precision
            // Note: convertToShares might round down, safer to calculate proportionally if possible,
            // but relying on vault logic is standard.
            // However, Vault.convertToShares(assets) gives shares needed for NEW deposit.
            // For withdrawal, we usually verify:
            sharesToBurn = (userShares * _amountAssets) / maxAssets; // Proportional
            assetsToWithdraw = _amountAssets;
        }

        savingsShares[msg.sender] -= sharesToBurn;
        
        // Withdraw from Vault to this contract
        vault.withdraw(sharesToBurn);
        // (Vault sends ETH/USDC to this contract)
        
        // Send to User
        (bool success, ) = payable(msg.sender).call{value: assetsToWithdraw}("");
        require(success, "Transfer failed");

        emit SavingsWithdrawn(msg.sender, assetsToWithdraw, 0);
    }
    
    // View function for UI to show "Live Balance"
    function getSavingsBalance(address _user) external view returns (uint256 assets) {
        return vault.convertToAssets(savingsShares[_user]);
    }

    /**
     * @dev Utility to fetch a batch of tasks in one call.
     * Helps UI avoid RPC rate limits (Error 429) and state flickering.
     */
    function getRecentTasks(uint256 _limit) external view returns (Task[] memory) {
        uint256 count = taskCounter;
        uint256 resultSize = _limit > count ? count : _limit;
        Task[] memory result = new Task[](resultSize);
        
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = tasks[count - i];
        }
        return result;
    }
}
