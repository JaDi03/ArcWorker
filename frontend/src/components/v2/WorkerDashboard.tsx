import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Briefcase, History, TrendingUp, Wallet, LogOut, Bell, ChevronRight, Plus, Star, CheckCircle, Clock, Eye, EyeOff, Copy } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';
import { useTasks } from '@/hooks/useTasks';
import { formatUnits, parseEther, parseUnits } from 'viem';
import { WorkerTaskFeed } from './WorkerTaskFeed';
import WalletDashboardModal from '@/components/WalletDashboardModal';
import { ArcWorkerCardLogo } from '@/components/ui/BrandAssets';

export default function WorkerDashboard() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'market' | 'history' | 'investments'>('dashboard');
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const { address: eoaAddress, isConnected } = useAccount();
    const [circleAddress, setCircleAddress] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [now, setNow] = useState(Date.now());
    const [showAddress, setShowAddress] = useState(false); // Default hidden for privacy

    useEffect(() => {
        const stored = localStorage.getItem('arc_user');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setUser(parsed);
                setCircleAddress(parsed.address);
            } catch (e) {
                console.error("Error parsing user data", e);
            }
        }
    }, []);

    const address = (eoaAddress || circleAddress) as `0x${string}`;

    // 0. Liquid Balance Fetching
    const [liquidBalance, setLiquidBalance] = useState(0);
    const [liveYield, setLiveYield] = useState<string>('0.000000');
    const { data: eoaBalanceData, refetch: refetchWagmiBalance } = useBalance({
        address: eoaAddress,
        query: { enabled: !!eoaAddress }
    });

    useEffect(() => {
        if (eoaBalanceData) {
            setLiquidBalance(Number(formatUnits(eoaBalanceData.value, eoaBalanceData.decimals)));
        }
    }, [eoaBalanceData]);

    useEffect(() => {
        const fetchCircleBalance = async () => {
            if (!circleAddress) return;
            try {
                const sessionToken = localStorage.getItem('arc_session_token');
                const res = await fetch('/api/circle/wallet/balance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userToken: sessionToken })
                });
                if (!res.ok) throw new Error('Failed to fetch balance');
                const data = await res.json();
                if (data.balances?.[0]) {
                    setLiquidBalance(Number(data.balances[0].amount));
                }
            } catch (e) {
                console.error("Error fetching circle balance", e);
            }
        };
        fetchCircleBalance();
    }, [circleAddress]);

    // 1. Data Fetching
    const { tasks: allTasks, isLoading: tasksLoading } = useTasks(undefined, address);

    const { data: savingsShares, refetch: refetchShares } = useReadContract({
        address: CONTRACTS.TaskEscrow.address,
        abi: CONTRACTS.TaskEscrow.abi,
        functionName: 'savingsShares',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
            staleTime: 60000,
            refetchOnWindowFocus: false
        }
    });

    const { data: vaultTotalAssets } = useReadContract({
        address: CONTRACTS.MockYieldVault.address,
        abi: CONTRACTS.MockYieldVault.abi,
        functionName: 'totalAssets',
        query: {
            staleTime: 60000,
            refetchOnWindowFocus: false
        }
    });

    const { data: vaultTotalDeposited } = useReadContract({
        address: CONTRACTS.MockYieldVault.address,
        abi: CONTRACTS.MockYieldVault.abi,
        functionName: 'totalAssetsDeposited',
        query: {
            staleTime: 60000,
            refetchOnWindowFocus: false
        }
    });

    const { data: vaultTotalShares } = useReadContract({
        address: CONTRACTS.MockYieldVault.address,
        abi: CONTRACTS.MockYieldVault.abi,
        functionName: 'totalShares',
        query: {
            staleTime: 60000,
            refetchOnWindowFocus: false
        }
    });

    // 2. Yield Calculations (Same logic as LiveYieldCounter)
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(interval);
    }, []);

    const stats = useMemo(() => {
        if (vaultTotalShares === undefined || vaultTotalAssets === undefined || vaultTotalDeposited === undefined || !address) {
            return { principal: 0, yield: 0, totalSavings: 0, liquidValue: liquidBalance, totalPortfolio: liquidBalance };
        }

        const uShares = savingsShares ? BigInt(savingsShares as any) : BigInt(0);
        const vShares = BigInt(vaultTotalShares as any);
        const vAssets = BigInt(vaultTotalAssets as any);
        const vPrincipal = BigInt(vaultTotalDeposited as any);

        if (vShares === BigInt(0)) return { principal: 0, yield: 0, totalSavings: 0, liquidValue: liquidBalance, totalPortfolio: liquidBalance };

        const userValueBig = (uShares * vAssets) / vShares;
        const userValue = Number(formatUnits(userValueBig, 6));

        let principal = 0;
        if (vAssets > BigInt(0)) {
            const userPrincipalBig = (userValueBig * vPrincipal) / vAssets;
            principal = Number(formatUnits(userPrincipalBig, 6));
        }

        return {
            principal: principal || 0,
            yield: (userValue - principal) || 0,
            totalSavings: userValue || 0,
            liquidValue: liquidBalance || 0,
            totalPortfolio: (userValue + liquidBalance) || 0
        };
    }, [savingsShares, vaultTotalAssets, vaultTotalDeposited, vaultTotalShares, address, liquidBalance]);

    // Live interpolation for UI "wow" factor (Applied only to savings/yields)
    const savingsDisplay = (stats?.totalSavings || 0) > 0
        ? ((stats?.totalSavings || 0) + ((stats?.totalSavings || 0) * 0.05 / 31536000 * (now % 60000) / 1000)).toFixed(6)
        : "0.000000";

    const totalPortfolioDisplay = ((stats?.totalPortfolio || 0) + ((stats?.totalSavings || 0) > 0 ? ((stats?.totalSavings || 0) * 0.05 / 31536000 * (now % 60000) / 1000) : 0)).toFixed(2);

    // 3. Task Processing
    const mySubmissions = useMemo(() => {
        if (!allTasks || !address) return [];
        // Filtering by participation instead of non-existent worker field in Task struct
        return allTasks.filter((t: any) =>
            t.hasParticipated && t.status >= 1
        );
    }, [allTasks, address]);

    const approvedTasks = mySubmissions.filter((t: any) => t.status === 2);
    const pendingTasks = mySubmissions.filter((t: any) => t.status === 1);

    const performanceStats = useMemo(() => {
        const totalEarned = approvedTasks.reduce((sum, t) => sum + parseFloat(t.reward || 0), 0);
        const approvalRate = mySubmissions.length > 0
            ? (approvedTasks.length / (approvedTasks.length + mySubmissions.filter(t => t.status === 3).length || 1)) * 100
            : 100;

        return {
            totalEarned: totalEarned.toFixed(2),
            tasksCount: approvedTasks.length,
            approvalRate: approvalRate.toFixed(1)
        };
    }, [mySubmissions, approvedTasks]);

    // 4. Actions
    const { writeContract: withdraw, data: withdrawHash, isPending: isWithdrawPending } = useWriteContract();
    const { isSuccess: isWithdrawSuccess, isLoading: isWithdrawConfirming } = useWaitForTransactionReceipt({ hash: withdrawHash });

    const isWithdrawing = isWithdrawPending || isWithdrawConfirming;

    useEffect(() => {
        if (isWithdrawSuccess) {
            alert("Withdrawal successful! Funds added to your wallet.");
            refetchShares();
            refetchWagmiBalance();
            // Force Circle refresh if needed (though this is EOA path)
        }
    }, [isWithdrawSuccess, refetchShares, refetchWagmiBalance]);

    const handleWithdraw = async () => {
        if (stats.totalSavings <= 0) return;

        // Use total value for withdrawing everything
        // Explicitly calculate max amount to withdraw to avoid "0" ambiguity
        const amountWei = stats.totalSavings > 0
            ? parseUnits(stats.totalSavings.toFixed(6), 6)
            : BigInt(0);

        const circleUser = localStorage.getItem('arc_user');
        if (circleUser && !isConnected) {
            try {
                const userData = JSON.parse(circleUser);
                const userId = userData.id || userData.userId;
                const userToken = localStorage.getItem('arc_session_token');
                const encryptionKey = localStorage.getItem('arc_encryption_key');

                const res = await fetch('/api/circle/withdraw', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        amount: amountWei,
                        userToken,
                        encryptionKey
                    })
                });

                const data = await res.json();
                if (data.error) throw new Error(data.error);

                const { W3SSdk } = await import('@circle-fin/w3s-pw-web-sdk');
                const sdk = new W3SSdk();
                sdk.setAppSettings({ appId: data.appId });
                sdk.setAuthentication({
                    userToken: data.userToken,
                    encryptionKey: data.encryptionKey
                });

                await new Promise((resolve, reject) => {
                    sdk.execute(data.challengeId, (error: any, result: any) => {
                        if (error) reject(error);
                        else resolve(result);
                    });
                });

                alert("✅ Withdrawal Successful!");
                refetchShares();
                refetchShares();
            } catch (e: any) {
                if (e.message.toLowerCase().includes("user rejected") || e.message.toLowerCase().includes("cancelled")) {
                    // User cancelled, do nothing
                    return;
                }
                alert(`Withdrawal Failed: ${e.message}`);
            }
            return;
        }

        withdraw({
            address: CONTRACTS.TaskEscrow.address,
            abi: CONTRACTS.TaskEscrow.abi,
            functionName: 'withdrawSavings',
            args: [amountWei]
        });
    };

    // Real-time Yield Ticker (Fake Projections for UX)
    useEffect(() => {
        if (!stats.totalSavings || stats.totalSavings <= 0) return;

        const baseYield = stats.yield || 0;
        const principal = stats.totalSavings;
        const apy = 0.05; // 5%
        const yieldPerSecond = (principal * apy) / 31536000;
        const updateIntervalMs = 30; // Faster updates
        const yieldPerInterval = yieldPerSecond * (updateIntervalMs / 1000);

        let accumulated = 0;
        const interval = setInterval(() => {
            accumulated += yieldPerInterval;
            setLiveYield((baseYield + accumulated).toFixed(9));
        }, updateIntervalMs);

        return () => clearInterval(interval);
    }, [stats.totalSavings, stats.yield]);


    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">

            {/* Sidebar with Brand Gradient */}
            <aside className="w-64 bg-gradient-to-b from-[#005edc] from-70% to-[#007a53] flex flex-col z-20 hidden md:flex text-white">
                <div className="h-20 flex items-center justify-center border-b border-white/10 p-4">
                    <ArcWorkerCardLogo className="w-40 h-auto filter brightness-0 invert" />
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center w-full px-4 py-3 rounded-lg transition font-medium ${activeTab === 'dashboard' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                    >
                        <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('market')}
                        className={`flex items-center w-full px-4 py-3 rounded-lg transition font-medium ${activeTab === 'market' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                    >
                        <Briefcase className="w-5 h-5 mr-3" /> Find Work
                    </button>
                    <button
                        onClick={() => setActiveTab(activeTab === 'history' ? 'dashboard' : 'history')}
                        className={`flex items-center w-full px-4 py-3 rounded-lg transition font-medium ${activeTab === 'history' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                    >
                        <History className="w-5 h-5 mr-3" /> Task History
                    </button>
                    <button
                        onClick={() => setActiveTab('investments')}
                        className={`flex items-center w-full px-4 py-3 rounded-lg transition font-medium ${activeTab === 'investments' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                    >
                        <TrendingUp className="w-5 h-5 mr-3" /> Investments
                        <span className="ml-auto bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">BETA</span>
                    </button>
                    <button
                        onClick={() => setIsWalletOpen(true)}
                        className="flex items-center w-full px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition font-medium"
                    >
                        <Wallet className="w-5 h-5 mr-3" /> Wallet
                    </button>

                    <div className="mt-auto pt-4">
                        <button
                            onClick={() => {
                                localStorage.removeItem('arc_user');
                                window.location.href = '/';
                            }}
                            className="flex items-center w-full px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition font-medium"
                        >
                            <LogOut className="w-5 h-5 mr-3" /> Log Out
                        </button>
                    </div>
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 p-4 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-full bg-white text-[#005edc] flex items-center justify-center font-bold shadow-sm">
                            {user?.username?.charAt(0).toUpperCase() || 'W'}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white truncate w-32">{user?.username || 'Worker Account'}</h4>
                            <p className="text-[10px] text-white/70 font-mono truncate w-32">
                                {address ? `${address.substring(0, 6)}...${address.substring(38)}` : '0x...'}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="h-16 bg-white/80 backdrop-blur border-b border-gray-200 flex justify-between items-center px-8 sticky top-0 z-10">
                    <h1 className="text-xl font-bold text-gray-900">
                        {activeTab === 'dashboard' && 'My Dashboard'}
                        {activeTab === 'market' && 'Task Marketplace'}
                        {activeTab === 'history' && 'Task History'}
                        {activeTab === 'investments' && 'Investments & Yields'}
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200 text-sm font-medium">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Global Market Open
                        </div>
                    </div>
                </header>

                {activeTab === 'market' ? (
                    <div className="p-8">
                        <WorkerTaskFeed />
                    </div>
                ) : (
                    <div className="p-8 max-w-7xl mx-auto space-y-8">

                        {/* 1. EARNINGS & WALLET SECTION */}
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Main Balance - "Deep Tech" Protocol Style */}
                            {/* Main Balance - "Deep Tech" Protocol Style */}
                            <div className="bg-[#005edc] text-white rounded-2xl p-6 shadow-xl shadow-blue-500/20 relative overflow-hidden border border-white/10 group">
                                {/* Digital Grid Background Effect */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"></div>
                                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl z-0"></div>
                                <div className="absolute top-0 right-0 p-6 opacity-30">
                                    <ArcWorkerCardLogo className="w-32 h-auto filter brightness-0 invert" />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                                                Your Task Earnings
                                            </div>
                                            <div className="flex items-center gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -right-2 top-0">
                                                {/* Hidden address on hover for clean look? Or keep it visible? Keeping simple for now */}
                                            </div>
                                            <h2 className="text-5xl font-black tracking-tighter font-mono text-white drop-shadow-sm">
                                                ${(Number(stats.totalSavings || 0) + Number(liveYield)).toFixed(2).split('.')[0]}
                                                <span className="text-3xl opacity-60 font-medium">.{(Number(stats.totalSavings || 0) + Number(liveYield)).toFixed(6).split('.')[1]}</span>
                                            </h2>
                                            <div className="mt-2 flex items-center gap-2">
                                                <div
                                                    className="inline-flex items-center gap-3 px-3 py-1.5 bg-black/20 rounded-lg border border-white/5 cursor-pointer hover:bg-black/30 transition select-none min-w-[160px] justify-between group/address"
                                                    onClick={() => setShowAddress(!showAddress)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Wallet className="w-3.5 h-3.5 text-blue-200" />
                                                        <span className="text-[11px] font-mono text-blue-100 tracking-tight">
                                                            {showAddress
                                                                ? (address ? `${address.substring(0, 6)}...${address.substring(38)}` : '0x...')
                                                                : '****...****'
                                                            }
                                                        </span>
                                                    </div>
                                                    {showAddress ? (
                                                        <EyeOff className="w-3.5 h-3.5 text-blue-300 opacity-70 group-hover/address:text-white transition-colors" />
                                                    ) : (
                                                        <Eye className="w-3.5 h-3.5 text-blue-300 opacity-70 group-hover/address:text-white transition-colors" />
                                                    )}
                                                </div>

                                                {/* Copy Button (Only visible when address is shown) */}
                                                {showAddress && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(address);
                                                            alert("Address copied to clipboard!");
                                                        }}
                                                        className="p-1.5 bg-black/20 rounded-lg border border-white/5 hover:bg-white/10 transition text-blue-200 hover:text-white"
                                                        title="Copy Address"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={handleWithdraw}
                                            disabled={isWithdrawing || stats.liquidValue <= 0}
                                            className="flex-1 bg-white text-[#005edc] py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 transition shadow-lg shadow-black/10 disabled:opacity-50 active:scale-[0.98]"
                                        >
                                            {isWithdrawing ? 'Processing...' : 'Withdraw to Wallet'}
                                        </button>
                                        <button
                                            onClick={() => setActiveTab(activeTab === 'history' ? 'dashboard' : 'history')}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition border border-white/10 backdrop-blur-sm ${activeTab === 'history' ? 'bg-white text-[#005edc]' : 'bg-blue-800/50 text-white hover:bg-blue-800'}`}
                                        >
                                            <History className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Stats */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-700">Performance</h3>
                                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-bold">Excellent</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Total Earned</p>
                                        <p className="text-2xl font-bold text-gray-900">${performanceStats.totalEarned}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Approval Rate</p>
                                        <p className="text-2xl font-bold text-green-600">{performanceStats.approvalRate}%</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Tasks Completed</p>
                                        <p className="text-2xl font-bold text-gray-900">{performanceStats.tasksCount}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Pending</p>
                                        <p className="text-2xl font-bold text-yellow-600">{pendingTasks.length}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Investment Quick View (The one the user asked to modify) */}
                            <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                                <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-100 rounded-full opacity-50 blur-2xl"></div>

                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Star className="w-5 h-5 text-blue-600 fill-blue-100" /> Arc-Yield Savings
                                    </h3>
                                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">5% APY</span>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Total Protocol Savings</p>
                                        <p className="text-2xl font-bold text-gray-900 font-mono">
                                            ${(Number(stats.totalSavings || 0) + Number(liveYield)).toFixed(6)}
                                            <span className="text-sm font-normal text-gray-400 block mt-1">
                                                Principal: ${(stats.principal || 0).toFixed(2)}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: (stats.totalSavings || 0) > 0 ? `${Math.min(((stats.totalSavings || 0) / ((stats.totalSavings || 0) + 10)) * 100, 100)}%` : '0%' }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Accrued Yield: <span className="font-bold text-green-600 font-mono text-lg block mt-1">${liveYield}</span>
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 2. ACTIVE WORK & FEED */}
                        {(activeTab === 'dashboard' || activeTab === 'history') && (
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {activeTab === 'dashboard' ? 'Recent Assignments (Pending)' : 'Full Task History'}
                                    </h2>
                                    {activeTab === 'dashboard' && (
                                        <button
                                            onClick={() => setActiveTab('market')}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                            Find More Work <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Task Cards Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {(activeTab === 'dashboard' ? pendingTasks : (activeTab === 'history' ? mySubmissions : [])).length === 0 ? (
                                        <div className="col-span-full py-12 text-center bg-white border border-dashed border-gray-200 rounded-xl">
                                            <p className="text-gray-400">No tasks found in this category.</p>
                                        </div>
                                    ) : (
                                        (activeTab === 'dashboard' ? pendingTasks : (activeTab === 'history' ? mySubmissions : [])).slice(0, 6).map((task: any) => (
                                            <div key={task.id} className={`bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition cursor-pointer group border-l-4 ${task.status === 2 ? 'border-l-green-500' : task.status === 1 ? 'border-l-yellow-500' : 'border-l-red-500'} relative`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className={`${task.status === 2 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide`}>
                                                        {task.metadata?.mod || 'Task'}
                                                    </span>
                                                    <span className="text-gray-400 text-xs font-mono">ID: #{task.id}</span>
                                                </div>
                                                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition truncate">{task.title}</h3>
                                                <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>

                                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                    <div className="text-sm text-gray-500"><span className="font-bold text-gray-900">${task.reward}</span> USDC</div>
                                                    <div className="flex items-center gap-1 text-xs font-bold">
                                                        {task.status === 1 && <><Clock className="w-4 h-4 text-yellow-500" /> Pending</>}
                                                        {task.status === 2 && <><CheckCircle className="w-4 h-4 text-green-500" /> Approved</>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {activeTab === 'dashboard' && (
                                        <button
                                            onClick={() => setActiveTab('market')}
                                            className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 transition cursor-pointer group"
                                        >
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-white group-hover:shadow-md transition">
                                                <Plus className="w-6 h-6" />
                                            </div>
                                            <span className="font-medium text-sm">Browse Market</span>
                                        </button>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Investments Details Tab */}
                        {activeTab === 'investments' && (
                            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-6 h-6 text-blue-600" /> Savings & Investment Yields
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-sm text-gray-500 mb-2 font-medium">How Arc-Yield Works</p>
                                            <p className="text-gray-600 leading-relaxed">
                                                Your earned rewards are automatically placed into our <span className="text-blue-600 font-bold text-sm">MockYieldVault</span>.
                                                This vault simulates a 5% fixed APY, similar to institutional products like USYC.
                                                Unlike agencies, who can only withdraw surplus yields, <strong>you can withdraw your entire principal plus all accrued interest at any time.</strong>
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between items-center pb-4 border-b">
                                                <span className="text-gray-500">Principal Deposit</span>
                                                <span className="font-bold font-mono">${stats.principal.toFixed(6)} USDC</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-4 border-b">
                                                <span className="text-gray-500">Total Accrued Yield</span>
                                                <span className="font-bold text-green-600 font-mono">+${stats.yield.toFixed(6)} USDC</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-4 border-b">
                                                <span className="text-gray-500">Net Estimated APY</span>
                                                <span className="font-bold text-blue-600">5.00%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
                                        <p className="text-sm text-blue-600 font-bold uppercase tracking-widest mb-2">Current Asset Value</p>
                                        <p className="text-5xl font-black text-gray-900 font-mono mb-6">${totalPortfolioDisplay}</p>
                                        <button
                                            onClick={handleWithdraw}
                                            disabled={isWithdrawing || stats.liquidValue <= 0}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-blue-200"
                                        >
                                            Withdraw to Liquid Wallet
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                )}
                <WalletDashboardModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
            </main>
        </div>
    );
}
