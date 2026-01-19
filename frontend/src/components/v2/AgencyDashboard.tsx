import React, { useState, useMemo, useEffect } from 'react';
import { Download, Plus, TrendingUp, ScanLine, MoreHorizontal, Check, X as XIcon, Type, Loader2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AgencySidebar } from './AgencySidebar';
import { AgencySettings } from './AgencySettings';
import { AgencyWorkforce } from './AgencyWorkforce';
import { TaskAnswerViewer } from './TaskAnswerViewer';
import WalletDashboardModal from '../WalletDashboardModal';
import { useTasks } from '@/hooks/useTasks';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';
import { getSdk } from '@/utils/circle';
import { ensureCircleSession } from '@/utils/circleSession';

export const AgencyDashboard: React.FC = () => {
    const router = useRouter();
    const { address: userAddress, isConnected } = useAccount();
    const [circleAddress, setCircleAddress] = useState<string | undefined>();

    // Reset Circle state on account switch
    useEffect(() => {
        setCircleAddress(undefined);
    }, [userAddress, isConnected]);

    // Get Circle wallet address if logged in
    useEffect(() => {
        const fetchCircleAddress = async () => {
            const circleUser = localStorage.getItem('arc_user');
            const sessionToken = localStorage.getItem('arc_session_token');

            if (circleUser && sessionToken) {
                try {
                    let currentToken = sessionToken;
                    let res = await fetch('/api/circle/wallet', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userToken: currentToken })
                    });

                    // Handle Session Expired (401)
                    if (res.status === 401) {
                        try {
                            const parsed = JSON.parse(circleUser);
                            const userId = parsed.id || parsed.userId || circleUser;
                            const session = await ensureCircleSession(userId);
                            if (session) {
                                currentToken = session.userToken;
                                res = await fetch('/api/circle/wallet', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userToken: currentToken })
                                });
                            }
                        } catch (e) { }
                    }

                    const data = await res.json();
                    if (data.address) {
                        setCircleAddress(data.address);
                        localStorage.setItem('arc_wallet_address', data.address);
                    }
                } catch (e) {
                    console.error('Error fetching Circle wallet address:', e);
                }
            } else {
                setCircleAddress(undefined);
            }
        };

        fetchCircleAddress();
    }, [userAddress, isConnected]);

    // Soporte para múltiples direcciones (MetaMask + Circle)
    const combinedAddresses = useMemo(() => {
        const addrs: string[] = [];
        if (userAddress) addrs.push(userAddress);
        if (circleAddress) addrs.push(circleAddress);
        return addrs;
    }, [userAddress, circleAddress]);

    const { tasks: agencyTasks, isLoading, refetch, allTasksCount, readError, actualContractCount } = useTasks(combinedAddresses);
    const [activeView, setActiveView] = useState<'overview' | 'review' | 'settings' | 'workforce'>('overview');
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
    const [isWalletOpen, setIsWalletOpen] = useState(false);

    // Group tasks by NORMALIZED TITLE to merge batches
    const campaigns = useMemo(() => {
        const groups: Record<string, {
            key: string,
            title: string,
            count: number,
            completed: number,
            cancelled: number,
            needsReview: number,
            totalSubmissions: number,
            currentSubmissions: number,
            reward: string,
            type: string,
            status: string,
            metadata: any
        }> = {};

        agencyTasks.forEach((t: any) => {
            // NORMALIZE: Merge "Demo ", "Demo", and "demo" into one key
            const cleanTitle = (t.title && t.title !== 'Unknown') ? t.title.trim() : null;
            // Group by Title + MetadataHash to keep separate deployments distinct
            const groupKey = cleanTitle ? `${cleanTitle.toLowerCase()}-${t.metadataHash || 'raw'}` : `Task-${t.id}`;
            const key = groupKey;

            if (!groups[key]) {
                groups[key] = {
                    key: key,
                    title: cleanTitle || t.title || 'Untitled Campaign', // Use clean title as display
                    count: 0,
                    completed: 0,
                    cancelled: 0,
                    needsReview: 0,
                    totalSubmissions: 0,
                    currentSubmissions: 0,
                    reward: t.reward,
                    type: t.metadata?.moduleId || t.metadata?.mod || 'Task',
                    status: 'Active',
                    metadata: t.metadata
                };
            }

            groups[key].count++;
            groups[key].totalSubmissions += (t.requiredSubmissions || 1);
            groups[key].currentSubmissions += (t.currentSubmissions || 0);

            const s = Number(t.status || 0); // Usar el status que ya viene corregido de useTasks
            if (s === 1) groups[key].needsReview++;
            if (s === 2 || s === 3) groups[key].completed++;
            if (s === 4) groups[key].cancelled++;
        });

        // Determine actual status based on precise counters
        Object.values(groups).forEach((g) => {
            const processed = g.completed + g.cancelled + g.needsReview;

            if (g.count === 0) {
                g.status = 'Created';
            } else if (g.cancelled > g.count / 2) {
                // Si más del 50% están canceladas, mostrar Cancelled
                g.status = 'Cancelled';
            } else if (g.cancelled > 0 && g.cancelled === g.count) {
                // Si TODAS están canceladas
                g.status = 'Cancelled';
            } else if (g.completed === g.count) {
                g.status = 'Completed';
            } else if (g.needsReview > 0) {
                g.status = 'Reviewing';
            } else if (processed > 0 || g.currentSubmissions > 0) {
                g.status = 'Active';
            } else {
                g.status = 'Active';
            }
        });

        return Object.values(groups);
    }, [agencyTasks]);

    // Calculate Total Spend (Committed Funds for non-cancelled tasks)
    const totalSpend = useMemo(() => {
        return agencyTasks.reduce((acc: number, t: any) => {
            // Only count if not cancelled (Status 4 is Cancelled)
            if (t.status !== 4) {
                const reward = parseFloat(t.reward || '0');
                const submissions = Number(t.requiredSubmissions || 1);
                return acc + (reward * submissions);
            }
            return acc;
        }, 0);
    }, [agencyTasks]);

    // Pending reviews (Status 1)
    const pendingReviews = useMemo(() => {
        return agencyTasks.filter((t: any) => t.status === 1);
    }, [agencyTasks]);

    const [selectedReview, setSelectedReview] = useState<any>(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const { writeContractAsync: writeAgencyAction, data: actionHash } = useWriteContract();

    // NEW: Wait for transaction on-chain confirmation
    const { isLoading: isActionConfirming, isSuccess: isActionConfirmed } = useWaitForTransactionReceipt({
        hash: actionHash
    });

    // Handle auto-refetch when transaction is confirmed
    useEffect(() => {
        if (isActionConfirmed) {
            console.log("[AgencyDashboard] Action confirmed on-chain, refetching tasks...");
            refetch();
            setSelectedReview(null);
            setIsReviewing(false);
        }
    }, [isActionConfirmed]);

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
                // Note: isActionConfirmed useEffect handles refetch and cleanup
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
                refetch();
                setSelectedReview(null);
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
            if (!isConnected) setIsReviewing(false);
        }

    };

    const handleCancelCampaign = async (campaignTitle: string, campaignMetadataHash?: string) => {
        const titleForDisplay = campaignTitle || 'Untitled Campaign';
        if (!window.confirm(`Are you sure you want to cancel all "Created" tasks in "${titleForDisplay}"? This will refund the deposit to your Savings.`)) return;

        setIsReviewing(true);
        try {
            // Find all tasks with this campaign that are in status 0 (Created)
            const tasksToCancel = agencyTasks.filter((t: any) => {
                if (t.status !== 0) return false; // Must be Created status

                // Match by metadataHash if available
                if (campaignMetadataHash && t.metadataHash && t.metadataHash === campaignMetadataHash) return true;
                // Fallback: match by normalized title
                const taskTitle = t.title?.trim()?.toLowerCase();
                const targetTitle = campaignTitle?.trim()?.toLowerCase();
                if (taskTitle && targetTitle && taskTitle === targetTitle) return true;
                // Handle "Untitled Campaign" case
                if (!t.title && campaignTitle === 'Untitled Campaign') return true;
                return false;
            });

            if (tasksToCancel.length === 0) {
                alert("No cancelable tasks found in this campaign (they might be submitted or completed).");
                return;
            }

            // Check if using wagmi connector (MetaMask, etc.) or Circle wallet
            if (isConnected && userAddress) {
                // Use wagmi for connected wallets - Batch call
                const taskIds = tasksToCancel.map(t => BigInt(t.id));
                await writeAgencyAction({
                    address: CONTRACTS.TaskEscrow.address,
                    abi: CONTRACTS.TaskEscrow.abi,
                    functionName: 'cancelTasksBatch',
                    args: [taskIds],
                });
                // isActionConfirmed handles cleanup
            } else if (circleAddress) {
                // Use Circle API for Circle wallets - Batch call
                const circleUser = localStorage.getItem('arc_user');
                const sessionToken = localStorage.getItem('arc_session_token');
                if (!circleUser) throw new Error("Please log in to cancel tasks");

                const user = JSON.parse(circleUser);
                const userId = user.id || user.userId;
                const taskIds = tasksToCancel.map(t => Number(t.id));

                console.log(`[Dashboard] Requesting BATCH cancellation for ${taskIds.length} tasks...`);

                const res = await fetch('/api/circle/cancel-task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        taskId: taskIds, // Send as array for batching
                        userToken: sessionToken || undefined
                    })
                });

                const data = await res.json();
                if (data.error) throw new Error(data.message || data.error);

                if (data.challengeId) {
                    const sdk = getSdk();
                    if (!sdk) throw new Error("Circle SDK not initialized");
                    sdk.setAppSettings({ appId: data.appId });
                    sdk.setAuthentication({ userToken: data.userToken, encryptionKey: data.encryptionKey });

                    console.log("[Dashboard] Executing Circle Batch Challenge...");
                    await new Promise((resolve, reject) => {
                        sdk.execute(data.challengeId, (error: any, result: any) => {
                            if (error) reject(error);
                            else resolve(result);
                        });
                    });
                }
            } else {
                throw new Error("No wallet connected. Please connect a wallet or log in with Circle.");
            }

            alert(`Successfully cancelled ${tasksToCancel.length} tasks!`);
            refetch();
        } catch (err: any) {
            console.error(err);
            alert(`Cancellation Failed: ${err.message || err.shortMessage || 'Unknown error'}`);
        } finally {
            if (!isConnected) setIsReviewing(false);
        }

    };

    useEffect(() => {
        if (pendingReviews.length > 0 && !selectedReview) {
            setSelectedReview(pendingReviews[0]);
        }
    }, [pendingReviews, selectedReview]);

    const handleNavigate = (page: string) => {
        if (page === 'review') setActiveView('review');
        else if (page === 'settings') setActiveView('settings');
        else if (page === 'workforce') setActiveView('workforce');
        else setActiveView('overview');
    };

    if (activeView === 'settings') {
        return (
            <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
                <AgencySettings onNavigate={handleNavigate} onWalletOpen={() => setIsWalletOpen(true)} />
                <WalletDashboardModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
            </div>
        );
    }

    if (activeView === 'workforce') {
        return (
            <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
                {/* Note: AgencyWorkforce currently has its own Sidebar instance. 
                    In a future refactor, we should hoist the Sidebar to a layout component 
                    to avoid re-mounting it when switching views. For now, this works. */}
                <AgencyWorkforce onNavigate={handleNavigate} />
            </div>
        );
    }



    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
            <AgencySidebar
                activePage={activeView}
                onNavigate={handleNavigate}
                onWalletOpen={() => setIsWalletOpen(true)}
                reviewCount={pendingReviews.length}
            />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-8 shadow-sm shrink-0">
                    <h1 className="text-xl font-bold text-gray-900">
                        {activeView === 'review' ? 'Submissions Review (Quality Control)' : 'Dashboard Overview'}
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
                                    <h3 className="text-2xl font-bold text-gray-900 mt-2">${totalSpend.toFixed(2)}</h3>
                                    <div className="flex items-center mt-2 text-xs text-green-600 font-medium">
                                        <TrendingUp className="w-3 h-3 mr-1" /> Lifetime
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
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${camp.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                        camp.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-green-100 text-green-700'
                                                        }`}>
                                                        {camp.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleCancelCampaign(camp.title === 'Untitled Campaign' ? '' : camp.title)}
                                                        title="Cancel Campaign"
                                                        className="text-red-400 hover:text-red-600 transition p-1 hover:bg-red-50 rounded"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedCampaign(camp)}
                                                        className="text-gray-400 hover:text-gray-900 p-1 hover:bg-gray-100 rounded"
                                                    >
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

                    {/* Campaign Detail Modal */}
                    {selectedCampaign && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{selectedCampaign.title}</h3>
                                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-widest mt-1">Campaign Details</p>
                                    </div>
                                    <button onClick={() => setSelectedCampaign(null)} className="p-2 hover:bg-gray-200 rounded-full transition">
                                        <XCircle className="w-6 h-6 text-gray-400" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <p className="text-xs text-blue-600 font-bold uppercase mb-1">Total Tasks</p>
                                            <p className="text-2xl font-black text-blue-900">{selectedCampaign.count}</p>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                            <p className="text-xs text-green-600 font-bold uppercase mb-1">Reward/Task</p>
                                            <p className="text-2xl font-black text-green-900">${parseFloat(selectedCampaign.reward).toString()} <span className="text-xs font-normal">USDC</span></p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Instructions for Workers</h4>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm italic text-gray-700 leading-relaxed shadow-sm">
                                            {selectedCampaign.metadata?.desc || selectedCampaign.description || "No specific instructions provided."}
                                        </div>
                                    </div>

                                    {selectedCampaign.metadata?.options && Array.isArray(selectedCampaign.metadata.options) && selectedCampaign.metadata.options.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Options (Classes)</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedCampaign.metadata.options.map((opt: string, i: number) => (
                                                    <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 shadow-sm">
                                                        {opt}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedCampaign.metadata?.content && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Dataset / Content</h4>
                                            <div className="p-3 bg-gray-900 rounded-lg text-blue-400 font-mono text-xs break-all border border-gray-800">
                                                {selectedCampaign.metadata.content}
                                            </div>
                                        </div>
                                    )}

                                    {/* NEW: Explicit Task ID List for Debugging/Management */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Campaign Tasks (IDs)</h4>
                                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                                            {(() => {
                                                // More robust matching: use metadataHash first, then title
                                                const campaignHash = selectedCampaign.metadata?.metadataHash;
                                                const campaignTitle = selectedCampaign.title;

                                                const matchingTasks = agencyTasks.filter((t: any) => {
                                                    // Match by metadataHash if available
                                                    if (campaignHash && t.metadataHash && t.metadataHash === campaignHash) return true;
                                                    // Fallback: match by normalized title
                                                    const taskTitle = t.title?.trim()?.toLowerCase();
                                                    const targetTitle = campaignTitle?.trim()?.toLowerCase();
                                                    if (taskTitle && targetTitle && taskTitle === targetTitle) return true;
                                                    // Handle "Untitled Campaign" case
                                                    if (!t.title && campaignTitle === 'Untitled Campaign') return true;
                                                    return false;
                                                });

                                                if (matchingTasks.length === 0) {
                                                    return <span className="text-gray-400 text-xs italic">No tasks found for this campaign</span>;
                                                }

                                                return matchingTasks
                                                    .sort((a: any, b: any) => Number(b.id) - Number(a.id))
                                                    .map((t: any) => (
                                                        <div
                                                            key={t.id}
                                                            title={`Status: ${t.status === 0 ? 'Open' : t.status === 1 ? 'Submitted' : t.status === 4 ? 'Cancelled' : 'Closed'}`}
                                                            className={`px-2 py-1 rounded text-xs font-mono border flex items-center gap-1 cursor-help
                                                                ${t.status === 0 ? 'bg-green-50 text-green-700 border-green-200' :
                                                                    t.status === 1 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                        t.status === 4 ? 'bg-red-50 text-red-400 border-red-100 line-through' :
                                                                            'bg-gray-50 text-gray-500 border-gray-200'}
                                                            `}
                                                        >
                                                            #{t.id}
                                                        </div>
                                                    ));
                                            })()}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div className="text-xs text-gray-400">
                                            <p>Agency: <span className="font-mono">{selectedCampaign.agency?.slice(0, 10) || 'Unknown'}...</span></p>
                                            <p>Status: <span className="font-bold text-green-600">{selectedCampaign.status || 'Active'}</span></p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                handleCancelCampaign(selectedCampaign.title, selectedCampaign.metadata?.metadataHash);
                                                setSelectedCampaign(null);
                                            }}
                                            className="px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-lg hover:bg-red-100 transition"
                                        >
                                            Cancel Campaign
                                        </button>
                                    </div>
                                </div>
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
                                    <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded text-xs">{pendingReviews.length}</span>
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
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${task.status === 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                    {task.status === 1 ? 'Submitted' : 'Active'}
                                                </span>
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
                                        <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden relative">
                                            {/* Context / Instructions Panel */}
                                            <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm z-10 flex-shrink-0 max-h-48 overflow-y-auto">
                                                <div className="flex justify-between items-start gap-8">
                                                    <div className="flex-1">
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                            Instructions
                                                        </h4>
                                                        <p className="text-sm text-gray-700 leading-relaxed max-w-prose">
                                                            {selectedReview.metadata?.desc || selectedReview.description || "No specific instructions provided for this task."}
                                                        </p>
                                                    </div>

                                                    {/* Show valid tags if it's an NER task */}
                                                    {selectedReview.metadata?.options && Array.isArray(selectedReview.metadata.options) && (
                                                        <div className="max-w-xs text-right">
                                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">Valid Tags</h4>
                                                            <div className="flex flex-wrap justify-end gap-1.5">
                                                                {selectedReview.metadata.options.map((opt: string, i: number) => (
                                                                    <span key={i} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-600">
                                                                        {opt}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actual Output Viewer */}
                                            <div className="flex-1 bg-gray-900 relative flex items-center justify-center p-8 overflow-auto">
                                                <TaskAnswerViewer
                                                    task={selectedReview}
                                                />
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
