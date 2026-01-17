# Protocol Overview

ArcWorker is built on a modular architecture that combines on-chain integrity with off-chain performance.

## The Role of ARC Network

We chose the **ARC Network** for its unique infrastructure:
*   **Determinism**: Ensuring consistent states for distributed workers.
*   **Low Fees**: Crucial for micro-payouts to thousands of workers.
*   **Speed**: Sub-second block times for instant quality feedback.

## System Components

### 1. Smart Contract Layer (TaskEscrow)
The source of truth for funds and task states. It ensures that an agency has the money before workers start, and that workers are paid fairly.

### 2. Identity Layer (Universal Identity)
Leveraging Circle's Programmable Wallets, we map email addresses to non-custodial wallets. This allows "Abstracted Web3" where users interact with the blockchain using standard login methods.

### 3. Verification Layer
A distributed system that calculates consensus or matches Golden Sets. It bridges the gap between worker submissions and contract payouts.

### 4. Storage Layer
Uses **Vercel Blob** for fast, persistent storage of large datasets (images/videos) and **IPFS** for decentralized metadata records.
