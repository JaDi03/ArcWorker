# Circle User-Controlled Wallet: Onboarding Guide (End-to-End)

This document explains the technical flow of how an ArcWork user goes from "New User" to "On-Chain Wallet" using the Circle Programmable Wallets (W3S) infrastructure.

---

## 1. Authentication (Server-Side)
- **Endpoint**: `POST /users/token`
- **What happens**: We send the `userId` (e.g., `arc_user_worker3`) to Circle.
- **Result**: Circle returns a `userToken` (temporary access for that user) and an `encryptionKey`.
- **Security**: These are sent to the frontend but are only valid for 60 minutes.

## 2. Wallet Initialization (Server-Side)
- **Endpoint**: `POST /user/initialize`
- **What happens**: The backend asks Circle to prepare a wallet for the user on specific blockchains (e.g., `MATIC-AMOY`).
- **Result**: Circle returns a `challengeId`. This ID represents the "permission" to ask the user for their PIN.

## 3. The PIN Challenge (Frontend SDK)
- **SDK**: `@circle-fin/w3s-pw-web-sdk`
- **Function**: `sdk.execute(challengeId, callback)`
- **The Experience**:
    1. A secure Circle iframe or popup appears.
    2. The user **creates their PIN** (6 digits).
    3. The user **selects 3 recovery questions** and answers.
    4. Circle encrypts the keys using this PIN. **Circle never sees the plaintext PIN.**

## 4. Wallet Deployment (Asynchronous)
- **Blockchain**: Once the PIN is set, Circle's backend broadcasts the "account creation" to the blockchain.
- **Timing**: This takes **5-15 seconds** depending on network congestion.
- **Verification**: We use a **polling mechanism** in our frontend `useCircleWallet` hook to wait until the address is visible.

---

## 5. Security & Recovery
- **If the user forgets their PIN**: They use the **recovery questions** configured in Step 3.
- **Custodian**: You (ArcWork) are the custodian of the Application. Circle manages the infrastructure. The User manages the access (the PIN).

## 6. How it interacts with Arc Network
- **Current Setup**:
    - **Circle Wallet**: Lives on **Amoy (Polygon Testnet)**.
    - **ArcWork Contracts**: Live on **Arc Testnet**.
- **The Gap**: A wallet on Amoy cannot directly pay for or call a contract on Arc.
- **Recommended Next Steps**: 
    1. **Migration**: Move the production Escrow contracts to **Polygon (or Amoy)** for a 100% seamless Circle AA experience.
    2. **Or Bridge**: Use a cross-chain Bridge (complex for MVP).
    3. **Or EOA**: For Arc Testnet, the user currently uses MetaMask.

---

### FAQ
**Q: Can we use Email Login?**
**A**: Yes. Circle supports integrating with auth providers (like Auth0 or Firebase). We would exchange the Email OAuth Token for the Circle User Token.

**Q: Where do I see the transactions?**
**A**: For the Circle wallet, use [Polygonscan Amoy](https://amoy.polygonscan.com/). For MetaMask on Arc, use [ArcScan](https://testnet.arcscan.app/).
