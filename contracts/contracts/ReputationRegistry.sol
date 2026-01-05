// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ReputationRegistry
 * @dev Stores approval and rejection counts for workers.
 * Used by TaskEscrow to update stats after task validation.
 */
contract ReputationRegistry {
    struct Reputation {
        uint32 approved;
        uint32 rejected;
        uint256 lastUpdate;
    }

    mapping(address => Reputation) public workerReputation;
    address public taskEscrow;
    address public admin;

    event ReputationUpdated(address indexed worker, uint32 approved, uint32 rejected);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyEscrow() {
        require(msg.sender == taskEscrow, "Only TaskEscrow can update reputation");
        _;
    }

    function setTaskEscrow(address _taskEscrow) external {
        require(msg.sender == admin, "Only admin");
        taskEscrow = _taskEscrow;
    }

    function recordApproval(address _worker) external onlyEscrow {
        workerReputation[_worker].approved++;
        workerReputation[_worker].lastUpdate = block.timestamp;
        emit ReputationUpdated(_worker, workerReputation[_worker].approved, workerReputation[_worker].rejected);
    }

    function recordRejection(address _worker) external onlyEscrow {
        workerReputation[_worker].rejected++;
        workerReputation[_worker].lastUpdate = block.timestamp;
        emit ReputationUpdated(_worker, workerReputation[_worker].approved, workerReputation[_worker].rejected);
    }

    function getReputation(address _worker) external view returns (uint32 approved, uint32 rejected, uint256 score) {
        Reputation memory rep = workerReputation[_worker];
        uint32 total = rep.approved + rep.rejected;
        
        if (total == 0) {
            return (0, 0, 0);
        }

        // Simple Score: Approved percentage (0-100)
        score = (uint256(rep.approved) * 100) / total;
        return (rep.approved, rep.rejected, score);
    }
}
