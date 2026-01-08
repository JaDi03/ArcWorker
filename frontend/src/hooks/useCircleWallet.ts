import { useState, useCallback } from 'react';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import axios from 'axios';

// Move SDK instance to global scope to survive HMR/Re-renders during the flow
declare global {
    interface Window {
        __circle_sdk_instance?: W3SSdk;
    }
}

function getSdk() {
    if (typeof window === 'undefined') return null;

    if (!window.__circle_sdk_instance) {
        const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '';
        console.log("[Circle SDK] Creating persistent W3SSdk instance.");

        window.__circle_sdk_instance = new W3SSdk({
            appSettings: { appId }
        });
    }
    return window.__circle_sdk_instance;
}

export function useCircleWallet() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setupCircleWallet = useCallback(async (userId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const authResponse = await axios.post('/api/circle/auth', { userId });
            const { userToken, encryptionKey, appId, address: existingAddress } = authResponse.data;

            if (existingAddress) {
                return existingAddress;
            }

            const sdk = getSdk();
            if (!sdk) throw new Error("SDK not initialized");

            sdk.setAppSettings({ appId });
            sdk.setAuthentication({ userToken, encryptionKey });

            const walletResponse = await axios.post('/api/circle/wallet', { userToken });
            const { challengeId } = walletResponse.data;

            await new Promise((resolve, reject) => {
                sdk.execute(challengeId, (error: any, result: any) => {
                    if (error) {
                        const msg = error.message || error.code || JSON.stringify(error);
                        console.error('[Circle] SDK Execute Error:', msg);
                        setError(msg);
                        reject(error);
                    } else {
                        console.log('[Circle] SDK Execute Success:', result);
                        resolve(result);
                    }
                });
            });

            let finalAddress = null;
            let retries = 5;
            while (retries > 0 && !finalAddress) {
                const finalAuth = await axios.post('/api/circle/auth', { userId });
                finalAddress = finalAuth.data.address;
                if (!finalAddress) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    retries--;
                }
            }
            return finalAddress;
        } catch (err: any) {
            console.error('setupCircleWallet failed:', err);
            const detail = err.response?.data?.details?.message || err.message;
            setError(detail);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const setupCircleEmailWallet = useCallback(async (email: string) => {
        setIsLoading(true);
        setError(null);
        console.log("[Circle Email] Starting onboarding for:", email);

        try {
            const sdk = getSdk();
            if (!sdk) throw new Error("SDK not initialized");

            const deviceId = await sdk.getDeviceId();

            const authResponse = await axios.post('/api/circle/auth/email', { email, deviceId });
            const { deviceToken, deviceEncryptionKey, otpToken } = authResponse.data;
            const appId = authResponse.data.appId || process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '';

            const { userToken, sessionEncryptionKey } = await new Promise<{ userToken: string, sessionEncryptionKey: string }>((resolve, reject) => {
                const config = {
                    appSettings: { appId },
                    loginConfigs: {
                        deviceToken,
                        deviceEncryptionKey,
                        otpToken
                    }
                };

                (sdk as any).updateConfigs(config, (error: any, result: any) => {
                    if (error) {
                        const errorMsg = error.message || error.code || JSON.stringify(error);
                        console.error("[Circle Email] OTP Verification Error:", errorMsg);
                        reject(new Error(errorMsg));
                    } else if (result && result.userToken && result.encryptionKey) {
                        console.log("[Circle Email] OTP Verified Successfully");
                        resolve({
                            userToken: result.userToken,
                            sessionEncryptionKey: result.encryptionKey
                        });
                    } else {
                        reject(new Error("Verification succeeded but userToken or encryptionKey missing."));
                    }
                });

                try {
                    (sdk as any).verifyOtp();
                } catch (err: any) {
                    reject(err);
                }
            });

            // Set final session authentication
            sdk.setAppSettings({ appId });
            sdk.setAuthentication({
                userToken,
                encryptionKey: sessionEncryptionKey
            });

            const walletResponse = await axios.post('/api/circle/wallet', { userToken });
            const { challengeId, address: preFetchedAddress } = walletResponse.data;

            if (challengeId) {
                console.log("[Circle Email] Executing PIN setup...");
                await new Promise((resolve, reject) => {
                    sdk.execute(challengeId, (error: any, result: any) => {
                        if (error) {
                            const msg = error.message || error.code || JSON.stringify(error);
                            console.error("[Circle Email] PIN Setup Error:", msg);
                            reject(new Error(msg));
                        } else {
                            console.log("[Circle Email] PIN Setup Success");
                            resolve(result);
                        }
                    });
                });
            } else if (preFetchedAddress) {
                console.log("[Circle Email] Wallet already exists:", preFetchedAddress);
                return preFetchedAddress;
            }

            // Poll for final address using userToken
            let finalAddress = null;
            let retries = 15;

            console.log("[Circle Email] Retrieving wallet address...");
            await new Promise(resolve => setTimeout(resolve, 3000));

            while (retries > 0 && !finalAddress) {
                const addressResponse = await axios.post('/api/circle/wallet/address', { userToken });
                finalAddress = addressResponse.data.address;
                if (!finalAddress) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    retries--;
                }
            }

            console.log("[Circle Email] Flow Complete. Address:", finalAddress);
            return finalAddress || "PENDING_ADDRESS";

        } catch (err: any) {
            const detail = err.response?.data?.details?.message || err.message || JSON.stringify(err);
            console.error('[Circle Email] Flow Error:', detail);
            setError(detail);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        setupCircleWallet,
        setupCircleEmailWallet,
        isLoading,
        error
    };
}
