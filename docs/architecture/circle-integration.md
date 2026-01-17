# Circle Integration

ArcWorker uses Circle's suite of developer tools to create a seamless Web2-to-Web3 experience.

## Circle Programmable Wallets

We use **User-Controlled Wallets** to ensure maximum security while maintaining ease of use.

### Registration Flow
1.  **Identity Creation**: `/api/circle/create-user` creates a unique Circle User ID for the worker.
2.  **Wallet Generation**: `initiation` call creates a non-custodial wallet tied to that user.
3.  **Challenge Response**: The frontend uses the Circle Web SDK to prompt the user for their passcode, which signs the wallet creation transaction.

## USDC Payments

All transactions within the protocol use **USDC**.
*   **Fees**: Paid in the native network token (sponsored by ArcWorker via Gas Station in the future).
*   **Rewards**: Settled in USDC to maintain stable value for workers in any country.

## Security Model

*   **Encryption Key**: Used to secure session data.
*   **User Token**: Short-lived tokens to authorize SDK actions.
*   **Challenge IDs**: Unique identifiers for every transaction that requires user signing.

Our integration ensures that ArcWorker stays **Non-Custodial**—neither ArcWorker nor Circle has access to the user's private keys.
