import { useState, useCallback, useEffect } from 'react';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import axios from 'axios';

// ArcWorker Wallet SDK
// Wrapper around Circle Programmable Wallets for the ArcWorker Protocol

// Move SDK instance and callback to global scope to survive HMR/Re-renders
declare global {
    interface Window {
        __circle_sdk_instance?: W3SSdk;
        __circle_sdk_callback?: (error: any, result: any) => void;
        __circle_pending_result?: { error: any, result: any };
        __circle_initial_hash?: string;
    }
}

// Storage keys for redirect persistence
const STORAGE_KEYS = {
    PENDING_LOGIN: 'arc_social_pending',
    USER_CONTEXT: 'arc_social_user_context',
    SESSION_DATA: 'arc_social_session_data'
};

function getSdk() {
    if (typeof window === 'undefined') return null;

    const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '';
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

    if (!window.__circle_sdk_instance) {
        const onLoginComplete = (error: any, result: any) => {
            if (error) {
                // Keep error logs but minimize them
                console.error("[ArcWorker SDK] Auth Error:", error.message || error);
            }

            // Store result in case no listener is ready yet
            window.__circle_pending_result = { error, result };

            if (window.__circle_sdk_callback) {
                window.__circle_sdk_callback(error, result);
            }
        };

        window.__circle_sdk_instance = new W3SSdk({
            appSettings: { appId }
        }, onLoginComplete);
    }

    // Ensure essential settings are updated
    window.__circle_sdk_instance.setAppSettings({ appId });

    return window.__circle_sdk_instance;
}

