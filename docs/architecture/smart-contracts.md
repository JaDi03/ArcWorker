# Smart Contracts

The heart of ArcWorker is a set of secure, audited smart contracts on the ARC Network.

## TaskEscrow.sol

This is the main contract that governs the relationship between Agencies and Workers.

### Key Functions

*   **createCampaign**: An agency deposits USDC and creates a new task campaign.
*   **submitTask**: Records a worker's submission hash and timestamp.
*   **validateTask**: Called by the verification service (or agency) to trigger a payout.
*   **payout**: Transfers USDC from the escrow to the worker's address.
*   **cancelCampaign**: Allows agencies to refund unused funds for unstarted tasks.

### Escrow Logic

When a campaign is created, the total reward (Price x Task Count) + protocol fee (5%) is locked in the contract.
*   **Protocol Fee**: 5% of the total budget.
*   **Worker Payout**: 100% of the price per task goes to the worker.
*   **Gas Fees**: Currently handled by the user/sponsored by the platform.

## Security Features

1.  **Reentrancy Protection**: All financial functions follow the Checks-Effects-Interactions pattern.
2.  **Access Control**: Only the original agency can cancel a campaign. Only verified validators can trigger auto-payouts.
3.  **Encrypted Metadata**: Dataset links and instructions are stored as IPFS hashes or encrypted strings to protect data privacy.
