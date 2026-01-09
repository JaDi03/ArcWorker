import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Briefcase, History, TrendingUp, Wallet, LogOut, Bell, ChevronRight, Plus, Star, CheckCircle, Clock } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';
import { useTasks } from '@/hooks/useTasks';
import { formatUnits, parseEther } from 'viem';
import { WorkerTaskFeed } from './WorkerTaskFeed';
import WalletDashboardModal from '@/components/WalletDashboardModal';

export default function WorkerDashboard() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'market' | 'history' | 'investments'>('dashboard');
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const { address: eoaAddress, isConnected } = useAccount();
    const [circleAddress, setCircleAddress] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [now, setNow] = useState(Date.now());

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
        if (!vaultTotalShares || !vaultTotalAssets || !vaultTotalDeposited || !address) {
            return { principal: 0, yield: 0, total: 0, liquidValue: 0 };
        }

        const uShares = savingsShares ? BigInt(savingsShares as any) : BigInt(0);
        const vShares = BigInt(vaultTotalShares as any);
        const vAssets = BigInt(vaultTotalAssets as any);
        const vPrincipal = BigInt(vaultTotalDeposited as any);

        if (vShares === BigInt(0)) return { principal: 0, yield: 0, total: 0, liquidValue: 0 };

        const userValueBig = (uShares * vAssets) / vShares;
        const userValue = Number(formatUnits(userValueBig, 18));

        let principal = 0;
        if (vAssets > BigInt(0)) {
            const userPrincipalBig = (userValueBig * vPrincipal) / vAssets;
            principal = Number(formatUnits(userPrincipalBig, 18));
        }

        return {
            principal,
            yield: userValue - principal,
            total: userValue,
            liquidValue: userValue
        };
    }, [savingsShares, vaultTotalAssets, vaultTotalDeposited, vaultTotalShares, address]);

    // Live interpolation for UI "wow" factor
    const totalDisplay = stats.total > 0
        ? (stats.total + (stats.total * 0.05 / 31536000 * (now % 60000) / 1000)).toFixed(6)
        : "0.000000";

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
    const { writeContract: withdraw, isPending: isWithdrawing } = useWriteContract();

    const handleWithdraw = async () => {
        if (stats.total <= 0) return;

        // Use total value for withdrawing everything
        const amountWei = "0"; // Passing 0 triggers 'Withdraw Max' in contract

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
            } catch (e: any) {
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


    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">

            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col z-20 hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-lg shadow-blue-200">W</div>
                    <span className="font-bold text-xl tracking-tight text-gray-900">ArcWorker</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center w-full px-4 py-3 rounded-lg transition font-medium ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('market')}
                        className={`flex items-center w-full px-4 py-3 rounded-lg transition font-medium ${activeTab === 'market' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <Briefcase className="w-5 h-5 mr-3" /> Find Work
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center w-full px-4 py-3 rounded-lg transition font-medium ${activeTab === 'history' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <History className="w-5 h-5 mr-3" /> Task History
                    </button>
                    <button
                        onClick={() => setActiveTab('investments')}
                        className={`flex items-center w-full px-4 py-3 rounded-lg transition font-medium ${activeTab === 'investments' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <TrendingUp className="w-5 h-5 mr-3" /> Investments
                        <span className="ml-auto bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">BETA</span>
                    </button>
                    <button
                        onClick={() => setIsWalletOpen(true)}
                        className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition font-medium"
                    >
                        <Wallet className="w-5 h-5 mr-3" /> Wallet
                    </button>

                    <div className="mt-auto pt-4">
                        <button
                            onClick={() => {
                                localStorage.removeItem('arc_user');
                                window.location.href = '/';
                            }}
                            className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
                        >
                            <LogOut className="w-5 h-5 mr-3" /> Log Out
                        </button>
                    </div>
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                            {user?.username?.charAt(0).toUpperCase() || 'W'}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 truncate w-32">{user?.username || 'Worker Account'}</h4>
                            <p className="text-xs text-gray-500">Level {Math.floor(approvedTasks.length / 5) + 1} Contributor</p>
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
                            {/* Main Balance */}
                            <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-6 shadow-xl shadow-blue-200 relative overflow-hidden">
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

                                <div className="flex justify-between items-start mb-6 relative">
                                    <div>
                                        <p className="text-blue-100 text-sm font-medium mb-1">Available Balance</p>
                                        <h2 className="text-4xl font-bold tracking-tight font-mono">
                                            ${totalDisplay.split('.')[0]}.
                                            <span className="text-2xl opacity-80">{totalDisplay.split('.')[1]}</span>
                                        </h2>
                                    </div>
                                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                        <TrendingUp className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div className="flex gap-3 relative">
                                    <button
                                        onClick={handleWithdraw}
                                        disabled={isWithdrawing || stats.liquidValue <= 0}
                                        className="flex-1 bg-white text-blue-700 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition shadow-sm disabled:opacity-50"
                                    >
                                        {isWithdrawing ? 'Processing...' : 'Withdraw All'}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className="flex-1 bg-blue-500/50 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-500 transition border border-blue-400/30"
                                    >
                                        History
                                    </button>
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
                                        <p className="text-xs text-gray-500 mb-1">Total Savings + Yields</p>
                                        <p className="text-2xl font-bold text-gray-900 font-mono">
                                            ${totalDisplay}
                                            <span className="text-sm font-normal text-gray-400 block mt-1">
                                                Principal: ${(stats.principal || 0).toFixed(2)}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: stats.total > 0 ? `${Math.min((stats.total / (stats.total + 10)) * 100, 100)}%` : '0%' }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Accrued Yield: <span className="font-bold text-green-600">${(stats.yield || 0).toFixed(6)}</span>
                                    </p>
                                </div>

                                <button
                                    onClick={() => setActiveTab('investments')}
                                    className="mt-5 w-full py-2 border border-blue-200 text-blue-700 text-sm font-bold rounded-lg hover:bg-blue-50 transition bg-white shadow-sm"
                                >
                                    View Investment Details
                                </button>
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
                                        <p className="text-5xl font-black text-gray-900 font-mono mb-6">${totalDisplay}</p>
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
