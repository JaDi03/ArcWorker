# ArcWorker Protocol Authentication Patterns

This document outlines the available authentication strategies supported by the ArcWorker SDK.
While the protocol currently defaults to **Username/PIN** (Custom Auth), the infrastructure supports Email OTP and Social Login.

## 1. Username/PIN (Custom Auth) - **CURRENT STANDARD**
Uses Circle's "User-Controlled" flow but manages the `userId` mapping internally.
- **Backend Route:** `/api/circle/auth/custom`
- **SDK Method:** `createCircleSession(userId)`
- **Flow:**
  1. Frontend sends `username` (or any unique ID).
  2. Backend mints a `userToken` for that ID.
  3. SDK initializes with `userToken` + `encryptionKey`.
  4. User sets 6-digit PIN.

## 2. Email OTP (Legacy/Alternative)
Uses Circle's native Email OTP system. This sends a verification code to the user's email.
Useful if strict email verification is required by the client.

- **Backend Route:** (Requires implementation connecting to `createCircleEmailSession`)
- **SDK Function:** `createCircleEmailSession(email, deviceId)` in `server.ts`.
- **Flow:**
  1. Frontend generates a `deviceId` (UUID).
  2. Call Backend: `POST /api/circle/auth/email` (pass `email`, `deviceId`).
  3. Backend calls `circleClient.post('/users/email/token', ...)`.
  4. **Returns:** `deviceToken`, `deviceEncryptionKey` (NOT userToken yet).
  5. **Frontend:** Calls `sdk.performLogin(deviceToken, deviceEncryptionKey)`.
  6. **User Action:** Circle sends an OTP email. User inputs code in the Widget.
  7. **Result:** Widget returns `userToken` + `encryptionKey` upon success.
  
### Code Snippet (Frontend Implementation Guide)
```typescript
// Example of how to implement Email OTP in UserSetupModal
const handleEmailLogin = async () => {
    // 1. Get Device ID
    const deviceId = uuidv4(); 
    
    // 2. Request OTP
    const { deviceToken, key } = await axios.post('/api/circle/auth/email', { email, deviceId });

    // 3. Trigger Widget
    sdk.performLogin(deviceToken, key, (err, result) => {
        if (result) {
            // result.userToken is the session
        }
    });
}
```

## 3. Social Login (Google/Apple)
Currently supported via `createCircleSocialSession`.
- **Flow:** Similar to Email OTP but redirects to provider instead of showing PIN pad immediately.
- **Status:** Integrated in SDK (`prepareSocialLogin`).

---
**Note:** To switch back to Email OTP, reimplement the `handleEmailLogin` logic using the `createCircleEmailSession` server function.
