'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useSendTransaction, useConnect, usePublicClient } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';
import { parseEther, formatUnits } from 'viem';
import { useArcWorkerWallet } from '@/arcworker-sdk/wallet';
import axios from 'axios';

interface WalletDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function WalletDashboardModal({ isOpen, onClose }: WalletDashboardModalProps) {
    const { address: wagmiAddress, isConnected: wagmiConnected, status } = useAccount();
    const { connectors, connect } = useConnect();
    const publicClient = usePublicClient();
    const { getBalance: getCircleBalance, sendTransfer: sendCircleTransfer, setupArcWorkerWallet, isLoading: isCircleLoading, error: circleError } = useArcWorkerWallet();

    const [activeTab, setActiveTab] = useState<'ASSETS' | 'SEND' | 'RECEIVE' | 'ACTIVITY'>('ASSETS');
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState('');
    const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
    const [socialMemos, setSocialMemos] = useState<any[]>([]);
    const [isMemosLoading, setIsMemosLoading] = useState(false);

    // Circle State - Initialized directly to avoid flashes
    const [isCircle, setIsCircle] = useState(() => {
        if (typeof window === 'undefined') return false;
        const savedUser = localStorage.getItem('arc_user');
        const sessionToken = localStorage.getItem('arc_session_token');
        if (savedUser && sessionToken) {
            try {
                const user = JSON.parse(savedUser);
                return user.walletType === 'circle';
            } catch (e) { return false; }
        }
        return false;
    });

