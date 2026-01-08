'use client';

import React, { useState, useEffect } from 'react';
import { useArcWorkerWallet } from '@/arcworker-sdk/wallet';
import { useConnect, useAccount } from 'wagmi';
import { injected } from 'wagmi/connectors';
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

export function UserSetupModal({ isOpen, onClose, onComplete, initialMode = 'register', preselectedRole }: UserSetupModalProps) {
    // STATE: FLOW & MODE MANAGEMENT
    const [mode, setMode] = useState<'register' | 'login' | 'recovery'>(initialMode);
    const [role, setRole] = useState<'worker' | 'agency' | 'developer'>('worker');

    // Effect to update mode when modal opens or initialMode changes
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            if (preselectedRole) {
                setRole(preselectedRole);
            }
            // Reset errors/steps on open
            setAuthError(null);
            setCurrentStep('wallet');
        }
    }, [isOpen, initialMode, preselectedRole]);

    const [currentStep, setCurrentStep] = useState<'wallet' | 'profile'>('wallet');

    // STATE: WALLET DATA
    const [capturedAddress, setCapturedAddress] = useState<string | null>(null);
    const [capturedWalletType, setCapturedWalletType] = useState<'circle' | 'metamask'>('circle');
    const [capturedUserToken, setCapturedUserToken] = useState<string | null>(null);
    const [capturedUserId, setCapturedUserId] = useState<string | null>(null);
    const [capturedEncryptionKey, setCapturedEncryptionKey] = useState<string | null>(null);

    // STATE: FORM DATA
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // STATE: UI FEEDBACK
    const [authError, setAuthError] = useState<string | null>(null);

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
        try {
            // Check against username/email via generic check route
            const { data } = await axios.post('/api/auth/check', { email: identifier });
            return data.exists;
        } catch {
            return false;
        }
    };

    const handleUsernameBlur = async () => {
        if (!username || mode !== 'register') return;
        const exists = await checkUserExists(username);
        if (exists) {
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

        const exists = await checkUserExists(email);
        if (exists) {
            setAuthError("This email is already registered. Please log in.");
            setMode('login');
            return;
        }

        try {
            console.log("Starting Circle OTP Setup...", email);
            const { address, userToken, userId } = await setupCircleOtpWallet(email);
            if (address) {
                setCapturedAddress(address);
                setCapturedUserToken(userToken);
                setCapturedUserId(userId);
                setCapturedWalletType('circle');
                setCurrentStep('profile');
            }
        } catch (err: any) {
            console.error("Circle OTP Registration Failed:", err);
            setAuthError(err.message || "Email verification failed. Try again.");
        }
    };

    const handleMetamaskLogin = () => {
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
        } catch (err: any) {
            console.error("Registration failed:", err);
            setIsOnChainRegistering(false);
            if (err.response?.status === 409) {
                setAuthError("Username already taken.");
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
        try {
            // Identifier is passed as 'email' to match backend expectation of 'identifier'
            const response = await axios.post('/api/auth/login', { email: username, password });
            const { user } = response.data;

            // If it's a Circle user, we ALSO need to establish a session (trigger OTP)
            if (user.walletType === 'circle' || user.email) {
                console.log("Circle user detected, establishing session via OTP...");
                try {
                    const emailToVerify = user.email || username;
                    const result = await setupCircleOtpWallet(emailToVerify);
                    // Update user object with Circle-specific data for persistence
                    user.address = result.address;
                    user.userId = result.userId;
                    user.walletType = 'circle';
                } catch (err) {
                    console.error("Failed to re-establish Circle session:", err);
                    setAuthError("Login success, but failed to connect wallet. Try again.");
                    return;
                }
            }

            localStorage.setItem('arc_user', JSON.stringify(user));
            onComplete(user);
            onClose();
        } catch (err: any) {
            console.error("Login Error:", err);
            setAuthError("Invalid username or password.");
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
            // SDK execution wrapper usually handles the flow.
            // But we need to know when the signature is DONE.
            // Our SDK hook currently resolves on completion.
            if (res) {
                setRecoveryStep('newPassword');
            }
        }).catch(err => {
            console.error("Recovery Challenge Error:", err);
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



    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[2rem] shadow-xl w-full max-w-[400px] relative border-2 border-slate-200 h-auto max-h-[90vh] md:h-[680px] overflow-y-auto flex flex-col antialiased transform-gpu transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header Toggle REMOVED - Replaced by Bottom Links and internal navigation */}

                {/* ---------- MODE: REGISTER ---------- */}
                {mode === 'register' && (
                    <>
                        {currentStep === 'wallet' && (
                            <OnboardingLayout
                                title=""
                                subtitle="Create account to access the protocol."
                                footerContent={true}
                                onClose={onClose}
                            >
                                <form onSubmit={handleCircleRegister} className="space-y-4 mt-2" noValidate>
                                    {/* Error Feedback */}
                                    {(circleError || authError) && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold text-center animate-shake">
                                            {circleError || authError}
                                        </div>
                                    )}

                                    <div>
                                        <MinimalInput
                                            type="email"
                                            placeholder="Enter your email address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value.toLowerCase())}
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

                                    {!preselectedRole && (
                                        <div className="hidden md:block">
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">I am a...</label>
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
                                                    Business
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

                                    {/* Mobile-only message (hidden on desktop) */}
                                    <div className="md:hidden">
                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight text-center">
                                                Mobile Portal: Joining as Worker
                                            </p>
                                        </div>
                                    </div>

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
                                                        {showPassword ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                            </svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.177z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                        )}
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
                                                        {showConfirmPassword ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                            </svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.177z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                        )}
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
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Email or Username</label>
                                    <MinimalInput
                                        type="text"
                                        placeholder="email@example.com or @username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                                        required
                                        autoFocus
                                    />
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
                                                {showPassword ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.177z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )}
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
                        step={1}
                        totalSteps={1}
                        title="Recover Account"
                        subtitle="Sign with your PIN to reset your password"
                        illustration={<div className="text-6xl">🔐</div>}
                        onClose={onClose}
                        onBack={() => setMode('login')}
                    >
                        {/* STATUS & ERROR */}
                        {authError && (
                            <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200 animate-in fade-in slide-in-from-top-2">
                                {authError}
                            </div>
                        )}

                        {circleStatus && (
                            <div className="p-3 mb-4 text-sm text-blue-600 bg-blue-50 rounded-lg animate-pulse">
                                {circleStatus}
                            </div>
                        )}

                        {/* STEP 1: USERNAME */}
                        {recoveryStep === 'init' && (
                            <form onSubmit={handleRecoveryInit} className="space-y-4">
                                <MinimalInput
                                    label="Username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                                    placeholder="Enter your username"
                                />
                                <PrimaryButton onClick={handleRecoveryInit} disabled={!username}>
                                    Recover with PIN
                                </PrimaryButton>
                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setMode('login')}
                                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* STEP 2: CHALLENGE */}
                        {recoveryStep === 'challenge' && (
                            <div className="text-center py-8">
                                <p className="text-slate-600 mb-4">Please enter your PIN in the secure window to authorize the reset.</p>
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-arc-blue mx-auto"></div>
                            </div>
                        )}

                        {/* STEP 3: NEW PASSWORD */}
                        {recoveryStep === 'newPassword' && (
                            <form onSubmit={handleRecoveryComplete} className="space-y-4">
                                <MinimalInput
                                    label="New Password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min 8 characters"
                                />
                                <MinimalInput
                                    label="Confirm Password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat password"
                                />
                                <PrimaryButton onClick={handleRecoveryComplete} disabled={!password}>
                                    Set New Password
                                </PrimaryButton>
                            </form>
                        )}
                    </OnboardingLayout>
                )}
            </div>
        </div>
    );
}
