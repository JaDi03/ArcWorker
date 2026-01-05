# The Definitive Guide: Circle User-Controlled Wallets (PIN-Based)
> *Why the official docs might fail you and how to actually build it.*

Creating your first Circle wallet is easy on paper, but there are several "invisible" requirements that often lead to 404s or 400s. This guide contains the exact steps and payloads that worked for ArcWork.

---

## 🏗️ Architecture Overview
1. **Developer Console**: You need an API Key (Mainnet/Sandbox) and an **Entity Secret**.
2. **Backend**: Authenticates your app with Circle and requests challenges.
3. **Frontend**: Executes the secure UI (PIN/Security Questions) using the SDK.

---

## 1. Backend: The Secret Handshake
The first mistake is using the wrong endpoint for sessions.

### Step 1.1: Create a User Session
Official docs sometimes refer to `/user/sessions`. **Use `/users/token` instead.**

**Endpoint**: `POST https://api.circle.com/v1/w3s/users/token`
**Payload**:
```json
{
  "userId": "unique_user_id"
}
```
**Response (Crucial)**: 
You will get a `userToken` AND an `encryptionKey`. You need **BOTH** for the frontend SDK.

### Step 1.2: Initialize the Wallet
This is where most devs get a "Parameter Invalid" error.

**Endpoint**: `POST https://api.circle.com/v1/w3s/user/initialize`
**Payload (The "Gotchas"):**
- `blockchains`: Must be an **ARRAY** (plural), not a string.
- `accountType`: Use `"SCA"` (Smart Contract Account) for modern AA features.
- `idempotencyKey`: Must be a unique UUID.

```json
{
  "idempotencyKey": "uuid-v4-here",
  "accountType": "SCA",
  "blockchains": ["MATIC-AMOY"]
}
```
**Headers**: You MUST include `X-User-Token: <your_user_token>`.

---

## 2. Frontend: The SDK Execution
Install `@circle-fin/w3s-pw-web-sdk`.

### Step 2.1: Initialize the SDK
The `authentication` object requires the `encryptionKey` you got in Step 1.1.

```javascript
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

const sdk = new W3SSdk({
  appSettings: { appId: "your-circle-app-id" },
  authentication: { 
    userToken: "token-from-backend", 
    encryptionKey: "key-from-backend" 
  }
});
```

### Step 2.2: Execute the Challenge
Pass the `challengeId` returned from the `initialize` call.

```javascript
sdk.execute(challengeId, (error, result) => {
  if (error) {
    console.error("SDK Error:", error);
  } else {
    console.log("Success! Result:", result);
    // Note: The wallet address is created ASYNCHRONOUSLY.
    // Poll the backend /user/wallets until it appears.
  }
});
```

---

## 🔑 Common Pitfalls & Fixes

| Problem | Likely Cause | Fix |
| :--- | :--- | :--- |
| **404 Not Found** on Session | Wrong URL | Use `/users/token` instead of `/user/sessions`. |
| **API Parameter Invalid** | `blockchains` format | Use `["ETH-SEPOLIA"]` (array) instead of `"ETH-SEPOLIA"`. |
| **User not found** | API Key Mismatch | Ensure your API Key matches the environment (Sandbox key only for Sandbox URL). |
| **Modal doesn't open** | Authentication | Ensure `encryptionKey` is passed correctly to the SDK. |
| **No wallet in Console** | Challenge not finished | Wallets only appear in the Circle Console **after** the user sets their PIN. |

---

## 🚀 Pro-Tip for Developers
If you are moving to Production, you **MUST** configure your **Entity Secret** in the Circle Console and enable "User-Controlled Wallets". Without this, your requests will be rejected even with a valid production key.

*Built with 💙 for the ArcWork Developer Community.*
