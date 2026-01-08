'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useBalance, useDisconnect, useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import { ArcWorkerCardLogo, CircleCardLogo, CircleLogo, ArcWorkerIcon } from '../../components/ui/BrandAssets';
import { CONTRACTS } from '@/utils/contracts';
import { useTasks } from '@/hooks/useTasks';
import { useArcWorkerWallet } from '@/arcworker-sdk/wallet';
import { Shield } from 'lucide-react';

export default function ProfilePage() {
    const { address: wagmiAddress, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [showEmail, setShowEmail] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // In ProfilePage, address might come from localStorage (Circle) or wagmi (Metamask)
    const displayAddress = user?.walletAddress || wagmiAddress;

    // Use useBalance for native currency (USDC on Arc Testnet)
    const { data: balanceData, error: balanceError } = useBalance({
        address: displayAddress as `0x${string}`,
        chainId: 5042002, // Arc Testnet
        query: {
            enabled: !!displayAddress,
        }
    });

    useEffect(() => {
        const storedUser = localStorage.getItem('arc_user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            // Normalize data structure (handle 'name' vs 'username', 'address' vs 'walletAddress')
            const normalizedUser = {
                ...parsed,
                username: parsed.username || parsed.name,
                walletAddress: parsed.walletAddress || parsed.address
            };
            setUser(normalizedUser);
        }
    }, []);

    const userToDisplay = user || {
        username: 'Guest',
        role: 'Unknown',
        email: 'Direct connection',
        walletAddress: displayAddress
    };

    const { restoreWalletAccess, isLoading: isWalletLoading, statusMessage } = useArcWorkerWallet();

    const handleLogout = () => {
        // Clear EVERYTHING to reset state completely
        localStorage.removeItem('arc_user');
        localStorage.removeItem('arc_session_token');
        localStorage.removeItem('arc_encryption_key');
        localStorage.removeItem('arcwork_profile_circle');
        localStorage.removeItem('arc_social_pending');
        localStorage.removeItem('arc_social_session_data');
        localStorage.removeItem('arc_device_id');
        disconnect();
        router.push('/');
    };

    const truncateAddress = (address: string) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const handleCopy = () => {
        if (userToDisplay.walletAddress) {
            navigator.clipboard.writeText(userToDisplay.walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Use the central useTasks hook for activity
    const { tasks: activities, isLoading: isTasksLoading } = useTasks(displayAddress);

    const recentActivity = React.useMemo(() => {
        return activities
            .map(t => {
                let statusLabel = 'Submitted';
                let statusColor = 'text-blue-500';
                if (t.status === 2) { statusLabel = 'Approved & Paid'; statusColor = 'text-emerald-500'; }
                if (t.status === 3) { statusLabel = 'Rejected'; statusColor = 'text-red-500'; }

                return {
                    id: t.id,
                    title: t.title,
                    statusLabel,
                    statusColor,
                    reward: t.reward
                };
            })
            .reverse()
            .slice(0, 5);
    }, [activities]);

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-6 font-sans relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">

                {/* 1. Header: User Info */}
                <div className="flex flex-col items-center mb-10 text-center animate-fade-in-up">
                    {/* PFP Box Removed */}
                    <div className="flex items-center space-x-3 mb-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{userToDisplay.username}</h1>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${userToDisplay.role === 'agency' ? 'bg-[#ebf5ff] text-[#005ddb]' : (userToDisplay.role === 'developer' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600')
                            }`}>
                            {userToDisplay.role}
                        </span>
                    </div>

                    {/* Masked Email with Toggle */}
                    <div className="flex items-center space-x-2 mt-1">
                        <p className="text-slate-400 font-medium font-mono text-sm">
                            {showEmail ? userToDisplay.email : '••••••••••••••••'}
                        </p>
                        <button
                            onClick={() => setShowEmail(!showEmail)}
                            className="text-slate-300 hover:text-slate-500 transition-colors p-1"
                        >
                            {showEmail ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* 2. Premium Wallet Card */}
                <div
                    className="w-full aspect-[1.586/1] rounded-[2rem] p-8 relative overflow-hidden shadow-2xl shadow-blue-200/50 md:transform md:hover:scale-[1.02] transition-transform duration-300 group"
                    style={{ background: 'linear-gradient(135deg, #005edc 30%, #00b87b 100%)' }}
                >

                    {/* Card Background Effects */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-16 -mt-16 mix-blend-overlay" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-[60px] -ml-10 -mb-10 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150" />

                    {/* Card Content */}
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        {/* Top Row: ArcWorker Logo */}
                        <div className="flex justify-between items-start">
                            <div className="opacity-100 filter-none">
                                <ArcWorkerCardLogo className="w-80" />
                            </div>
                        </div>

                        {/* Middle: Balance */}
                        <div className="space-y-1">
                            <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Available Balance</p>
                            <h2 className="text-4xl md:text-5xl font-mono text-white tracking-tighter drop-shadow-sm">
                                {balanceData ? `${parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)}` : '0.0000'} <span className="text-xl text-white/80 font-bold">USDC</span>
                            </h2>
                        </div>

                        {/* Bottom Row: Address & Circle Logo */}
                        <div className="flex justify-between items-end">
                            <button
                                onClick={handleCopy}
                                className="group/btn text-left"
                            >
                                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Wallet Address</p>
                                <div className="flex items-center space-x-2">
                                    <p className="font-mono text-white text-lg sm:text-xl tracking-wider shadow-sm font-bold">
                                        {userToDisplay.walletAddress ? `...${userToDisplay.walletAddress.slice(-4)}` : '...'}
                                    </p>
                                    <span className="text-white/60 hover:text-white transition-colors">
                                        {copied ? '✓' : '❐'}
                                    </span>
                                </div>
                            </button>

                            {/* Circle Logo - Custom Card Variant */}
                            <div className="opacity-100 filter-none">
                                <CircleCardLogo className="w-20" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Action Buttons (Agency) */}
                {userToDisplay.role === 'agency' && (
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <button
                            onClick={() => router.push('/business')}
                            className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-100 border border-slate-50 hover:border-blue-100 hover:shadow-xl hover:-translate-y-1 transition-all group text-left h-full flex flex-col justify-center"
                        >
                            <h3 className="font-bold text-slate-800 text-lg">My Dashboard</h3>
                            <p className="text-xs text-slate-400 mt-1">Manage campaigns</p>
                        </button>

                        <button
                            onClick={() => router.push('/business?create=true')}
                            className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-100 border border-slate-50 hover:border-blue-100 hover:shadow-xl hover:-translate-y-1 transition-all group text-left h-full flex flex-col justify-center"
                        >
                            <h3 className="font-bold text-slate-800 text-lg">New Campaign</h3>
                            <p className="text-xs text-slate-400 mt-1">Hire talent instantly</p>
                        </button>
                    </div>
                )}

                {/* 3b. Action Buttons (Worker) */}
                {userToDisplay.role === 'worker' && (
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <button
                            onClick={() => router.push('/worker')}
                            className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-100 border border-slate-50 hover:border-emerald-100 hover:shadow-xl hover:-translate-y-1 transition-all group text-left h-full flex flex-col justify-center"
                        >
                            <h3 className="font-bold text-slate-800 text-lg">Browse Tasks</h3>
                            <p className="text-xs text-slate-400 mt-1">Start earning USDC</p>
                        </button>

                        <button
                            onClick={() => router.push('/worker/tasks')}
                            className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-100 border border-slate-50 hover:border-blue-100 hover:shadow-xl hover:-translate-y-1 transition-all group text-left h-full flex flex-col justify-center"
                        >
                            <h3 className="font-bold text-slate-800 text-lg">My Submissions</h3>
                            <p className="text-xs text-slate-400 mt-1">Check status</p>
                        </button>
                    </div>
                )}

                {/* 3c. Action Buttons (Developer) */}
                {userToDisplay.role === 'developer' && (
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <button
                            onClick={() => router.push('/developers')}
                            className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-100 border border-slate-50 hover:border-indigo-100 hover:shadow-xl hover:-translate-y-1 transition-all group text-left h-full flex flex-col justify-center"
                        >
                            <h3 className="font-bold text-slate-800 text-lg">SDK Config</h3>
                            <p className="text-xs text-slate-400 mt-1">Manage API Keys</p>
                        </button>

                        <button
                            onClick={() => router.push('/lab')}
                            className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-100 border border-slate-50 hover:border-indigo-100 hover:shadow-xl hover:-translate-y-1 transition-all group text-left h-full flex flex-col justify-center"
                        >
                            <h3 className="font-bold text-slate-800 text-lg">Test Playground</h3>
                            <p className="text-xs text-slate-400 mt-1">Verify Integration</p>
                        </button>

                        <button
                            onClick={() => router.push('/developers/docs')}
                            className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-100 border border-slate-50 hover:border-purple-100 hover:shadow-xl hover:-translate-y-1 transition-all group text-left h-full flex flex-col justify-center"
                        >
                            <h3 className="font-bold text-slate-800 text-lg">API Docs</h3>
                            <p className="text-xs text-slate-400 mt-1">Technical Guides</p>
                        </button>
                    </div>
                )}
                <div className="mt-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Activity</h3>
                    {isMounted && recentActivity.length > 0 ? (
                        <div className="space-y-4">
                            {recentActivity.map((act) => (
                                <div key={act.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">
                                            {act.statusLabel.includes('Approved') ? '💰' : '📝'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{act.title}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider ${act.statusColor}`}>{act.statusLabel}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono font-bold text-slate-900">+{act.reward} USDC</p>
                                        <p className="text-[10px] text-slate-400">ID #{act.id}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 opacity-50">
                            <div className="text-3xl grayscale">🔎</div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No transactions yet</p>
                        </div>
                    )}
                </div>

                {/* 4. Security & Recovery (Pin Reset) */}
                <div className="mt-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                            <Shield size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Security & Recovery</h3>
                    </div>

                    <div className="flex justify-between items-center run-in">
                        <div>
                            <p className="text-sm font-bold text-slate-700">Restore Access</p>
                            <p className="text-xs text-slate-400 mt-1">Forgot PIN? Reset it here.</p>
                        </div>
                        <button
                            onClick={() => restoreWalletAccess()}
                            disabled={isWalletLoading}
                            className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition-all ${isWalletLoading
                                    ? 'bg-indigo-50 text-indigo-300 cursor-not-allowed'
                                    : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200 hover:scale-105'
                                }`}
                        >
                            {isWalletLoading ? 'Wait...' : 'Restore Wallet'}
                        </button>
                    </div>
                </div>

                {/* 5. Footer / Logout */}
                <div className="mt-12 flex flex-col items-center space-y-6">
                    <button
                        onClick={handleLogout}
                        className="text-slate-500 font-black tracking-wide text-sm hover:text-red-500 transition-colors"
                    >
                        Sign Out
                    </button>

                    {/* Subtle "Secured by" Badge */}
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-200 rounded-full opacity-100 hover:bg-slate-300 transition-all cursor-help" title="Your wallet is secured by Circle MPC technology">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Secured by</span>
                        <CircleLogo className="w-20 grayscale-0" />
                    </div>
                </div>

            </div>
        </div >
    );
}
