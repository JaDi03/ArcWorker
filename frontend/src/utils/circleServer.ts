import axios from 'axios';
import crypto from 'crypto';

// Production URL (The user's key only works here)
const CIRCLE_API_URL = 'https://api.circle.com/v1/w3s';

const circleClient = axios.create({
    baseURL: CIRCLE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Ensure key is loaded from process.env on every request
circleClient.interceptors.request.use((config) => {
    const key = process.env.CIRCLE_API_KEY;
    if (key) {
        config.headers['Authorization'] = `Bearer ${key.trim()}`;
    }
    return config;
});

export async function getOrCreateCircleUser(userId: string) {
    try {
        console.log(`[Circle] Checking user: ${userId}`);
        const response = await circleClient.get(`/users/${userId}`);
        return response.data.data;
    } catch (error: any) {
        if (error.response?.status === 404) {
            console.log(`[Circle] User not found, creating: ${userId}`);
            const response = await circleClient.post('/users', { userId });
            return response.data.data;
        }
        console.error(`[Circle] Error in getOrCreateCircleUser:`, error.response?.data || error.message);
        throw error;
    }
}

export async function createCircleSession(userId: string) {
    try {
        const response = await circleClient.post('/users/token', { userId });
        return {
            userToken: response.data.data.userToken,
            encryptionKey: response.data.data.encryptionKey
        };
    } catch (error: any) {
        throw error;
    }
}

export async function createCircleEmailSession(email: string, deviceId: string) {
    try {
        const response = await circleClient.post('/users/email/token', {
            email,
            deviceId,
            idempotencyKey: crypto.randomUUID()
        });
        return {
            deviceToken: response.data.data.deviceToken,
            deviceEncryptionKey: response.data.data.deviceEncryptionKey,
            otpToken: response.data.data.otpToken
        };
    } catch (error: any) {
        console.error('[Circle] Error in createCircleEmailSession:', error.response?.data || error.message);
        throw error;
    }
}


export async function initializeCircleWallet(userToken: string) {
    const response = await circleClient.post('/user/initialize', {
        idempotencyKey: crypto.randomUUID(),
        accountType: 'SCA',
        blockchains: ['MATIC-AMOY'],
    }, {
        headers: { 'X-User-Token': userToken }
    });
    return response.data.data.challengeId;
}

export async function getCircleWallet(userToken: string) {
    const response = await circleClient.get('/wallets', {
        headers: { 'X-User-Token': userToken }
    });
    // Return the first wallet found
    return response.data.data.wallets[0];
}

export async function createCircleContractCall(userToken: string, walletId: string, contractAddress: string, abiFunctionSignature: string, abiParameters: any[], amount?: string) {
    const payload: any = {
        idempotencyKey: crypto.randomUUID(),
        walletId,
        contractAddress,
        abiFunctionSignature,
        abiParameters,
        feeLevel: 'HIGH', // Fast execution
    };

    if (amount) {
        payload.amount = amount;
    }

    const response = await circleClient.post('/user/transactions/contractExecution', payload, {
        headers: { 'X-User-Token': userToken }
    });
    return response.data.data.challengeId;
}
// Note: Circle User-Controlled Wallets use MPC and do not support private key export
// The available security challenge is SET_SECURITY_QUESTIONS for account recovery

export async function createSecurityQuestionsChallenge(userToken: string) {
    const response = await circleClient.post('/user/securityQuestion', {
        idempotencyKey: crypto.randomUUID(),
    }, {
        headers: { 'X-User-Token': userToken }
    });
    return response.data.data.challengeId;
}
