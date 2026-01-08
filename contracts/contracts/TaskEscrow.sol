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
        address worker;
        uint256 reward;     // In Assets (USDC)
        uint256 depositShares; // In Vault Shares (Tracks ownership of the vault pool)
        uint256 deadline;
        TaskStatus status;
        string metadataHash;
        string answer;
    }

    uint256 public taskCounter;
    mapping(uint256 => Task) public tasks;

    // Internal Savings Accounts (Shares in the Vault)
    // Users can leave funds here to earn yield instead of withdrawing immediately.
    mapping(address => uint256) public savingsShares;

    ReputationRegistry public reputationRegistry;
    MockYieldVault public vault;
    address public admin;
    
    // Total fees collected (in Shares)
    uint256 public accumulatedFeeShares;

    uint256 public constant PLATFORM_FEE_BPS = 500; // 5%

    event TaskCreated(uint256 indexed taskId, address indexed agency, uint256 reward);
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

    // MANDATORY: Allow contract to receive ETH (Native USDC) 
    // This is required for funding and vault compatibility.
    receive() external payable {}
    fallback() external payable {}

    /**
     * @dev Create multiple tasks at once to save gas and signatures.
     */
    function createTasksBatch(uint256 _rewardPerTask, uint256 _count, uint256 _deadline, string calldata _metadataHash) external payable {
        require(_count > 0, "Count must be > 0");
        uint256 fee = (_rewardPerTask * PLATFORM_FEE_BPS) / 10000;
        uint256 requiredPerTask = _rewardPerTask + fee;
        uint256 totalRequired = requiredPerTask * _count;

        require(msg.value >= totalRequired, "Insufficient total deposit");

        // 1. DEPOSIT TOTAL INTO VAULT
        uint256 totalSharesMinted = vault.deposit{value: msg.value}();
        uint256 sharesPerTask = totalSharesMinted / _count;

        // 2. CREATE TASKS IN LOOP
        for (uint256 i = 0; i < _count; i++) {
            taskCounter++;
            tasks[taskCounter] = Task({
                id: taskCounter,
                agency: msg.sender,
                worker: address(0),
                reward: _rewardPerTask,
                depositShares: sharesPerTask,
                deadline: block.timestamp + _deadline,
                status: TaskStatus.Created,
                metadataHash: _metadataHash,
                answer: ""
            });
            emit TaskCreated(taskCounter, msg.sender, _rewardPerTask);
        }

        // Handle dust shares from division if any
        uint256 dust = totalSharesMinted % _count;
        if (dust > 0) {
            tasks[taskCounter].depositShares += dust;
        }
    }

    function createTask(uint256 _reward, uint256 _deadline, string calldata _metadataHash) external payable {
        uint256 fee = (_reward * PLATFORM_FEE_BPS) / 10000;
        uint256 requiredDeposit = _reward + fee;

        require(msg.value >= requiredDeposit, "Insufficient deposit");

        // 1. DEPOSIT INTO VAULT IMMEDIATELY
        uint256 sharesMinted = vault.deposit{value: msg.value}();

        taskCounter++;
        tasks[taskCounter] = Task({
            id: taskCounter,
            agency: msg.sender,
            worker: address(0),
            reward: _reward,
            depositShares: sharesMinted,
            deadline: block.timestamp + _deadline,
            status: TaskStatus.Created,
            metadataHash: _metadataHash,
            answer: ""
        });

        emit TaskCreated(taskCounter, msg.sender, _reward);
    }

    function submitTask(uint256 _taskId, string calldata _answer) external {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Created || task.status == TaskStatus.Rejected, "Invalid status");
        
        if (task.worker == address(0)) {
            task.worker = msg.sender;
        } else {
            require(task.worker == msg.sender, "Not your task");
        }
        
        task.status = TaskStatus.Submitted;
        task.answer = _answer;

        emit TaskSubmitted(_taskId, msg.sender, _answer);
    }

    /**
     * @dev Approve task and distribute funds + YIELD.
     * Agency gets the yield generated during the task duration.
     * Worker gets the Agile reward (principal) but can choose to keep it in savings to earn future yield.
     */
    function approveTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.agency || msg.sender == admin, "Not authorized");
        require(task.status == TaskStatus.Submitted, "Not submitted");

        task.status = TaskStatus.Approved;

        // Calculate current Asset Value of the deposit
        uint256 totalAssetsLocked = vault.convertToAssets(task.depositShares);
        
        // The fixed reward to pay the worker
        uint256 rewardAssets = task.reward;
        
        // Calculate shares needed for the reward NOW
        // Note: converting assets -> shares now gives fewer shares than before because price went up.
        // This difference is the "Yield" kept by the holder of the original shares.
        uint256 rewardShares = (task.depositShares * rewardAssets) / totalAssetsLocked; // Proportional split
        
        // 1. Pay Worker -> Into Savings (So they start earning yield immediately too)
        savingsShares[task.worker] += rewardShares;
        
        // 2. Platform Fee
        uint256 feeAssets = (task.reward * PLATFORM_FEE_BPS) / 10000;
        uint256 feeShares = (task.depositShares * feeAssets) / totalAssetsLocked;
        accumulatedFeeShares += feeShares;

        // 3. Agency Refund (Surplus/Yield)
        // The Agency keeps the remaining shares, which now represent the Yield generated on the principal
        // plus any implementation dust.
        uint256 remainingShares = task.depositShares - rewardShares - feeShares;
        if (remainingShares > 0) {
            savingsShares[task.agency] += remainingShares;
        }

        reputationRegistry.recordApproval(task.worker);
        emit TaskApproved(_taskId, task.worker, rewardAssets);
    }

    function rejectTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.agency, "Not agency");
        require(task.status == TaskStatus.Submitted, "Not submitted");

        task.status = TaskStatus.Rejected;
        
        // Refund everything to Agency's Savings
        // Use savings so they don't lose the yield generated while waiting
        savingsShares[task.agency] += task.depositShares;

        reputationRegistry.recordRejection(task.worker);
        emit TaskRejected(_taskId, task.worker);
    }

    function cancelTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.agency, "Not agency");
        require(task.status == TaskStatus.Created, "Too late");
        
        task.status = TaskStatus.Cancelled;

        // Refund all shares to Agency Savings
        savingsShares[task.agency] += task.depositShares;
        
        emit TaskCancelled(_taskId, msg.sender);
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
}
