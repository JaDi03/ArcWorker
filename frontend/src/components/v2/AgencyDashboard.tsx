import React, { useState, useMemo, useEffect } from 'react';
import { Download, Plus, TrendingUp, ScanLine, MoreHorizontal, Check, X as XIcon, Type, Loader2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AgencySidebar } from './AgencySidebar';
import WalletDashboardModal from '../WalletDashboardModal';
import { useTasks } from '@/hooks/useTasks';
import { useAccount, useWriteContract } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';
import { getSdk } from '@/utils/circle';

export const AgencyDashboard: React.FC = () => {
    const router = useRouter();
    const { address: userAddress, isConnected } = useAccount();
    const [circleAddress, setCircleAddress] = useState<string | undefined>();

    // Get Circle wallet address if logged in
    useEffect(() => {
        const fetchCircleAddress = async () => {
            // First, check localStorage cache
            const cachedAddress = localStorage.getItem('arc_wallet_address');
            if (cachedAddress) {
                console.log('[Dashboard] Using cached Circle address:', cachedAddress);
                setCircleAddress(cachedAddress);
            }

            // Then fetch fresh data from API
            const circleUser = localStorage.getItem('arc_user');
            const sessionToken = localStorage.getItem('arc_session_token');

            if (circleUser && sessionToken) {
                try {
                    const res = await fetch('/api/circle/wallet', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userToken: sessionToken })
                    });

                    const data = await res.json();
                    if (data.address) {
                        console.log('[Dashboard] Fetched Circle address from API:', data.address);
                        setCircleAddress(data.address);
                        // Cache it for next time
                        localStorage.setItem('arc_wallet_address', data.address);
                    }
                } catch (e) {
                    console.error('Error fetching Circle wallet address:', e);
                }
            }
        };

        fetchCircleAddress();
    }, []);

    // Use Circle address if available, otherwise use MetaMask address
    const effectiveAddress = userAddress || circleAddress;

    const { tasks: agencyTasks, isLoading } = useTasks(effectiveAddress);
    const [activeView, setActiveView] = useState<'overview' | 'review'>('overview');
    const [isWalletOpen, setIsWalletOpen] = useState(false);

    // Group tasks by title to represent "Campaigns"
    const campaigns = useMemo(() => {
        const groups: Record<string, { title: string, count: number, completed: number, reward: string, type: string, status: string }> = {};

        agencyTasks.forEach((t: any) => {
            // Use metadataHash as fallback if title is empty
            const key = t.title || t.metadataHash || `Campaign-${t.id}`;
            if (!groups[key]) {
                groups[key] = {
                    title: t.title || 'Untitled Campaign',
                    count: 0,
                    completed: 0,
                    reward: t.reward,
                    type: t.metadata?.moduleId || t.metadata?.mod || 'Task',
                    status: 'Active'
                };
            }
            groups[key].count++;
            if (t.status === 2) groups[key].completed++;
        });

        return Object.values(groups);
    }, [agencyTasks]);

    // Pending reviews (Status 1)
    const pendingReviews = useMemo(() => {
        console.log('[AgencyDashboard] All agency tasks:', agencyTasks);
        console.log('[AgencyDashboard] Filtering for status === 1');
        const filtered = agencyTasks.filter((t: any) => {
            console.log(`[AgencyDashboard] Task ${t.id}: status=${t.status}, worker=${t.worker}`);
            return t.status === 1;
        });
        console.log('[AgencyDashboard] Pending reviews:', filtered);
        return filtered;
    }, [agencyTasks]);

    const [selectedReview, setSelectedReview] = useState<any>(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const { writeContractAsync: writeAgencyAction } = useWriteContract();

    const handleAgencyAction = async (action: 'approve' | 'reject') => {
        if (!selectedReview) return;

        try {
            setIsReviewing(true);
            const taskId = selectedReview.id;

            if (isConnected) {
                // EOA Flow
                await writeAgencyAction({
                    address: CONTRACTS.TaskEscrow.address,
                    abi: CONTRACTS.TaskEscrow.abi,
                    functionName: action === 'approve' ? 'approveTask' : 'rejectTask',
                    args: [BigInt(taskId)],
                });
                alert(`Task ${action === 'approve' ? 'Approved' : 'Rejected'} successfully via Wallet!`);
                setSelectedReview(null);
                return;
            }

            // Circle Flow
            const circleUser = localStorage.getItem('arc_user');
            const sessionToken = localStorage.getItem('arc_session_token');
            const encryptionKey = localStorage.getItem('arc_encryption_key');

            if (circleUser) {
                const user = JSON.parse(circleUser);
                const userId = user.id || user.userId;

                const res = await fetch(`/api/circle/${action}-task`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        taskId,
                        userToken: sessionToken || undefined,
                        encryptionKey: encryptionKey || undefined
                    })
                });

                const data = await res.json();
                if (data.error) throw new Error(data.message || data.error);

                if (data.challengeId) {
                    const sdk = getSdk();
                    if (!sdk) throw new Error("Circle SDK not initialized");

                    sdk.setAppSettings({ appId: data.appId });
                    sdk.setAuthentication({ userToken: data.userToken, encryptionKey: data.encryptionKey });

                    await new Promise((resolve, reject) => {
                        sdk.execute(data.challengeId, (error: any, result: any) => {
                            if (error) reject(error);
                            else resolve(result);
                        });
                    });
                }

                alert(`Task ${action === 'approve' ? 'Approved' : 'Rejected'} successfully via Circle!`);
                setSelectedReview(null);
            } else {
                alert("Please connect a wallet or sign in to perform this action.");
            }

        } catch (err: any) {
            console.error(err);

            // Special handling for Circle PIN initialization error
            if (err.message?.includes('not set up a PIN') || err.message?.includes('PIN')) {
                alert(
                    `⚠️ Circle Wallet Not Initialized\n\n` +
                    `Your Circle wallet needs to be set up before you can perform transactions.\n\n` +
                    `Please:\n` +
                    `1. Open your Wallet (click "Wallet" button above)\n` +
                    `2. Follow the PIN setup process\n` +
                    `3. Try ${action === 'approve' ? 'approving' : 'rejecting'} the task again\n\n` +
                    `This is a one-time setup.`
                );
            } else {
                alert(`Action Failed: ${err.message}`);
            }
        } finally {
            setIsReviewing(false);
        }
    };

    const handleCancelCampaign = async (campaignTitle: string) => {
        const titleForDisplay = campaignTitle || 'Untitled Campaign';
        if (!window.confirm(`Are you sure you want to cancel all "Created" tasks in "${titleForDisplay}"? This will refund the deposit to your Savings.`)) return;

        setIsReviewing(true);
        try {
            // Find all tasks with this title that are in status 0 (Created)
            const tasksToCancel = agencyTasks.filter((t: any) =>
                (t.title === campaignTitle || (!t.title && campaignTitle === 'Untitled Campaign')) &&
                t.status === 0
            );

            if (tasksToCancel.length === 0) {
                alert("No cancelable tasks found in this campaign (they might be submitted or completed).");
                return;
            }

            // Check if using wagmi connector (MetaMask, etc.) or Circle wallet
            if (isConnected && userAddress) {
                // Use wagmi for connected wallets
                for (const task of tasksToCancel) {
                    await writeAgencyAction({
                        address: CONTRACTS.TaskEscrow.address,
                        abi: CONTRACTS.TaskEscrow.abi,
                        functionName: 'cancelTask',
                        args: [BigInt(task.id)],
                    });
                }
            } else if (circleAddress) {
                // Use Circle API for Circle wallets
                const circleUser = localStorage.getItem('arc_user');
                const sessionToken = localStorage.getItem('arc_session_token');
                if (!circleUser) throw new Error("Please log in to cancel tasks");

                const user = JSON.parse(circleUser);
                const userId = user.id || user.userId;

                for (const task of tasksToCancel) {
                    const res = await fetch('/api/circle/cancel-task', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, taskId: task.id, userToken: sessionToken || undefined })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.message || data.error);

                    if (data.challengeId) {
                        const sdk = getSdk();
                        if (!sdk) throw new Error("Circle SDK not initialized");
                        sdk.setAppSettings({ appId: data.appId });
                        sdk.setAuthentication({ userToken: data.userToken, encryptionKey: data.encryptionKey });
                        await new Promise((resolve, reject) => {
                            sdk.execute(data.challengeId, (error: any, result: any) => {
                                if (error) reject(error);
                                else resolve(result);
                            });
                        });
                    }
                }
            } else {
                throw new Error("No wallet connected. Please connect a wallet or log in with Circle.");
            }

            alert(`Successfully cancelled ${tasksToCancel.length} tasks!`);
        } catch (err: any) {
            console.error(err);
            alert(`Cancellation Failed: ${err.message || err.shortMessage || 'Unknown error'}`);
        } finally {
            setIsReviewing(false);
        }
    };

    useEffect(() => {
        if (pendingReviews.length > 0 && !selectedReview) {
            setSelectedReview(pendingReviews[0]);
        }
    }, [pendingReviews, selectedReview]);

    const handleNavigate = (page: string) => {
        if (page === 'review') setActiveView('review');
        else setActiveView('overview');
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
            <AgencySidebar
                activePage={activeView === 'review' ? 'review' : 'overview'}
                onNavigate={handleNavigate}
                onWalletOpen={() => setIsWalletOpen(true)}
            />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-8 shadow-sm shrink-0">
                    <h1 className="text-xl font-bold text-gray-900">
                        {activeView === 'overview' ? 'Dashboard Overview' : 'Submissions Review (Quality Control)'}
                    </h1>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium hover:bg-gray-50 transition">
                            <Download className="w-4 h-4" /> Export Report
                        </button>
                        <button
                            onClick={() => setIsWalletOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
                        >
                            Wallet
                        </button>
                        <button
                            onClick={() => router.push('/agency/campaign/new')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                        >
                            <Plus className="w-4 h-4" /> New Campaign
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8">

                    {/* VIEW: OVERVIEW */}
                    {activeView === 'overview' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Metrics */}
                            <div className="grid grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Total Spend</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-2">$2,450.00</h3>
                                    <div className="flex items-center mt-2 text-xs text-green-600 font-medium">
                                        <TrendingUp className="w-3 h-3 mr-1" /> +12% this week
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Tasks Completed</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                        {agencyTasks.filter((t: any) => t.status === 2).length}
                                    </h3>
                                    <div className="flex items-center mt-2 text-xs text-green-600 font-medium">
                                        Across all campaigns
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Pending Review</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                        {pendingReviews.length}
                                    </h3>
                                    <div className="flex items-center mt-2 text-xs text-orange-600 font-medium">
                                        Action Required
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Active Workers</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                                        {new Set(agencyTasks.filter(t => t.worker && t.worker !== '0x0000000000000000000000000000000000000000').map(t => t.worker)).size}
                                    </h3>
                                    <div className="flex items-center mt-2 text-xs text-blue-600 font-medium">
                                        Global Pool
                                    </div>
                                </div>
                            </div>

                            {/* Active Campaigns */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                    <h3 className="font-bold text-gray-900">Active Campaigns</h3>
                                    <a href="#" className="text-sm text-blue-600 font-medium hover:underline">View All</a>
                                </div>
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3">Campaign Name</th>
                                            <th className="px-6 py-3">Type</th>
                                            <th className="px-6 py-3">Progress</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {campaigns.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                                                    No active campaigns found. Create your first one to get started.
                                                </td>
                                            </tr>
                                        ) : campaigns.map((camp, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 font-medium text-gray-900">{camp.title}</td>
                                                <td className="px-6 py-4 flex items-center gap-2 text-gray-500">
                                                    <ScanLine className="w-4 h-4" /> {camp.type}
                                                </td>
                                                <td className="px-6 py-4 w-48">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span>{Math.round((camp.completed / camp.count) * 100)}%</span>
                                                        <span className="text-gray-400">{camp.completed} / {camp.count}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${(camp.completed / camp.count) * 100}%` }}></div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">{camp.status}</span></td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleCancelCampaign(camp.title === 'Untitled Campaign' ? '' : camp.title)}
                                                        title="Cancel Campaign"
                                                        className="text-red-400 hover:text-red-600 transition p-1 hover:bg-red-50 rounded"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                    <button className="text-gray-400 hover:text-gray-900 p-1 hover:bg-gray-100 rounded">
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* VIEW: REVIEW */}
                    {activeView === 'review' && (
                        <div className="flex gap-6 h-[calc(100vh-160px)] animate-fade-in">
                            {/* Task List Side */}
                            <div className="w-80 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-700">Pending Review</h3>
                                    <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded text-xs">12</span>
                                </div>
                                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                                    {pendingReviews.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 text-sm">
                                            No tasks pending review.
                                        </div>
                                    ) : pendingReviews.map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() => setSelectedReview(task)}
                                            className={`p-4 hover:bg-gray-50 cursor-pointer transition ${selectedReview?.id === task.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-sm text-gray-900">Task #{task.id}</span>
                                                <span className="text-[10px] text-gray-400">Active</span>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">{task.title}</p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">W</div>
                                                <span className="text-xs text-gray-600 truncate">{task.worker?.substring(0, 10)}...</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Validation Stage */}
                            <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                                {selectedReview ? (
                                    <>
                                        {/* Task Header */}
                                        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-gray-50">
                                            <div className="flex items-center gap-4">
                                                <h3 className="font-bold text-gray-800">Reviewing Task #{selectedReview.id}</h3>
                                                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded font-mono">Status: Submitted</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">Reward:</span>
                                                <span className="text-xs font-bold text-blue-600">${selectedReview.reward} USDC</span>
                                            </div>
                                        </div>

                                        {/* Work Display */}
                                        <div className="flex-1 bg-gray-900 relative flex items-center justify-center p-8 overflow-auto">
                                            <div className="text-white text-center">
                                                <p className="text-sm opacity-50 mb-4 font-mono">SUBMITTED DATA</p>
                                                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-lg text-left">
                                                    <pre className="text-xs text-emerald-400 whitespace-pre-wrap">
                                                        {JSON.stringify(selectedReview.metadata || {}, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Footer */}
                                        <div className="h-20 border-t border-gray-200 bg-white px-8 flex items-center justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">W</div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">Worker</p>
                                                    <p className="text-[10px] text-gray-500 font-mono">{selectedReview.worker}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => handleAgencyAction('reject')}
                                                    disabled={isReviewing}
                                                    className="px-6 py-2 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XIcon className="w-4 h-4" />}
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleAgencyAction('approve')}
                                                    disabled={isReviewing}
                                                    className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition flex items-center gap-2 transform active:scale-95 disabled:opacity-50"
                                                >
                                                    {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                                                    Approve & Pay
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                            <ScanLine className="w-8 h-8 opacity-20" />
                                        </div>
                                        <p>Select a task from the left to start reviewing</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>


                <WalletDashboardModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
            </main >
        </div >
    );
};