    const [circleAddress, setCircleAddress] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        const savedUser = localStorage.getItem('arc_user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                return user.address || null;
            } catch (e) { return null; }
        }
        return null;
    });

    const [circleBalance, setCircleBalance] = useState<string>('0.00');
    const [isCircleBalanceLoading, setIsCircleBalanceLoading] = useState(false);
    const [isCircleSending, setIsCircleSending] = useState(false);
    const [isCircleSuccess, setIsCircleSuccess] = useState(false);

    // Business Savings State
    const [savingsAssets, setSavingsAssets] = useState<string>('0.00');
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    // Simplified Address & Connection
    const address = isCircle ? circleAddress : wagmiAddress;
    const isConnected = isCircle ? !!circleAddress : wagmiConnected;

    // Detect Role (Simplified)
    const [isWorker, setIsWorker] = useState(false);
    useEffect(() => {
        const savedUser = localStorage.getItem('arc_user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                setIsWorker(user.role === 'worker');
            } catch (e) { }
        }
    }, []);

    // Balance (Standard Wagmi)
    const { data: wagmiBalanceData, isLoading: isWagmiBalanceLoading, refetch: refetchWagmiBalance } = useBalance({
        address: wagmiAddress,
        query: { enabled: !isCircle && !!wagmiAddress }
    });

    // Send TX (Wagmi)
    const { sendTransaction: wagmiSend, data: hash, isPending: isWagmiPending, error: wagmiSendError, reset: resetWagmiSend } = useSendTransaction();
    const { isLoading: isWagmiConfirming, isSuccess: isWagmiSuccess } = useWaitForTransactionReceipt({ hash });

    // ON-CHAIN REGISTRATION (For existing users)
    const [isManualRegistering, setIsManualRegistering] = useState(false);
    const { writeContract: writeUserRegistry, data: regHash } = useWriteContract();
    const { isLoading: isWagmiRegistering, isSuccess: isRegSuccess } = useWaitForTransactionReceipt({ hash: regHash });
    const isRegisteringOnChain = isManualRegistering || isWagmiRegistering;

    // Check if current address is already registered
    const { data: currentAddressName } = useReadContract({
        address: CONTRACTS.UserRegistry.address,
        abi: CONTRACTS.UserRegistry.abi,
        functionName: 'getName',
        args: [address as `0x${string}`],
        query: { enabled: !!address }
    });

    // Name Resolution Logic
    const { data: nameResolution, isLoading: isResolvingName } = useReadContract({
        address: CONTRACTS.UserRegistry.address,
        abi: CONTRACTS.UserRegistry.abi,
        functionName: 'resolve',
        args: [recipient.replace('@', '').toLowerCase()],
        query: {
            enabled: recipient.startsWith('@') && recipient.length > 3
        }
    });

    useEffect(() => {
        if (recipient.startsWith('@')) {
            if (nameResolution && nameResolution !== '0x0000000000000000000000000000000000000000') {
                setResolvedAddress(nameResolution as string);
            } else {
                setResolvedAddress(null);
            }
        } else {
            setResolvedAddress(null);
        }
    }, [recipient, nameResolution]);

    // Sync Circle Session State
    useEffect(() => {
        const checkSession = () => {
            const savedUser = localStorage.getItem('arc_user');
            const sessionToken = localStorage.getItem('arc_session_token');
            if (savedUser && sessionToken) {
                const user = JSON.parse(savedUser);
                if (user.walletType === 'circle') {
                    setIsCircle(true);
                    setCircleAddress(user.address);
                } else {
                    setIsCircle(false);
                }
            } else {
                setIsCircle(false);
                setCircleAddress(null);
            }
        };

        if (isOpen) {
            checkSession();
        }
    }, [isOpen]);

    const fetchCircleBalance = React.useCallback(async () => {
        if (!isCircle || !isOpen) return;
        setIsCircleBalanceLoading(true);
        try {
            const data = await getCircleBalance();
            if (data) {
                if (data.balances && data.balances.length > 0) {
                    setCircleBalance(data.balances[0].amount);
                }
                // Fetch Savings from TaskEscrow via manual call or hook
                // For simplicity, we'll use the readContract hook below
                // Important: Update address if missing to unlock the UI
                if (data.address && !circleAddress) {
                    setCircleAddress(data.address);

                    // Sync back to localStorage for next time
                    const savedUser = localStorage.getItem('arc_user');
                    if (savedUser) {
                        try {
                            const user = JSON.parse(savedUser);
                            user.address = data.address;
                            localStorage.setItem('arc_user', JSON.stringify(user));
                        } catch (e) { }
                    }
                }
            }
        } catch (err: any) {
            console.error("Failed to fetch Circle balance:", err);
            if (err.message === "SESSION_EXPIRED") {
                console.log("[WalletModal] Session expired, attempting auto-refresh...");
                // Attempt to re-auth silently using stored email
                const savedUser = localStorage.getItem('arc_user');
                if (savedUser) {
                    try {
                        const user = JSON.parse(savedUser);
                        if (user.username) {
                            await setupArcWorkerWallet(user.username, 'worker', 'circle', { skipCreation: true });
                            // Retry once after re-auth
                            const retryData = await getCircleBalance();
                            if (retryData?.balances?.[0]) {
                                setCircleBalance(retryData.balances[0].amount);
                            }
                        }
                    } catch (reAuthErr) {
                        console.error("[WalletModal] Auto-refresh failed:", reAuthErr);
                    }
                }
            }
        } finally {
            setIsCircleBalanceLoading(false);
        }
    }, [isCircle, isOpen, getCircleBalance, circleAddress]);

    useEffect(() => {
        if (isOpen && isCircle) {
            fetchCircleBalance();
        }
    }, [isOpen, isCircle, fetchCircleBalance]);

    // Fetch Savings (Wagmi Read)
    const { data: rawSavingsShares, refetch: refetchSavings } = useReadContract({
        address: CONTRACTS.TaskEscrow.address,
        abi: CONTRACTS.TaskEscrow.abi,
        functionName: 'savingsShares',
        args: [address as `0x${string}`],
        query: { enabled: !!address }
    });

    // Convert Shares to Assets
    const { data: rawSavingsAssets } = useReadContract({
        address: CONTRACTS.MockYieldVault.address,
        abi: CONTRACTS.MockYieldVault.abi,
        functionName: 'convertToAssets',
        args: [rawSavingsShares || BigInt(0)],
        query: { enabled: !!rawSavingsShares }
    });

    useEffect(() => {
        if (rawSavingsAssets) {
            setSavingsAssets(formatUnits(rawSavingsAssets as bigint, 6));
        } else {
            setSavingsAssets('0.00');
        }
    }, [rawSavingsAssets]);

    const { writeContract: writeWithdraw, data: withdrawHash } = useWriteContract();
    const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

    useEffect(() => {
        if (isWithdrawSuccess) {
            alert("Withdrawal successful! Funds added to your wallet.");
            refetchSavings();
            if (isCircle) fetchCircleBalance();
            else refetchWagmiBalance();
            setIsWithdrawing(false);
        }
    }, [isWithdrawSuccess, refetchSavings, fetchCircleBalance, refetchWagmiBalance, isCircle]);

    const fetchSocialMemos = React.useCallback(async () => {
        if (!address) return;
        setIsMemosLoading(true);
        try {
            const res = await axios.get(`/api/circle/memos?address=${address}`);
            setSocialMemos(res.data.memos || []);
        } catch (err) {
            console.error("Failed to fetch memos:", err);
        } finally {
            setIsMemosLoading(false);
        }
    }, [address]);

    useEffect(() => {
        if (isOpen && activeTab === 'ACTIVITY') {
            fetchSocialMemos();
        }
    }, [isOpen, activeTab, fetchSocialMemos]);

    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setActiveTab('ASSETS');
                setRecipient('');
                setAmount('');
                setMemo('');
                setResolvedAddress(null);
                resetWagmiSend();
                setIsCircleSuccess(false);
                setIsCircleSending(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, resetWagmiSend]);

    const handleDoSend = async () => {
        if (!isConnected) {
            console.error("Not connected");
            return;
        }

        const target = resolvedAddress || recipient;
        if (!target || !amount) return;

        if (isCircle) {
            setIsCircleSending(true);
            try {
                await sendCircleTransfer(target, amount, 'USDC', memo);
                setIsCircleSuccess(true);
                fetchCircleBalance();
                setMemo(''); // Clear memo
            } catch (err) {
                console.error("Circle Send Error:", err);
            } finally {
                setIsCircleSending(false);
            }
        } else {
            try {
                wagmiSend({
                    to: target as `0x${string}`,
                    value: parseEther(amount)
                });

                // Record Social Memo after triggering Metamask
                if (memo) {
                    await axios.post('/api/social/payment', {
                        fromAddress: address,
                        toAddress: target,
                        amount: amount,
                        symbol: 'ETH',
                        memo: memo
                    });
                }
                setMemo('');
            } catch (err) {
                console.error("Manual Send Error Catch:", err);
            }
        }
    };

    const handleRegisterOnChain = async (targetName?: string) => {
        const savedUser = localStorage.getItem('arc_user');
        if (!savedUser) return;
        const user = JSON.parse(savedUser);
        const username = (targetName || user.username || user.name).toLowerCase();

        if (isCircle) {
            try {
                // 1. Check availability first (Viem/PublicClient)
                if (publicClient) {
                    setIsManualRegistering(true);
                    try {
                        const owner = await publicClient.readContract({
                            address: CONTRACTS.UserRegistry.address,
                            abi: CONTRACTS.UserRegistry.abi,
                            functionName: 'resolve',
                            args: [username]
                        }) as string;

                        if (owner !== "0x0000000000000000000000000000000000000000") {
                            setIsManualRegistering(false);
                            if (address && owner.toLowerCase() === address.toLowerCase()) {
                                alert("¡Ya estás registrado con este nombre! Refrescando interfaz...");
                                window.location.reload();
                                return;
                            }
                            alert(`El nombre @${username} ya está siendo usado por otro usuario. Intenta con uno diferente.`);
                            return;
                        }

                        // 2. Also check if address already has a name
                        const existingName = await publicClient.readContract({
                            address: CONTRACTS.UserRegistry.address,
                            abi: CONTRACTS.UserRegistry.abi,
                            functionName: 'getName',
                            args: [address as `0x${string}`]
                        }) as string;

                        if (existingName && existingName.length > 0) {
                            setIsManualRegistering(false);
                            alert(`Tu billetera ya está registrada con el nombre @${existingName}.`);
                            window.location.reload();
                            return;
                        }
                    } catch (readErr) {
                        console.warn("Pre-check failed, proceeding with transaction...", readErr);
                    }
                }

                const sessionToken = localStorage.getItem('arc_session_token');
                const { data } = await axios.post('/api/circle/contract/register-name', {
                    userToken: sessionToken,
                    username: username
                });
                if (data.challengeId) {
                    const encryptionKey = localStorage.getItem('arc_encryption_key');
                    await setupArcWorkerWallet(username, 'worker', 'circle', {
                        skipCreation: true,
                        challengeId: data.challengeId,
                        userToken: sessionToken!,
                        encryptionKey: encryptionKey || undefined
                    });

                    // Show success state instead of instant reload
                    alert("¡Registro iniciado! La transacción se está procesando en la red Arc.");
                    setIsCircleSuccess(true);

                    // Small delay & refresh local state
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                }
            } catch (err: any) {
                setIsManualRegistering(false);
                console.error("Circle Register Error:", err);
                const errorData = err.response?.data?.details || err.response?.data;

                // Decode common errors
                if (errorData?.message?.includes('already taken') || JSON.stringify(errorData).includes('taken')) {
                    alert(`El nombre @${username} ya está ocupado. Elige otro.`);
                    return;
                }

                if (errorData?.code === 155104 || errorData?.message?.includes('expired')) {
                    console.log("[Register] Session expired, refreshing...");
                    const savedUser = localStorage.getItem('arc_user');
                    if (savedUser) {
                        try {
                            const user = JSON.parse(savedUser);
                            if (user.username) {
                                const fresh = await setupArcWorkerWallet(user.username, 'worker', 'circle', { skipCreation: true });
                                if (fresh) {
                                    handleRegisterOnChain();
                                    return;
                                }
                            }
                        } catch (reAuthErr) {
                            console.error("[Register] Auto-refresh failed:", reAuthErr);
                        }
                    }
                }
                alert("Error de registro: " + (err.response?.data?.details?.message || err.message));
            }
        } else {
            // Pre-check for Wagmi/MetaMask
            setIsManualRegistering(true);
            if (publicClient) {
                try {
                    const owner = await publicClient.readContract({
                        address: CONTRACTS.UserRegistry.address,
                        abi: CONTRACTS.UserRegistry.abi,
                        functionName: 'resolve',
                        args: [username]
                    }) as string;

                    if (owner !== "0x0000000000000000000000000000000000000000") {
                        setIsManualRegistering(false);
                        if (address && owner.toLowerCase() === address.toLowerCase()) {
                            alert("¡Ya estás registrado con este nombre!");
                            window.location.reload();
                            return;
                        }
                        alert(`El nombre @${username} ya está siendo usado por otro usuario. Intenta con uno diferente.`);
                        return;
                    }
                } catch (e) {
                    console.warn("Pre-check failed", e);
                }
            }

            writeUserRegistry({
                address: CONTRACTS.UserRegistry.address,
                abi: CONTRACTS.UserRegistry.abi,
                functionName: 'register',
                args: [username],
            });
        }
    };

    const isPending = isCircle ? isCircleSending : isWagmiPending;
    const isConfirming = isCircle ? false : isWagmiConfirming; // Circle sendTransfer waits for challenge
    const isSuccess = isCircle ? isCircleSuccess : isWagmiSuccess;
    const sendError = isCircle ? circleError : wagmiSendError; // Error handling improved below

    // Safely format balances
    const formattedWagmiBalance = wagmiBalanceData
        ? formatUnits(wagmiBalanceData.value, wagmiBalanceData.decimals)
        : '0.00';

    const liquidBalance = isCircle ? Number(circleBalance) : Number(formattedWagmiBalance);
    const savingsBalance = Number(savingsAssets);
    const totalBalance = liquidBalance + savingsBalance;

    const balanceDisplay = totalBalance.toFixed(2);
    const liquidDisplay = liquidBalance.toFixed(2);

    const isAddressValid = resolvedAddress || (recipient.startsWith('0x') && recipient.length === 42);

    // Function to handle "Connector not connected" by forcing a re-connect UI or suggestion
    const isConnectorError = typeof sendError !== 'string' && (sendError as any)?.message?.includes('Connector not connected');

    if (!isOpen) return null;

    if (!isConnected || !address) {
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
                    >
                        ✕
                    </button>
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        {isCircle ? '⌛' : '⚡'}
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mb-2">
                        {isCircle ? 'Loading Wallet...' : 'Wallet Disconnected'}
                    </h3>
                    <p className="text-slate-500 text-sm mb-6">
                        {isCircle
                            ? 'Please wait while we sync your protocol wallet.'
                            : 'Please connect your wallet to access funds.'
                        }
                    </p>

                    {!isCircle ? (
                        <button
                            onClick={() => connect({ connector: connectors[0] })}
                            className="w-full py-3 bg-[#005ddb] text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                        >
                            Connect Wallet
                        </button>
                    ) : (
                        <div className="w-full py-2 flex items-center justify-center space-x-2 text-blue-600 font-bold">
                            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                            <span>Syncing session...</span>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative min-h-[500px] flex flex-col transform transition-all">
                {/* Header */}
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-lg">My Wallet</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 transition-colors font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-slate-50 border-b border-slate-100">
                    {['ASSETS', 'SEND', 'RECEIVE', 'ACTIVITY'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Identity Banner */}
                {!currentAddressName && (
                    <div className="bg-blue-600 p-3 flex items-center justify-between text-white animate-in slide-in-from-top duration-500">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm">🆔</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Identity not linked on-chain</span>
                        </div>
                        <button
                            onClick={() => handleRegisterOnChain()}
                            disabled={isRegisteringOnChain}
                            className="bg-white text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                            {isRegisteringOnChain ? 'Signing...' : 'Register @Name'}
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 p-6 relative flex flex-col">
                    {activeTab === 'ASSETS' && (
                        <div className="text-center py-8 flex-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Estimated Balance</p>
                            <h2 className="text-5xl font-black text-slate-900 mb-2 tracking-tight">
                                ${balanceDisplay}
                            </h2>

                            <div className="mt-8 space-y-3">
                                {/* Simplified Asset Row */}
                                <div className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <div className="flex items-center">
                                        {/* USDC / Dollar Logo */}
                                        <div className="w-10 h-10 bg-[#2775ca] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                            $
                                        </div>
                                        <div className="ml-3 text-left">
                                            <p className="font-bold text-slate-900 text-sm">USDC (Liquid)</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Available for transfers</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-slate-700">{liquidDisplay}</span>
                                </div>

                                {/* Business Savings Row (Funds from cancelled tasks or earnings) */}
                                {Number(savingsAssets) > 0 && (
                                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                                    🏦
                                                </div>
                                                <div className="ml-3 text-left">
                                                    <p className="font-bold text-indigo-900 text-sm">{isWorker ? 'Earnings Savings' : 'Business Savings'}</p>
                                                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">
                                                        {isWorker ? 'Earning 5% APY effectively' : 'Refunded from cancelled tasks'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-indigo-700 text-lg">${Number(savingsAssets).toFixed(2)}</p>
                                                {isWorker && <span className="text-[8px] bg-green-200 text-green-700 px-1 rounded font-bold">5% APY</span>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (!window.confirm("Withdraw all savings to your wallet?")) return;
                                                setIsWithdrawing(true);
                                                writeWithdraw({
                                                    address: CONTRACTS.TaskEscrow.address,
                                                    abi: CONTRACTS.TaskEscrow.abi,
                                                    functionName: 'withdrawSavings',
                                                    args: [BigInt(0)] // 0 means ALL
                                                });
                                            }}
                                            disabled={isWithdrawing || isWithdrawConfirming}
                                            className="w-full h-10 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {isWithdrawing || isWithdrawConfirming ? 'Processing...' : 'Withdraw to Wallet'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => isCircle ? fetchCircleBalance() : refetchWagmiBalance()}
                                className="mt-8 text-xs font-bold text-slate-400 hover:text-blue-600"
                            >
                                {isCircleBalanceLoading || isWagmiBalanceLoading ? '↻ Updating...' : '↻ Refresh Balance'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'SEND' && (
                        <div className="space-y-6 flex-1">
                            {isSuccess ? (
                                <div className="text-center py-10 animate-in zoom-in">
                                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-sm">✓</div>
                                    <h4 className="font-bold text-xl text-slate-900">Sent Successfully!</h4>
                                    <p className="text-sm text-slate-500 mt-2">Funds have been transferred.</p>
                                    <button onClick={() => { setActiveTab('ASSETS'); setAmount(''); setRecipient(''); setMemo(''); isCircle ? setIsCircleSuccess(false) : resetWagmiSend(); }} className="mt-8 w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">
                                        Done
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Recipient</label>
                                        <input
                                            type="text"
                                            placeholder="@username or 0xAddress"
                                            value={recipient}
                                            onChange={(e) => setRecipient(e.target.value)}
                                            className="w-full p-4 bg-slate-50 rounded-2xl font-mono text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:border-blue-500"
                                        />

                                        {/* Resolution Feedback */}
                                        <div className="h-6 mt-2">
                                            {recipient.startsWith('@') && recipient.length > 3 && (
                                                <>
                                                    {isResolvingName ? (
                                                        <span className="text-xs text-slate-400 flex items-center"><span className="w-3 h-3 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin mr-2"></span> Searching...</span>
                                                    ) : resolvedAddress ? (
                                                        <span className="text-xs text-green-600 font-bold flex items-center">
                                                            <span>✓ Verified: </span>
                                                            <span className="font-mono ml-1 bg-green-50 px-1 rounded">{resolvedAddress.substring(0, 6)}...{resolvedAddress.substring(38)}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-red-400 font-bold">User not found</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Amount</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="w-full p-4 pl-4 pr-20 bg-slate-50 rounded-2xl text-3xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                                                <span className="text-sm font-bold text-slate-500">USDC</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Message (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="What's this for?"
                                            value={memo}
                                            onChange={(e) => setMemo(e.target.value)}
                                            className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="pt-4 mt-auto">
                                        <button
                                            onClick={handleDoSend}
                                            disabled={!amount || !isAddressValid || isPending || isConfirming}
                                            className="w-full py-4 bg-[#005ddb] text-white font-bold rounded-2xl hover:bg-blue-600 shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center transform active:scale-95"
                                        >
                                            {isPending || isConfirming ? 'Processing Transaction...' : 'Confirm Send'}
                                        </button>
                                    </div>

                                    {isConnectorError && (
                                        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-center">
                                            <p className="text-xs font-bold mb-2">Connection Lost</p>
                                            <button
                                                onClick={() => connect({ connector: connectors[0] })}
                                                className="px-4 py-2 bg-red-100 rounded-lg text-xs font-bold hover:bg-red-200"
                                            >
                                                Reconnect Wallet
                                            </button>
                                        </div>
                                    )}

                                    {sendError && !isConnectorError && (
                                        <div className="p-3 bg-red-50 text-red-500 text-xs rounded-xl border border-red-100 mt-4 break-words">
                                            <p className="font-bold mb-1">Error:</p>
                                            {typeof sendError === 'string' ? sendError : (sendError as any).message || JSON.stringify(sendError)}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'RECEIVE' && (
                        <div className="text-center py-8 flex flex-col items-center">
                            <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 inline-block mb-6 shadow-sm">
                                <div className="w-56 h-56 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-300 relative overflow-hidden">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${address}`}
                                        alt="Wallet QR Code"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl w-full">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Your Address</p>
                                <p className="text-xs text-slate-700 font-mono break-all select-all">{address}</p>
                            </div>
                            <button
                                onClick={() => navigator.clipboard.writeText(address || '')}
                                className="mt-4 w-full py-3 border-2 border-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                            >
                                Copy Address
                            </button>
                        </div>
                    )}

                    {activeTab === 'ACTIVITY' && (
                        <div className="flex-1 -mx-6 -mb-6 p-6 bg-slate-50 overflow-y-auto max-h-[400px]">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-bold text-slate-800">Social Feed</h4>
                                <button onClick={fetchSocialMemos} className="text-xs text-blue-600 font-bold">Refresh</button>
                            </div>

                            {isMemosLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-sm font-bold">Syncing social data...</p>
                                </div>
                            ) : socialMemos.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="text-4xl mb-4">💬</div>
                                    <p className="text-sm text-slate-500 font-medium">No messages yet.</p>
                                    <p className="text-xs text-slate-400 mt-1">Send a payment with a note to start.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {socialMemos.map((m, i) => {
                                        const isOutgoing = m.fromAddress?.toLowerCase() === address?.toLowerCase();
                                        return (
                                            <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start space-x-3 transition-all hover:border-blue-200">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm ${isOutgoing ? 'bg-blue-600' : 'bg-green-600'}`}>
                                                    {isOutgoing ? '➜' : '⬅'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-xs font-bold text-slate-900">
                                                            {isOutgoing ? 'To: ' : 'From: '}
                                                            <span className="font-mono">{isOutgoing ? m.toAddress?.substring(0, 10) : m.fromAddress?.substring(0, 10)}...</span>
                                                        </p>
                                                        <p className="text-xs font-black text-slate-900">
                                                            {isOutgoing ? '-' : '+'}{m.amount} {m.symbol || 'USDC'}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                        <p className="text-sm text-slate-700 font-medium italic">"{m.memo}"</p>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">
                                                        {new Date(m.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
