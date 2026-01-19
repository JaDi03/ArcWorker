'use client';

import React, { useState, useEffect } from 'react';
import { useArcWorkerWallet } from '@/arcworker-sdk/wallet';
import { AuthModule } from '@/arcworker-sdk/auth';
import { useConnect, useAccount } from 'wagmi';
import axios from 'axios';
import { OnboardingLayout, MinimalInput, PrimaryButton } from './ui/OnboardingLayout';
import { MetamaskLogo } from './ui/BrandAssets';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi } from 'viem';
import { CONTRACTS } from '@/utils/contracts';

interface UserSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: { name: string; role: 'worker' | 'agency' | 'developer'; walletType: 'metamask' | 'circle'; address?: string }) => void;
    initialMode?: 'register' | 'login';
    preselectedRole?: 'worker' | 'agency' | 'developer';
}

export function UserSetupModalV2({ isOpen, onClose, onComplete, initialMode = 'register', preselectedRole }: UserSetupModalProps) {
    // STATE: FLOW & MODE MANAGEMENT
    const [mode, setMode] = useState<'register' | 'login' | 'recovery'>(initialMode);
    const [role, setRole] = useState<'worker' | 'agency' | 'developer'>('worker');

    // Track modal initialization to prevent resets on re-render
    const [lastOpened, setLastOpened] = useState(false);

    // Effect to update mode when modal opens
    useEffect(() => {
        if (isOpen && !lastOpened) {
            setMode(initialMode);
            if (preselectedRole) {
                setRole(preselectedRole);
            }
            // Reset errors/steps on open
            setAuthError(null);
            setCurrentStep('wallet');
            setLastOpened(true);
        } else if (!isOpen && lastOpened) {
            setLastOpened(false);
            setAuthError(null);
            setDetectedRole(null);
        }
    }, [isOpen, initialMode, preselectedRole, lastOpened]);

    const [currentStep, setCurrentStep] = useState<'wallet' | 'profile'>('wallet');

    // STATE: WALLET DATA
    const [capturedAddress, setCapturedAddress] = useState<string | null>(null);
    const [capturedWalletType, setCapturedWalletType] = useState<'circle' | 'metamask'>('circle');
    const [capturedUserToken, setCapturedUserToken] = useState<string | null>(null);
    const [capturedUserId, setCapturedUserId] = useState<string | null>(null);

    // STATE: FORM DATA
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // STATE: UI FEEDBACK
    const [authError, setAuthError] = useState<string | null>(null);
    const [detectedRole, setDetectedRole] = useState<'worker' | 'agency' | 'developer' | null>(null);
    const [isCheckingUser, setIsCheckingUser] = useState(false);

    // WEB3 HOOKS
    const { connectors, connect } = useConnect();
    const { isConnected, address: wagmiAddress } = useAccount();

    const {
        setupArcWorkerWallet,
        setupCircleOtpWallet,
        isLoading: isCircleLoading,
        statusMessage: circleStatus,
        error: circleError,
    } = useArcWorkerWallet();

    // ON-CHAIN REGISTRATION
    const { writeContract: writeUserRegistry, data: regHash } = useWriteContract();
    const { isLoading: isRegisteringOnChain, isSuccess: isRegSuccess } = useWaitForTransactionReceipt({ hash: regHash });

    const [isOnChainRegistering, setIsOnChainRegistering] = useState(false);


    // ----------------------------------------------------------------------
    // REGISTER FLOW: STEP 1 (WALLET)
    // ----------------------------------------------------------------------

    const checkUserExists = async (identifier: string) => {
        if (!identifier) return { exists: false, role: null };
        try {
            setIsCheckingUser(true);
            const { data } = await axios.post('/api/auth/check', { email: identifier });
            setDetectedRole(data.role);
            setIsCheckingUser(false);
            return data;
        } catch (err: any) {
            setIsCheckingUser(false);
            return { exists: false, role: null };
        }
    };

    const handleUsernameBlur = async () => {
        if (!username) return;
        const result = await checkUserExists(username);

        if (mode === 'register' && result.exists) {
            setAuthError("Username already exists. Login instead?");
            setTimeout(() => {
                setMode('login');
            }, 1500);
        }
    };

    const handleCircleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        if (!email) {
            setAuthError("Please enter your email address.");
            return;
        }

        const result = await checkUserExists(email);
        if (result.exists) {
            const dr = result.role;
            if (dr && dr !== role) {
                setAuthError(`This email is already registered as an ${dr.toUpperCase()}. Please switch to the correct portal.`);
            } else {
                setAuthError("This email is already registered. Please log in.");
            }
            setTimeout(() => {
                setMode('login');
            }, 2000);
            return;
        }

        try {
            let result;
            if (role === 'agency' || role === 'developer' || !role) {
                console.log("[UserSetup] Registering as Agency/Auth (Forcing PIN)...");
                result = await setupArcWorkerWallet(email, role || 'agency');
            } else {
                console.log("[UserSetup] Registering as Worker (Email/OTP)...");
                result = await setupCircleOtpWallet(email);
            }

            if (result && result.address) {
                setCapturedAddress(result.address);
                setCapturedUserToken(result.userToken);
                setCapturedUserId(result.userId);
                setCapturedWalletType('circle');
                setCurrentStep('profile');
            } else {
                setAuthError("Email verified, but wallet is still initializing. Please wait and try again or contact support.");
            }
        } catch (err: any) {
            console.error("Circle Registration Failed:", err);
            setAuthError(err.message || "Identity verification failed. Try again.");
        }
    };

    const handleMetamaskLogin = () => {
        AuthModule.clearAllSessions();
        setAuthError(null);
        const injectedConnector = connectors.find(c => c.id === 'injected');
        if (injectedConnector) {
            connect({ connector: injectedConnector });
        } else {
            setAuthError("MetaMask not found. Please install the extension.");
        }
    };

    useEffect(() => {
        if (isConnected && wagmiAddress) {
            setCapturedAddress(wagmiAddress);
            setCapturedWalletType('metamask');
            setCurrentStep('profile');
        }
    }, [isConnected, wagmiAddress]);


    // ----------------------------------------------------------------------
    // REGISTER FLOW: STEP 2 (PROFILE)
    // ----------------------------------------------------------------------

    const handleFinalizeProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password || !role || !capturedAddress) return;

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        try {
            const finalEmail = email || `${username}@arcworker.user`;
            await axios.post('/api/auth/register', {
                username,
                password,
                email: finalEmail,
                walletAddress: capturedAddress,
                role,
                walletType: capturedWalletType,
                userId: capturedUserId
            });

            const userData = {
                name: username,
                username,
                role,
                walletType: capturedWalletType,
                address: capturedAddress,
                email: finalEmail,
                id: capturedUserId || finalEmail,
                userId: capturedUserId
            };

            // TRIGGER ON-CHAIN REGISTRATION
            setIsOnChainRegistering(true);
            try {
                if (capturedWalletType === 'metamask') {
                    writeUserRegistry({
                        address: CONTRACTS.UserRegistry.address,
                        abi: parseAbi([
                            'function register(string memory _name)',
                            'function resolve(string memory _name) view returns (address)',
                            'function getName(address _user) view returns (string memory)'
                        ]),
                        functionName: 'register',
                        args: [username],
                    });
                } else if (capturedWalletType === 'circle' && capturedUserToken) {
                    const { data } = await axios.post('/api/circle/contract/register-name', {
                        userToken: capturedUserToken,
                        username: username.toLowerCase()
                    });

                    if (data.challengeId) {
                        await setupArcWorkerWallet(username, role, 'circle', {
                            skipCreation: true,
                            challengeId: data.challengeId,
                            userToken: capturedUserToken
                        });
                    }
                }
            } catch (onChainErr) {
                console.error("On-chain registration failed (non-critical):", onChainErr);
                // We proceed anyway since DB record is created
            }

            localStorage.setItem('arc_user', JSON.stringify(userData));
            if (capturedUserToken) {
                localStorage.setItem('arc_session_token', capturedUserToken);
            }
            setIsOnChainRegistering(false);
            onComplete(userData);
            onClose();
            window.location.reload(); // Force full app reset
        } catch (err: any) {
            console.error("Registration failed:", err);
            setIsOnChainRegistering(false);
            if (err.response?.status === 400 || err.response?.status === 409) {
                setAuthError(err.response?.data?.error || "Username or Email already taken.");
                // Switch back to wallet step to let them fix email if needed
                setCurrentStep('wallet');
            } else {
                alert("Registration failed. Please try again.");
            }
        }
    };


    // ----------------------------------------------------------------------
    // LOGIN & RECOVERY FLOWS
    // ----------------------------------------------------------------------

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        if (!username || !password) {
            setAuthError("Please enter both username and password.");
            return;
        }

        // Force a role check and use the IMMEDIATE result
        const checkResult = await checkUserExists(username);
        const currentDetectedRole = checkResult.role;

        // Proactive client-side check
        if (currentDetectedRole && role && currentDetectedRole !== role) {
            setAuthError(`Invalid portal. Your account is for ${currentDetectedRole.toUpperCase()}. Click 'Switch to portal' below if you want to change.`);
            return;
        }

        try {
            const response = await axios.post('/api/auth/login', {
                email: username,
                password,
                role: role
            });
            const { user } = response.data;

            // If it's a Circle user, we ALSO need to establish a session (trigger OTP or PIN)
            if (user.walletType === 'circle' || user.email) {
                console.log(`Circle user detected in ${user.role} portal, establishing session...`);
                try {
                    const emailToVerify = user.email || username;
                    let result;

                    if (user.role === 'agency' || user.role === 'developer') {
                        result = await setupArcWorkerWallet(emailToVerify, user.role);
                    } else {
                        result = await setupCircleOtpWallet(emailToVerify);
                    }

                    // SYNC BACK TO DB IF ID WAS MISSING
                    if (result.userId && !user.userId) {
                        try {
                            await axios.post('/api/auth/sync-id', {
                                username: user.username,
                                userId: result.userId
                            });
                        } catch (syncErr) { }
                    }

                    user.address = result.address;
                    user.userId = result.userId || user.userId;
                    user.walletType = 'circle';

                    if (result.userToken) {
                        localStorage.setItem('arc_session_token', result.userToken);
                    }
                } catch (err: any) {
                    setAuthError(err.message || "Login success, but failed to connect wallet. Try again.");
                    return;
                }
            }

            localStorage.setItem('arc_user', JSON.stringify(user));
            onComplete(user);
            onClose();
            window.location.reload();
        } catch (err: any) {
            const serverError = err.response?.data?.error;
            setAuthError(serverError || "Invalid username or password.");
        }
    };


    // ----------------------------------------------------------------------
    // NAVIGATION HANDLERS
    // ----------------------------------------------------------------------
    const handleBack = () => {
        if (mode === 'recovery') {
            setMode('login');
        } else if (mode === 'login') {
            setMode('register');
        } else if (mode === 'register' && currentStep === 'profile') {
            setCurrentStep('wallet');
        }
    };


    // ----------------------------------------------------------------------
    // RECOVERY FLOW
    // ----------------------------------------------------------------------
    const [recoveryStep, setRecoveryStep] = useState<'init' | 'challenge' | 'newPassword'>('init');
    const [recoveryChallengeId, setRecoveryChallengeId] = useState<string | null>(null);
    const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
    const [recoveryEncryptionKey, setRecoveryEncryptionKey] = useState<string | null>(null);

    const handleRecoveryInit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        if (!username) {
            setAuthError("Please enter your username.");
            return;
        }

        try {
            const { data } = await axios.post('/api/auth/recover/init', { username });
            setRecoveryChallengeId(data.challengeId);
            setRecoveryToken(data.userToken);
            setRecoveryEncryptionKey(data.encryptionKey);
            setRecoveryStep('challenge');
            // Auto-trigger challenge execution
            executeRecoveryChallenge(data.challengeId, data.userToken, data.encryptionKey);
        } catch (err: any) {
            setAuthError(err.response?.data?.error || "User not found or recovery failed.");
        }
    };

    const executeRecoveryChallenge = async (chId: string, token: string, encKey: string) => {
        setupArcWorkerWallet(username, role, 'circle', {
            skipCreation: true,
            challengeId: chId,
            userToken: token,
            encryptionKey: encKey
        }).then((res) => {
            if (res) {
                setRecoveryStep('newPassword');
            }
        }).catch(err => {
            setAuthError("PIN Signature failed. Please try again.");
            setRecoveryStep('init');
        });
    };

    const handleRecoveryComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setAuthError("Passwords do not match.");
            return;
        }

        try {
            await axios.post('/api/auth/recover/verify', {
                username,
                newPassword: password,
                userToken: recoveryToken,
                challengeId: recoveryChallengeId
            });
            // Success!
            setAuthError(null);
            alert("Password Reset Successful! Please login.");
            setMode('login');
            setPassword('');
        } catch (err: any) {
            setAuthError(err.response?.data?.error || "Failed to reset password.");
        }
    };


    if (!isOpen) return null;

    // COMPACT MODE IS ACTIVE (No Metamask Space)
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-[2rem] shadow-xl w-full max-w-[400px] relative border-2 border-slate-200 
                ${role === 'worker' ? 'h-auto' : 'h-auto max-h-[90vh] md:h-[680px]'} 
                overflow-y-auto flex flex-col antialiased transform-gpu transition-all duration-300`}
                onClick={(e) => e.stopPropagation()}
            >

                {/* ---------- MODE: REGISTER ---------- */}
                {mode === 'register' && (
                    <>
                        {currentStep === 'wallet' && (
                            <OnboardingLayout
                                title=""
                                subtitle={role === 'agency' ? "Access the protocol using your Agency Identity." : "Create account to access the protocol."}
                                footerContent={true}
                                onClose={onClose}
                            >
                                {/* Role Switcher - Always visible in V2 for context */}
                                {!preselectedRole && (
                                    <div className="mb-4">
                                        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => setRole('worker')}
                                                className={`py-2 rounded-lg text-[10px] font-bold transition-all ${role === 'worker' ? 'bg-white text-[#005ddb] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Worker
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRole('agency')}
                                                className={`py-2 rounded-lg text-[10px] font-bold transition-all ${role === 'agency' ? 'bg-white text-[#005ddb] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Agency
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRole('developer')}
                                                className={`py-2 rounded-lg text-[10px] font-bold transition-all ${role === 'developer' ? 'bg-white text-[#005ddb] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                SDK / Dev
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleCircleRegister} className="space-y-4 mt-2" noValidate>
                                    {/* Error Feedback */}
                                    {(circleError || authError) && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold text-center animate-shake">
                                            {circleError || authError}
                                        </div>
                                    )}

                                    <div>
                                        <MinimalInput
                                            type={role === 'agency' ? "text" : "email"}
                                            placeholder={role === 'agency' ? "Enter your Agency Email or ID" : "Enter your email address"}
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value.toLowerCase());
                                                if (detectedRole) setDetectedRole(null);
                                            }}
                                            onBlur={() => checkUserExists(email)}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    {isCircleLoading && circleStatus && (
                                        <p className="text-center text-xs font-bold text-blue-600 animate-pulse uppercase tracking-wider">
                                            {circleStatus}
                                        </p>
                                    )}

                                    <PrimaryButton type="submit" isLoading={isCircleLoading}>
                                        Continue
                                    </PrimaryButton>

                                    {/* SEPARATOR & METAMASK - ONLY FOR AGENCY/DEV */}
                                    {(role !== 'worker') && (
                                        <>
                                            <div className="relative py-4">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-slate-100"></div>
                                                </div>
                                                <div className="relative flex justify-center text-sm">
                                                    <span className="px-4 bg-white text-slate-400 font-medium">or continue with</span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleMetamaskLogin}
                                                className="w-full h-14 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-all flex items-center justify-center gap-3"
                                            >
                                                <MetamaskLogo className="w-48 h-10" />
                                            </button>
                                        </>
                                    )}

                                    <div className="text-center pt-6">
                                        <button
                                            type="button"
                                            onClick={() => setMode('login')}
                                            className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider"
                                        >
                                            Already have an account? Log In
                                        </button>
                                    </div>
                                </form>
                            </OnboardingLayout>
                        )}

                        {currentStep === 'profile' && (
                            <OnboardingLayout
                                title="Create Profile"
                                subtitle="Choose your identity on the protocol."
                                footerContent={true}
                                onClose={onClose}
                                onBack={handleBack}
                            >
                                <form onSubmit={handleFinalizeProfile} className="space-y-4 pt-2">
                                    {(authError) && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold text-center">
                                            {authError}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Your Identity</label>
                                        <MinimalInput
                                            type="text"
                                            placeholder="Choose a username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                                            onBlur={handleUsernameBlur}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    {/* Role Selector hidden here as it's defined in Step 1 or prop */}

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Password</label>
                                            <MinimalInput
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                rightElement={
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-300 hover:text-slate-500 transition-colors">
                                                        {showPassword ? "Hide" : "Show"}
                                                    </button>
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Confirm</label>
                                            <MinimalInput
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="••••••"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                rightElement={
                                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-slate-300 hover:text-slate-500 transition-colors">
                                                        {showConfirmPassword ? "Hide" : "Show"}
                                                    </button>
                                                }
                                            />
                                        </div>
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider text-center pt-1">
                                            Passwords do not match
                                        </p>
                                    )}

                                    <div className="pt-2">
                                        <PrimaryButton
                                            type="submit"
                                            isLoading={isOnChainRegistering || isRegisteringOnChain}
                                            disabled={!password || password !== confirmPassword || isOnChainRegistering || isRegisteringOnChain}
                                        >
                                            {isOnChainRegistering || isRegisteringOnChain ? 'Confirming on Chain...' : 'Complete Setup'}
                                        </PrimaryButton>
                                    </div>

                                </form>
                            </OnboardingLayout>
                        )}
                    </>
                )}


                {/* ---------- MODE: LOGIN ---------- */}
                {mode === 'login' && (
                    <OnboardingLayout
                        title=""
                        subtitle="Log in to your ArcWorker account."
                        footerContent={true}
                        onClose={onClose}
                    >
                        <form onSubmit={handleLogin} className="space-y-3 mt-0" noValidate>
                            {authError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold text-center animate-shake">
                                    {authError}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                                        {role === 'agency' ? "Agency Identity" : "Email or Username"}
                                    </label>
                                    <MinimalInput
                                        type="text"
                                        placeholder={role === 'agency' ? "@username or agency@email.com" : "email@example.com or @username"}
                                        value={username}
                                        onChange={(e) => {
                                            setUsername(e.target.value.replace(/\s+/g, '').toLowerCase());
                                            if (detectedRole) setDetectedRole(null);
                                        }}
                                        onBlur={handleUsernameBlur}
                                        required
                                        autoFocus
                                    />
                                    {/* Role Warning Logic */}
                                    {detectedRole && role && detectedRole !== role && (
                                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl animate-in slide-in-from-top-1">
                                            <p className="text-[10px] font-bold text-amber-700 uppercase leading-tight">
                                                ⚠️ Role Mismatch Detected
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setRole(detectedRole)}
                                                className="mt-2 text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider"
                                            >
                                                Switch to {detectedRole} portal
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Password</label>
                                    <MinimalInput
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        rightElement={
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-300 hover:text-slate-500 transition-colors">
                                                {showPassword ? "Hide" : "Show"}
                                            </button>
                                        }
                                    />
                                </div>
                            </div>

                            <PrimaryButton type="submit">
                                Log In
                            </PrimaryButton>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-100"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-white px-2 text-slate-400">or</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMode('register')}
                                    className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-colors"
                                >
                                    Create Account
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('recovery')}
                                    className="py-2.5 px-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-600 text-xs font-bold rounded-xl transition-colors"
                                >
                                    Recover Password
                                </button>
                            </div>
                        </form>
                    </OnboardingLayout>
                )}

                {/* ---------- MODE: RECOVERY ---------- */}
                {mode === 'recovery' && (
                    <OnboardingLayout
                        title="Password Recovery"
                        subtitle={recoveryStep === 'init' ? "Enter username to start." : "Verify your identity."}
                        footerContent={true}
                        onClose={onClose}
                        onBack={handleBack}
                    >
                        <form onSubmit={recoveryStep === 'init' ? handleRecoveryInit : handleRecoveryComplete} className="space-y-4 mt-2">
                            {authError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold text-center animate-shake">
                                    {authError}
                                </div>
                            )}

                            {recoveryStep === 'init' && (
                                <>
                                    <MinimalInput
                                        type="text"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                    <PrimaryButton type="submit" isLoading={isCircleLoading}>
                                        Find Account
                                    </PrimaryButton>
                                </>
                            )}

                            {/* Intermediate Challenge Step is automated via SDK overlay */}

                            {recoveryStep === 'newPassword' && (
                                <>
                                    <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700 font-bold text-center mb-4">
                                        Identity Verified! Set new password.
                                    </div>
                                    <MinimalInput
                                        type="password"
                                        placeholder="New Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <MinimalInput
                                        type="password"
                                        placeholder="Confirm Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <PrimaryButton type="submit">
                                        Reset Password
                                    </PrimaryButton>
                                </>
                            )}
                        </form>
                    </OnboardingLayout>
                )}

            </div>
        </div>
    );
}