export function useArcWorkerWallet() {
    const [isLoading, setIsLoading] = useState(false);
    const [loginType, setLoginType] = useState<'email' | 'social' | 'custom' | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [preFetchedDeviceId, setPreFetchedDeviceId] = useState<string | null>(null);
    const [socialSessionData, setSocialSessionData] = useState<{ deviceToken: string, deviceEncryptionKey: string, provider: string } | null>(null);

    // Customize UI for a premium look
    const customizeSDKUI = useCallback((title?: string, subtitle?: string) => {
        const sdk = getSdk();
        if (!sdk) return;

        // Using vibrant premium colors: Deep purple/indigo with gradient-like tones
        // Note: SDK might only support one primary color via setThemeColor
        (sdk as any).setThemeColor?.('#6366f1'); // Indigo 500

        if (title) (sdk as any).setTitle?.(title);
        if (subtitle) (sdk as any).setSubtitle?.(subtitle);
    }, []);

    // Finalize onboarding after userToken is acquired (shared by auto and manual flows)
    const finishSocialOnboarding = useCallback(async (userToken: string, encryptionKey: string) => {
        const sdk = getSdk();
        if (!sdk) throw new Error("SDK not initialized");

        try {
            console.log("[ArcWorker SDK] Finalizing Session...");

            // 1. Authenticate SDK
            sdk.setAuthentication({ userToken, encryptionKey });

            // 2. Initialize wallet or get existing
            const { data } = await axios.post('/api/circle/wallet', { userToken });
            const { challengeId, address: preFetchedAddress, userId: canonicalId } = data;

            if (challengeId) {
                console.log("[ArcWorker SDK] Executing PIN/Security Challenge...");
                await new Promise((resolve, reject) => {
                    sdk.execute(challengeId, (error: any, result: any) => {
                        if (error) reject(new Error(error.message || "Challenge failed"));
                        else resolve(result);
                    });
                });
            }

            // 3. Poll for address if needed
            let address = preFetchedAddress;
            let finalUserId = canonicalId;
            if (!address) {
                console.log("[ArcWorker SDK] Polling for wallet address...");
                let retries = 10;
                while (retries > 0 && !address) {
                    await new Promise(r => setTimeout(r, 2000));
                    const res = await axios.post('/api/circle/wallet/address', { userToken });
                    address = res.data.address;
                    if (res.data.userId) finalUserId = res.data.userId;
                    retries--;
                }
            }

            // 4. Finalize
            if (!address) throw new Error("Wallet creation timeout");

            localStorage.setItem('arc_session_token', userToken);
            localStorage.setItem('arc_encryption_key', encryptionKey);
            if (finalUserId) {
                localStorage.setItem('arc_circle_user_id', finalUserId);

                // Update the main arc_user object to use the canonical identity
                const existingUserStr = localStorage.getItem('arc_user');
                if (existingUserStr) {
                    try {
                        const user = JSON.parse(existingUserStr);
                        user.userId = finalUserId; // Association
                        localStorage.setItem('arc_user', JSON.stringify(user));
                    } catch (e) { }
                }
            }

            return { address, userToken, userId: finalUserId };
        } catch (err: any) {
            console.error("[ArcWorker SDK] Finalization failed:", err);
            throw err;
        }
    }, []);

    // This method MUST be called directly from a button click (User Gesture)
    const executePerformLogin = useCallback(async () => {
        if (!socialSessionData) {
            console.error("[ArcWorker SDK] Cannot execute: No social session data");
            return;
        }
        const sdk = getSdk();
        if (!sdk) throw new Error("SDK not initialized");

        const { deviceToken, deviceEncryptionKey, provider } = socialSessionData;
        const redirectedURI = typeof window !== 'undefined' ? window.location.origin : '';

        console.log(`[ArcWorker SDK] >>> EXECUTING performLogin for ${provider}...`);
        setStatusMessage('Opening secure login window...');
        setIsLoading(true);

        // SAVE STATE BEFORE REDIRECT (SDK v1.1.11 uses window.location.href for Google/FB)
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.PENDING_LOGIN, 'true');
            localStorage.setItem(STORAGE_KEYS.SESSION_DATA, JSON.stringify(socialSessionData));
            // We can't save everything here if it's called from Modal, 
            // the Modal should have saved registration context separately if needed.
            // But we save the core login objective.
        }

        try {
            const { userToken, encryptionKey } = await new Promise<{ userToken: string, encryptionKey: string }>((resolve, reject) => {
                const circleSdk = sdk as any;
                const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '';

                // Set app settings and login configs again for this specific run
                const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
                const config = {
                    appSettings: { appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '' },
                    loginConfigs: {
                        deviceToken,
                        deviceEncryptionKey,
                        google: {
                            clientId: googleClientId,
                            redirectUri: redirectedURI
                        }
                    }
                };

                console.log("[ArcWorker SDK] DEBUG: Updating SDK configs before performLogin...");
                (circleSdk as any).updateConfigs(config);

                // Register global callback for this promise
                window.__circle_sdk_callback = (error: any, result: any) => {
                    callbackCalled = true;
                    clearTimeout(watchdog);
                    window.removeEventListener('error', globalErrorHandler);
                    console.log("[ArcWorker SDK] DEBUG: Received result via Global Callback", { error, result });

                    if (error) {
                        const errorMsg = error.message || error.code || JSON.stringify(error);
                        reject(new Error(errorMsg));
                    } else if (result && result.userToken && result.encryptionKey) {
                        resolve({
                            userToken: result.userToken,
                            encryptionKey: result.encryptionKey
                        });
                    } else {
                        reject(new Error("Tokens missing in login result"));
                    }
                };

                const performParams = {
                    deviceToken,
                    deviceEncryptionKey,
                    provider: provider.toLowerCase(),
                    redirectUrl: redirectedURI
                };

                // Capitalize provider for SDK (Google, Apple, Facebook)
                const capitalizedProvider = provider.charAt(0).toUpperCase() + provider.slice(1);

                console.log("[ArcWorker SDK] DEBUG: Invoking performLogin with params:", JSON.stringify(performParams, null, 2));

                const globalErrorHandler = (event: ErrorEvent) => {
                    console.error("[ArcWorker SDK] DETECTED GLOBAL ERROR during login phase:", event.error);
                };
                window.addEventListener('error', globalErrorHandler);
                window.addEventListener('unhandledrejection', (event) => {
                    console.error("[ArcWorker SDK] DETECTED UNHANDLED REJECTION during login phase:", event.reason);
                });

                let callbackCalled = false;
                const watchdog = setTimeout(() => {
                    if (!callbackCalled) {
                        console.error("[ArcWorker SDK] WATCHDOG: performLogin callback NOT CALLED after 15s.");
                        setStatusMessage("⚠️ AUTH HANGED (Check Console & AdBlock) ⚠️");
                        window.removeEventListener('error', globalErrorHandler);
                        reject(new Error("SDK_CALLBACK_TIMEOUT"));
                    }
                }, 15000);

                try {
                    // CRITICAL FIX: The Web SDK performLogin takes ONLY a string (the provider name).
                    // Session tokens must be set via updateConfigs (done above).
                    console.log(`[ArcWorker SDK] Calling circleSdk.performLogin("${capitalizedProvider}")`);

                    // We call it without a callback here because we are using the global one 
                    // and this version returns a Promise<void> or void.
                    const result = (circleSdk as any).performLogin(capitalizedProvider);

                    if (result instanceof Promise) {
                        result.catch((pwErr: any) => {
                            console.error("[ArcWorker SDK] Promise error from performLogin:", pwErr);
                            if (!callbackCalled && window.__circle_sdk_callback) {
                                window.__circle_sdk_callback(pwErr, null);
                            }
                        });
                    }

                    // circleSdk.performLogin call successfully initiated.
                } catch (syncErr: any) {
                    callbackCalled = true;
                    clearTimeout(watchdog);
                    window.removeEventListener('error', globalErrorHandler);
                    console.error("[ArcWorker SDK] DEBUG: Sync error during performLogin invocation:", syncErr);
                    reject(syncErr);
                }
            });

            // Finish the onboarding flow
            return await finishSocialOnboarding(userToken, encryptionKey);
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
            throw err;
        }
    }, [socialSessionData, finishSocialOnboarding]);

    // STEP 1 & 2: Prepare session (doesn't trigger popup)
    const prepareSocialLogin = useCallback(async (provider: 'google' | 'apple' | 'facebook', userId?: string) => {
        setIsLoading(true);
        setLoginType('social');
        setStatusMessage(`Preparing secure link for ${provider}...`);
        setError(null);

        try {
            const sdk = getSdk();
            if (!sdk) throw new Error("SDK not initialized");

            // 1. Get Device ID
            let deviceId = preFetchedDeviceId;
            if (!deviceId) {
                deviceId = await sdk.getDeviceId();
            }
            // Device ID ready.

            // 2. Get device tokens from backend
            const authResponse = await axios.post('/api/circle/auth/social',
                { provider, userId, deviceId },
                { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
            );
            // Backend Session Data ready.
            const { deviceToken, deviceEncryptionKey } = authResponse.data;

            // Persist for the manual click
            setSocialSessionData({ deviceToken, deviceEncryptionKey, provider });
            setStatusMessage('READY_TO_CLICK');

            return true;
        } catch (err: any) {
            const detail = err.response?.data?.details?.message || err.message || JSON.stringify(err);
            console.error('[ArcWorker SDK] Preparation Error:', detail);
            setError(detail);
            setIsLoading(false);
            throw err;
        }
    }, [preFetchedDeviceId]);

    // Pre-fetch Device ID once on mount to save time during the click-to-login flow
    // This helps preserve the "user gesture" context required for popups
    const preFetch = useCallback(async () => {
        try {
            const sdk = getSdk();
            if (sdk) {
                const dId = await sdk.getDeviceId();
                setPreFetchedDeviceId(dId);
            }
        } catch (e) { }
    }, [preFetchedDeviceId]);

    // Initial pre-fetch side effect
    useEffect(() => {
        if (typeof window !== 'undefined' && !preFetchedDeviceId && !isLoading) {
            preFetch();
        }
    }, [preFetch, preFetchedDeviceId, isLoading]);

    /**
     * NEW: Email-Based OTP Flow (User-Controlled)
     * 1. Get Device tokens from backend
     * 2. Trigger SDK OTP prompt
     * 3. Initialize/Restore wallet
     */
    const setupCircleOtpWallet = useCallback(async (email: string) => {
        setIsLoading(true);
        setLoginType('email');
        setStatusMessage('Requesting verification code...');
        setError(null);
        console.log("[ArcWorker SDK] Starting OTP onboarding for:", email);

        try {
            const sdk = getSdk();
            if (!sdk) throw new Error("SDK not initialized");

            // 1. Get Device ID
            let deviceId = preFetchedDeviceId;
            if (!deviceId) {
                deviceId = await sdk.getDeviceId();
            }

            // 2. Request device tokens from backend
            const authResponse = await axios.post('/api/circle/auth/email', { email, deviceId });
            const { deviceToken, deviceEncryptionKey, otpToken } = authResponse.data;
            const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '';

            // 3. Configure SDK for this session
            sdk.setAppSettings({ appId });

            // 4. Trigger OTP Prompt
            setStatusMessage('Please enter the code sent to your email');
            const { userToken, encryptionKey } = await new Promise<{ userToken: string, encryptionKey: string }>((resolve, reject) => {
                const circleSdk = sdk as any;

                // Set login configs (Device tokens are required for OTP flow)
                // Listen for result via updateConfigs callback (per useCircleWallet.ts pattern)
                (circleSdk as any).updateConfigs({
                    appSettings: { appId },
                    loginConfigs: {
                        deviceToken,
                        deviceEncryptionKey,
                        otpToken
                    }
                }, (error: any, result: any) => {
                    if (error) {
                        reject(new Error(error.message || "OTP verification failed"));
                    } else if (result && result.userToken) {
                        resolve({
                            userToken: result.userToken,
                            encryptionKey: result.encryptionKey
                        });
                    } else {
                        // Fallback: Check if global callback was used instead
                        const pending = window.__circle_pending_result;
                        if (pending && pending.result?.userToken) {
                            resolve({
                                userToken: pending.result.userToken,
                                encryptionKey: pending.result.encryptionKey
                            });
                        } else {
                            reject(new Error("Missing tokens in verification result"));
                        }
                    }
                });

                // Trigger the native OTP UI
                try {
                    (circleSdk as any).verifyOtp();
                } catch (vErr: any) {
                    console.error("[ArcWorker SDK] verifyOtp sync error:", vErr);
                    reject(vErr);
                }
            });

            // 5. Finalize onboarding (Initialize wallet if new, or link session)
            setStatusMessage('Verifying credentials...');
            console.log("[ArcWorker SDK] Finalizing onboarding with finishSocialOnboarding...");
            const result = await finishSocialOnboarding(userToken, encryptionKey);
            console.log("[ArcWorker SDK] Onboarding complete. Result:", result);
            return result;

        } catch (err: any) {
            const detail = err.response?.data?.details?.message || err.message || JSON.stringify(err);
            console.error('[ArcWorker SDK] OTP Flow Error:', detail);
            setError(detail);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [preFetchedDeviceId, finishSocialOnboarding]);

    // Main ArcWorker Flow: Email-Based ID + Forced PIN (Custom Auth)
    const setupArcWorkerWallet = useCallback(async (email: string, role?: string, walletType?: string, options?: { skipCreation?: boolean, challengeId?: string, userToken?: string, encryptionKey?: string }) => {
        setIsLoading(true);
        setLoginType('custom'); // Switched to custom to force PIN
        setStatusMessage('Initializing Secure Environment...');
        setError(null);
        console.log("[ArcWorker SDK] Starting onboarding for:", email);

        try {
            const sdk = getSdk();
            if (!sdk) throw new Error("SDK not initialized");

            if (options?.challengeId && (options?.userToken || localStorage.getItem('arc_session_token'))) {
                const finalToken = options?.userToken || localStorage.getItem('arc_session_token');
                const finalKey = options?.encryptionKey || localStorage.getItem('arc_encryption_key');

                // SPECIAL FLOW: EXECUTE SPECIFIC CHALLENGE (e.g., Recovery, Contract Execution)
                customizeSDKUI("Security Check", "Please verify your PIN");
                sdk.setAppSettings({ appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '' });
                sdk.setAuthentication({
                    userToken: finalToken || '',
                    encryptionKey: finalKey || ''
                });

                await new Promise((resolve, reject) => {
                    sdk.execute(options.challengeId!, (error: any, result: any) => {
                        if (error) reject(error);
                        else resolve(result);
                    });
                });
                // After executing challenge, try to return current state
                return {
                    address: localStorage.getItem('arc_wallet_address') || '',
                    userToken: finalToken,
                    userId: localStorage.getItem('arc_circle_user_id') || email
                };
            }

            customizeSDKUI("Setup Pin", "Create your 6-digit security PIN");

            // 1. Get Session from Custom Auth Route (Using Email as ID)
            // This bypasses Circle's email OTP and treats the email as a unique User ID
            setStatusMessage('Verifying Identity...');
            const authResponse = await axios.post('/api/circle/auth/custom', { userId: email });
            const { userToken, encryptionKey, userId: bridgedId } = authResponse.data;
            const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '';

            // 2. Update local state if ID was bridged
            if (bridgedId && bridgedId !== email) {
                console.log(`[ArcWorker SDK] Identity bridged: ${email} -> ${bridgedId}`);
                const savedUser = localStorage.getItem('arc_user');
                if (savedUser) {
                    try {
                        const user = JSON.parse(savedUser);
                        user.id = bridgedId;
                        user.userId = bridgedId; // Sync both for safety
                        localStorage.setItem('arc_user', JSON.stringify(user));
                    } catch (e) { }
                }
            }

            // 3. Authenticate SDK
            sdk.setAppSettings({ appId });
            sdk.setAuthentication({ userToken, encryptionKey });

            // 4. Create Wallet (Get Challenge)
            setStatusMessage('Preparing PIN Pad...');
            const walletResponse = await axios.post('/api/circle/wallet', { userToken });
            const { challengeId, address: preFetchedAddress } = walletResponse.data;

            // Persist tokens for session reuse early
            localStorage.setItem('arc_session_token', userToken);
            localStorage.setItem('arc_encryption_key', encryptionKey);

            if (challengeId) {
                console.log("[ArcWorker SDK] Executing PIN setup (Challenge)...");

                // 1. EXECUTE PIN SETUP
                await new Promise((resolve, reject) => {
                    sdk.execute(challengeId, (error: any, result: any) => {
                        if (error) {
                            const msg = error.message || error.code || JSON.stringify(error);
                            console.error("[ArcWorker SDK] PIN Setup Error:", msg);
                            reject(new Error(msg));
                        } else {
                            console.log("[ArcWorker SDK] PIN Setup Success");
                            resolve(result);
                        }
                    });
                });

                // 2. CHAIN: EXECUTE SECURITY QUESTIONS (Sequential)
                try {
                    console.log("[ArcWorker SDK] Initiating Security Questions Setup...");
                    setStatusMessage('Setting up Recovery Options...');

                    // Small delay to ensure SDK UI resets
                    await new Promise(r => setTimeout(r, 500));

                    customizeSDKUI("Recovery Setup", "Select questions to recover your wallet");

                    const qRes = await axios.post('/api/circle/questions', { userToken });
                    const qChallenge = qRes.data.challengeId;

                    if (qChallenge) {
                        console.log("[ArcWorker SDK] Executing Security Questions connection...");
                        await new Promise((resolve, reject) => {
                            sdk.execute(qChallenge, (qErr: any, qResult: any) => {
                                if (qErr) {
                                    console.warn("Security Questions Setup Failed (Non-critical):", qErr);
                                    // Don't reject, allowed to proceed
                                    resolve(null);
                                } else {
                                    console.log("Security Questions Setup Success");
                                    resolve(qResult);
                                }
                            });
                        });
                    }
                } catch (qEx) {
                    console.warn("Failed to initiate questions setup:", qEx);
                    // Continue flow
                }
            } else if (preFetchedAddress) {
                console.log("[ArcWorker SDK] Wallet already exists:", preFetchedAddress);
                return { address: preFetchedAddress, userToken, userId: bridgedId || email };
            }

            // 4. Poll for Address
            let finalAddress = null;
            let retries = 15;
            console.log("[ArcWorker SDK] Finalizing wallet...");
            await new Promise(resolve => setTimeout(resolve, 3000));

            while (retries > 0 && !finalAddress) {
                const addressResponse = await axios.post('/api/circle/wallet/address', { userToken });
                finalAddress = addressResponse.data.address;
                if (!finalAddress) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    retries--;
                }
            }

            console.log("[ArcWorker SDK] PIN Flow Complete. Address:", finalAddress);

            return { address: finalAddress || "PENDING_ADDRESS", userToken, userId: bridgedId || email };

        } catch (err: any) {
            const detail = err.response?.data?.details?.message || err.message || JSON.stringify(err);
            console.error('[ArcWorker SDK] Flow Error:', detail);
            setError(detail);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [customizeSDKUI]);

    // Secondary ArcWorker Flow: PIN Only (Custom Auth)
    const setupPinOnlyWallet = useCallback(async (userId: string) => {
        setIsLoading(true);
        setLoginType('custom');
        setStatusMessage('Initializing Secure Environment...');
        setError(null);
        console.log("[ArcWorker SDK] Starting PIN-Only onboarding for:", userId);

        try {
            const sdk = getSdk();
            if (!sdk) throw new Error("SDK not initialized");

            customizeSDKUI("Create PIN", "Set your 6-digit security code");

            // 1. Get Session from Custom Auth Route (No OTP)
            setStatusMessage('Verifying Identity...');
            const authResponse = await axios.post('/api/circle/auth/custom', { userId });
            const { userToken, encryptionKey } = authResponse.data;
            const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '';

            // 2. Authenticate SDK
            sdk.setAppSettings({ appId });
            sdk.setAuthentication({ userToken, encryptionKey });

            // 3. Create Wallet (Get Challenge)
            setStatusMessage('Preparing PIN Pad...');
            const walletResponse = await axios.post('/api/circle/wallet', { userToken });
            const { challengeId, address: preFetchedAddress } = walletResponse.data;

            if (challengeId) {
                console.log("[ArcWorker SDK] Executing PIN setup (Challenge)...");
                await new Promise((resolve, reject) => {
                    sdk.execute(challengeId, (error: any, result: any) => {
                        if (error) {
                            const msg = error.message || error.code || JSON.stringify(error);
                            console.error("[ArcWorker SDK] PIN Setup Error:", msg);
                            reject(new Error(msg));
                        } else {
                            console.log("[ArcWorker SDK] PIN Setup Success");
                            resolve(result);
                        }
                    });
                });
            } else if (preFetchedAddress) {
                console.log("[ArcWorker SDK] Wallet already exists:", preFetchedAddress);
                return preFetchedAddress;
            }

            // 4. Poll for Address
            let finalAddress = null;
            let retries = 15;
            console.log("[ArcWorker SDK] Finalizing wallet...");
            await new Promise(resolve => setTimeout(resolve, 3000));

            while (retries > 0 && !finalAddress) {
                const addressResponse = await axios.post('/api/circle/wallet/address', { userToken });
                finalAddress = addressResponse.data.address;
                if (!finalAddress) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    retries--;
                }
            }

            console.log("[ArcWorker SDK] PIN Flow Complete. Address:", finalAddress);

            // Persist tokens for session reuse
            localStorage.setItem('arc_session_token', userToken);
            localStorage.setItem('arc_encryption_key', encryptionKey);

            return { address: finalAddress || "PENDING_ADDRESS", userToken, userId };

        } catch (err: any) {
            const detail = err.response?.data?.details?.message || err.message || JSON.stringify(err);
            console.error('[ArcWorker SDK] PIN Flow Error:', detail);
            setError(detail);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [customizeSDKUI]);

    // Auto-resume logic for redirect-based social login
    const autoResumeSocialLogin = useCallback(async (onComplete?: (address: string, provider: string) => void) => {
        if (typeof window === 'undefined') return;

        const isPending = localStorage.getItem(STORAGE_KEYS.PENDING_LOGIN);
        // Use current hash OR the one we captured early
        const currentHash = window.location.hash;
        const savedHash = window.__circle_initial_hash || '';

        // We consider "hasHash" true if EITHER contains 'token' or 'id_token'
        const hasHash = (currentHash && currentHash.includes('token')) || (savedHash && savedHash.includes('token'));

        if (!isPending && !hasHash) return;

        console.log("[ArcWorker SDK] >>> DETECTED REDIRECT RETURN. Resuming social login...");
        setIsLoading(true);
        setStatusMessage('Resuming your social login session...');

        try {
            const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION_DATA);
            if (!savedSession) throw new Error("Missing session data for resurrection");

            const session = JSON.parse(savedSession);
            const sdk = getSdk(); // This might have already initialized SDK and captured pending result
            if (!sdk) throw new Error("SDK failed to initialize on resume");

            // CHECK FOR PENDING RESULT
            const pending = window.__circle_pending_result;
            if (pending) {
                console.log("[ArcWorker SDK] Found pending global result. Using it.", pending);

                // ERROR HANDLING & FALLBACK:
                if (pending.error) {
                    // Only attempt manual if we actually saw a hash
                    if (hasHash) {
                        console.warn("[ArcWorker SDK] SDK validation failed. Attempting manual token extraction...");
                        try {
                            // Prefer saved hash as it's more likely to be intact
                            const targetHash = (savedHash && savedHash.includes('token')) ? savedHash : currentHash;
                            const cleanHash = targetHash.startsWith('#') ? targetHash.substring(1) : targetHash;

                            const hashParams = new URLSearchParams(cleanHash);
                            const idToken = hashParams.get('id_token'); // Google returns id_token

                            if (idToken) {
                                console.log("[ArcWorker SDK] Manual extraction successful!");
                                // We rely on the stored encryption key since the SDK failed
                                if (session.deviceEncryptionKey) {
                                    const result = await finishSocialOnboarding(idToken, session.deviceEncryptionKey);
                                    localStorage.removeItem(STORAGE_KEYS.PENDING_LOGIN);
                                    localStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
                                    if (result.address && onComplete) onComplete(result.address, session.provider);
                                    return result.address;
                                } else {
                                    console.warn("[ArcWorker SDK] Manual extraction skipped: Missing deviceEncryptionKey.");
                                }
                            } else {
                                console.warn("[ArcWorker SDK] Manual extraction skipped: No id_token found in hash.");
                            }
                        } catch (manualErr) {
                            console.error("[ArcWorker SDK] Manual extraction failed:", manualErr);
                        }
                    }

                    // If manual failed or wasn't applicable, throw original error
                    throw pending.error;
                }

                if (pending.error) throw pending.error;

                if (pending.result && pending.result.userToken && pending.result.encryptionKey) {
                    // Clear pending so we don't use it twice
                    window.__circle_pending_result = undefined;

                    const result = await finishSocialOnboarding(pending.result.userToken, pending.result.encryptionKey);
                    localStorage.removeItem(STORAGE_KEYS.PENDING_LOGIN);
                    localStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
                    if (result.address && onComplete) onComplete(result.address, session.provider);
                    return result.address;
                }
            }

            // Fallback: If no pending result yet (maybe it's slow?), we wait.
            const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
            if (!window.__circle_sdk_instance) {
                // CAPTURE HASH EARLY (Before SDK or Router clears it)
                if (typeof window !== 'undefined') {
                    window.__circle_initial_hash = window.location.hash;
                    console.log("[ArcWorker SDK] Captured initial hash:", window.__circle_initial_hash);
                }
                // Fallback strategy if no pending results
                const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
                const config = {
                    appSettings: { appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '' },
                    loginConfigs: {
                        deviceToken: session.deviceToken,
                        deviceEncryptionKey: session.deviceEncryptionKey,
                        google: {
                            clientId: googleClientId,
                            redirectUri: window.location.origin
                        }
                    }
                };

                const result: any = await new Promise((resolve, reject) => {
                    window.__circle_sdk_callback = (err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    };

                    (sdk as any).updateConfigs(config);
                    setTimeout(() => reject(new Error("Social resume timeout")), 10000);
                });

                if (result && result.userToken && result.encryptionKey) {
                    const onboardingResult = await finishSocialOnboarding(result.userToken, result.encryptionKey);

                    // Success! Clean up storage
                    localStorage.removeItem(STORAGE_KEYS.PENDING_LOGIN);
                    localStorage.removeItem(STORAGE_KEYS.SESSION_DATA);

                    if (onboardingResult.address && onComplete) {
                        onComplete(onboardingResult.address, session.provider);
                    }
                    return onboardingResult.address;
                }

            }
        } catch (err: any) {
            console.warn("[ArcWorker SDK] Resurrection failed or cancelled:", err.message);
            localStorage.removeItem(STORAGE_KEYS.PENDING_LOGIN);
            localStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [finishSocialOnboarding]);

    // --- Transaction & Balance Methods ---

    const getBalance = useCallback(async () => {
        const userToken = localStorage.getItem('arc_session_token');
        if (!userToken) return null;

        try {
            const response = await axios.post('/api/circle/wallet/balance', { userToken });
            return response.data;
        } catch (err: any) {
            const errorData = err.response?.data?.details || err.response?.data;
            if (errorData?.code === 155104 || errorData?.message?.includes('expired')) {
                console.warn("[ArcWorker SDK] Session expired detected in getBalance");
                throw new Error("SESSION_EXPIRED");
            }
            console.error("[ArcWorker SDK] Error fetching balance:", err);
            return null;
        }
    }, []);

    const sendTransfer = useCallback(async (toAddress: string, amount: string, token: string = 'ETH', memo?: string) => {
        const userToken = localStorage.getItem('arc_session_token');
        const encryptionKey = localStorage.getItem('arc_encryption_key');
        const sdk = getSdk();

        if (!userToken || !encryptionKey || !sdk) {
            throw new Error("Session not active or SDK not ready");
        }

        setIsLoading(true);
        setStatusMessage('Initiating transfer...');

        try {
            // 1. Request Challenge from backend
            const response = await axios.post('/api/circle/transfer', {
                userToken,
                toAddress,
                amount,
                token,
                memo
            });

            const { challengeId } = response.data;

            if (!challengeId) throw new Error("No challenge received from backend");

            // 2. Execute Challenge via SDK (PIN prompt)
            sdk.setAuthentication({ userToken, encryptionKey });

            return await new Promise((resolve, reject) => {
                sdk.execute(challengeId, (error: any, result: any) => {
                    if (error) {
                        const msg = error.message || error.code || JSON.stringify(error);
                        console.error("[ArcWorker SDK] Transfer Challenge Error:", msg);
                        reject(new Error(msg));
                    } else {
                        console.log("[ArcWorker SDK] Transfer Challenge Success:", result);
                        resolve(result);
                    }
                });
            });

        } catch (err: any) {
            const errorResponse = err.response?.data;
            const msg = errorResponse?.details?.message || errorResponse?.details?.error?.message || errorResponse?.error || err.message;
            setError(msg);
            throw err;
        } finally {
            setIsLoading(false);
            setStatusMessage('');
        }
    }, []);

    const restoreWalletAccess = useCallback(async () => {
        const userToken = localStorage.getItem('arc_session_token');
        const encryptionKey = localStorage.getItem('arc_encryption_key');
        const sdk = getSdk();

        if (!userToken || !encryptionKey || !sdk) {
            throw new Error("Session not active");
        }

        setIsLoading(true);
        setStatusMessage('Initiating Recovery...');

        try {
            customizeSDKUI("Recover Wallet", "Answer your security questions");

            // 1. Request Restore Challenge
            const response = await axios.post('/api/circle/restore', { userToken });
            const { challengeId } = response.data;

            if (!challengeId) throw new Error("No restore challenge received");

            // 2. Execute
            sdk.setAuthentication({ userToken, encryptionKey });

            await new Promise((resolve, reject) => {
                sdk.execute(challengeId, (error: any, result: any) => {
                    if (error) {
                        const msg = error.message || error.code || JSON.stringify(error);
                        reject(new Error(msg));
                    } else {
                        console.log("Restore Success");
                        resolve(result);
                    }
                });
            });

            setStatusMessage("Wallet Recovered!");
            setTimeout(() => setStatusMessage(''), 3000);

        } catch (err: any) {
            const errorData = err.response?.data;
            // Surface specific Circle API details if available
            const detailedMsg = errorData?.details?.message || errorData?.details?.error?.message;
            const msg = detailedMsg || errorData?.error || err.message;

            console.error("[Start Restore Failed]", errorData);
            setError(msg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [customizeSDKUI]);

    const executeChallenge = useCallback(async (challengeId: string, userToken: string, encryptionKey: string) => {
        const sdk = getSdk();
        if (!sdk) throw new Error("SDK not initialized");

        setIsLoading(true);
        setStatusMessage('Executing security challenge...');

        try {
            sdk.setAuthentication({ userToken, encryptionKey });

            return await new Promise((resolve, reject) => {
                sdk.execute(challengeId, (error: any, result: any) => {
                    if (error) {
                        const msg = error.message || String(error.code) || JSON.stringify(error);
                        console.error("[ArcWorker SDK] Challenge Failed:", msg, error);
                        reject(new Error(msg));
                    } else {
                        console.log("[ArcWorker SDK] Challenge Success:", result);
                        resolve(result);
                    }
                });
            });
        } finally {
            setIsLoading(false);
            setStatusMessage('');
        }
    }, []);

    return {
        setupArcWorkerWallet,
        setupCircleOtpWallet,
        setupPinOnlyWallet,
        restoreWalletAccess,

        prepareSocialLogin,
        executePerformLogin,
        autoResumeSocialLogin,
        socialSessionData,

        getBalance,
        sendTransfer,
        executeChallenge, // New method

        appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID, // Expose appId
        isLoading,
        loginType,
        statusMessage,
        error
    };
}
