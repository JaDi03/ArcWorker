import React, { useState, useMemo } from 'react';
import {
    DollarSign,
    Clock,
    ShieldCheck,
    Zap,
    Target,
    Type,
    Mic,
    Users,
    ArrowLeft,
    Search,
    Filter,
    Info,
    Database,
    FileText
} from 'lucide-react';
import { WorkerTaskInterface, TaskData, TaskConfig } from './WorkerTaskInterface';
import { useTasks } from '@/hooks/useTasks';
import { useAccount, useWriteContract } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';
import { getSdk } from '@/utils/circle';

// Shared Module Configuration (Mirrors CampaignCreatorModal)
// In a real app, this would be imported from a shared constants file.
const MODULE_INFO: Record<string, { title: string, category: 'vision' | 'nlp' | 'audio' | 'data' }> = {
    'vision-bbox': { title: "Object Detection (Bounding Boxes)", category: 'vision' },
    'vision-class': { title: "Image Classification", category: 'vision' },
    'vision-seg': { title: "Semantic Segmentation", category: 'vision' },
    'nlp-ner': { title: "Named Entity Recognition (NER)", category: 'nlp' },
    'nlp-sentiment': { title: "Sentiment Analysis", category: 'nlp' },
    'nlp-trans': { title: "Translation", category: 'nlp' },
    'audio-transcribe': { title: "Audio Transcription", category: 'audio' },
    'audio-collect': { title: "Speech Collection", category: 'audio' },
    'data-enrich': { title: "Data Enrichment", category: 'data' },
    'survey': { title: "Market Research Survey", category: 'data' }
};

interface TaskOpportunity {
    id: string;
    moduleId: string; // Links to MODULE_INFO keys
    title: string;
    clientName: string;
    description: string;
    rewardPerTask: number;
    timePerTaskSec: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    verification: 'Consensus' | 'Manual' | 'Golden Set' | 'Instant Auto-Pay' | 'Manual Review';
    availableTasks: number;
    tags: string[]; // Extra tags
}

// Mock Data is now only used as a fallback or for development
const MOCK_TASKS: TaskOpportunity[] = [
    {
        id: 'task-101',
        moduleId: 'vision-class',
        title: 'Retail Audit: Cereal Brand Detection',
        clientName: 'ShelfVision AI',
        description: 'Identify brands like Corn Flakes, Cheerios, etc., from supermarket photos.',
        rewardPerTask: 0.15,
        timePerTaskSec: 45,
        difficulty: 'Medium',
        verification: 'Manual Review',
        availableTasks: 1250,
        tags: ['Retail', 'Vision']
    },
    {
        id: 'task-102',
        moduleId: 'nlp-sentiment',
        title: 'Customer Review Sentiment',
        clientName: 'Shopify Partner',
        description: 'Analyze sentiment of reviews for a sustainable fashion brand.',
        rewardPerTask: 0.12,
        timePerTaskSec: 30,
        difficulty: 'Easy',
        verification: 'Consensus',
        availableTasks: 5000,
        tags: ['NLP', 'Fashion']
    },
    {
        id: 'task-103',
        moduleId: 'vision-class',
        title: 'Traffic Signal Classification',
        clientName: 'SafeDriver AI',
        description: 'Classify traffic lights: Red, Green, Yellow, or Off in urban photos.',
        rewardPerTask: 0.05,
        timePerTaskSec: 10,
        difficulty: 'Easy',
        verification: 'Instant Auto-Pay',
        availableTasks: 800,
        tags: ['Autonomous Driving']
    },
    {
        id: 'task-104',
        moduleId: 'nlp-trans',
        title: 'Spanish-English Translation Review',
        clientName: 'ArcTranslate',
        description: 'Verify translation accuracy for technical documentation snippets.',
        rewardPerTask: 0.50,
        timePerTaskSec: 60,
        difficulty: 'Hard',
        verification: 'Manual Review',
        availableTasks: 3200,
        tags: ['Language', 'Hard']
    }
];

export const WorkerTaskFeed: React.FC = () => {
    const { address: userAddress, isConnected } = useAccount();
    const { allTasks: rawTasks, isLoading } = useTasks();
    const [selectedTask, setSelectedTask] = useState<any>(null);

    const availableTasks: TaskOpportunity[] = useMemo(() => {
        if (!rawTasks) {
            return [];
        }

        const now = Math.floor(Date.now() / 1000);
        const currentUserLower = userAddress?.toLowerCase();

        // 1. Identify campaigns (metadataHash) where the current worker has already participated
        const participatedCampaigns = new Set<string>();
        if (currentUserLower) {
            rawTasks.forEach((t: any) => {
                if (t.worker?.toLowerCase() === currentUserLower && t.metadataHash) {
                    participatedCampaigns.add(t.metadataHash);
                }
            });
        }

        // 2. Group available tasks (Created status, currentSubmissions < requiredSubmissions, not expired) by metadataHash
        const groups: Record<string, any[]> = {};
        rawTasks.forEach((t: any) => {
            const isAvailable = (t.status === 0 || t.status === 1) &&
                Number(t.currentSubmissions) < Number(t.requiredSubmissions) &&
                Number(t.deadline) > now &&
                t.metadataHash;

            if (isAvailable) {
                if (!groups[t.metadataHash]) groups[t.metadataHash] = [];
                groups[t.metadataHash].push(t);
            }
        });

        // 3. Transform groups into TaskOpportunities, skipping participated ones
        const opportunities: TaskOpportunity[] = [];

        Object.entries(groups).forEach(([hash, tasksInGroup]) => {
            if (participatedCampaigns.has(hash)) {
                // User already did one task from this campaign, skip entire group
                return;
            }

            const representative = tasksInGroup[0];
            const metadata = representative.metadata || {};

            let verificationLabel = metadata.verification || metadata.verificationStrategy || 'Manual Review';
            if (representative.correctAnswerHash && representative.correctAnswerHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                verificationLabel = 'Instant Auto-Pay';
            } else if (representative.requiredSubmissions > 1) {
                verificationLabel = 'Consensus';
            } else {
                verificationLabel = 'Manual Review';
            }

            opportunities.push({
                id: representative.id.toString(),
                moduleId: metadata.moduleId || 'vision-class',
                title: representative.title,
                clientName: representative.agency?.substring(0, 8) + '...',
                description: representative.description,
                rewardPerTask: parseFloat(representative.reward),
                timePerTaskSec: metadata.timePerTaskSec || 45,
                difficulty: metadata.difficulty || 'Medium',
                verification: verificationLabel,
                availableTasks: tasksInGroup.length,
                tags: metadata.tags || []
            });
        });

        return opportunities;
    }, [rawTasks, userAddress]);

    // Only show mock tasks if there are NO real tasks from the contract at all
    const tasksToShow = (rawTasks && rawTasks.length > 0) ? availableTasks : MOCK_TASKS;

    // Mock Config Generator (This would come from the smart contract metadata in production)
    const getTaskConfig = (moduleId: string): TaskConfig => {
        switch (moduleId) {
            case 'vision-bbox':
                return {
                    instruction: "Draw precise boxes around all visible cereal brand logos.",
                    tools: ['draw', 'select'],
                    classes: [
                        { id: 1, name: 'Corn Flakes', color: '#fbbf24' },
                        { id: 2, name: 'Cheerios', color: '#f97316' }
                    ]
                };
            case 'nlp-sentiment':
                return {
                    instruction: "Read the review and select the most appropriate sentiment label.",
                    hasTranslationInput: true
                };
            default:
                return { instruction: "Follow the prompt to complete the task." };
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const { writeContractAsync: writeSubmit } = useWriteContract();

    const handleSubmission = async (result: any) => {
        if (!selectedTask) return;

        try {
            setIsSubmitting(true);
            const answer = JSON.stringify(result.output);

            if (isConnected) {
                // EOA Flow
                await writeSubmit({
                    address: CONTRACTS.TaskEscrow.address,
                    abi: CONTRACTS.TaskEscrow.abi,
                    functionName: 'submitTask',
                    args: [BigInt(selectedTask.id), answer],
                });
                alert("Task submitted successfully via Wallet!");
                setSelectedTask(null);
                return;
            }

            // Circle Flow
            const circleUser = localStorage.getItem('arc_user');
            const sessionToken = localStorage.getItem('arc_session_token');
            const encryptionKey = localStorage.getItem('arc_encryption_key');

            if (circleUser) {
                const user = JSON.parse(circleUser);
                const userId = user.id || user.userId;

                const res = await fetch('/api/circle/submit-task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        taskId: selectedTask.id,
                        answer,
                        userToken: sessionToken || undefined,
                        encryptionKey: encryptionKey || undefined
                    })
                });

                const data = await res.json();
                if (data.error) throw new Error(data.error);

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

                alert("Task submitted successfully via Circle!");
                setSelectedTask(null);
            } else {
                alert("Please connect a wallet or sign in to submit tasks.");
            }
        } catch (err: any) {
            console.error(err);
            alert(`Submission Failed: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (selectedTask) {
        const metadata = selectedTask.metadata || {};
        const taskData: TaskData = {
            id: selectedTask.id.toString(),
            type: selectedTask.moduleId?.startsWith('vision') ? 'vision' : selectedTask.moduleId?.startsWith('nlp') ? 'nlp' : 'form',
            title: selectedTask.title,
            subtitle: selectedTask.clientName || 'Agency',
            reward: `$${selectedTask.rewardPerTask || selectedTask.reward} USDC`,
            verificationType: selectedTask.verification,
            imageUrl: metadata.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
            textContent: metadata.textContent || "Loading task content..."
        };

        return (
            <WorkerTaskInterface
                task={taskData}
                config={getTaskConfig(selectedTask.moduleId)}
                onExit={() => setSelectedTask(null)}
                onSubmit={handleSubmission}
            />
        );
    }

    // Helper to get difficulty color
    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'Easy': return 'bg-green-100 text-green-700 border-green-200';
            case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Hard': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Helper to get verification badge style
    const getVerificationStyle = (ver: string) => {
        switch (ver) {
            case 'Consensus': return 'text-blue-600 bg-blue-50 border-blue-100 italic';
            case 'Manual Review': return 'text-purple-600 bg-purple-50 border-purple-100';
            case 'Instant Auto-Pay': return 'text-emerald-600 bg-emerald-50 border-emerald-100 font-bold';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    const getModuleIcon = (category: string) => {
        switch (category) {
            case 'vision': return <Target className="w-3 h-3" />;
            case 'nlp': return <Type className="w-3 h-3" />;
            case 'audio': return <Mic className="w-3 h-3" />;
            case 'data': return <Database className="w-3 h-3" />;
            default: return <FileText className="w-3 h-3" />;
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <button className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 mb-2 transition">
                        <ArrowLeft className="w-3 h-3" /> Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Task Market</h1>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition">
                        <Filter className="w-3.5 h-3.5" />
                        Filters
                    </button>
                    <div className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm flex items-center">
                        Balance: $42.50
                    </div>
                </div>
            </div>

            {/* Task Grid - Compact Layout */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-32 bg-gray-100 rounded"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {tasksToShow.map((task) => {
                        const moduleInfo = MODULE_INFO[task.moduleId] || { title: 'Unknown Task', category: 'data' };

                        return (
                            <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden">
                                {/* Thin Left Accent Bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.difficulty === 'Easy' ? 'bg-green-500' :
                                    task.difficulty === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}></div>

                                <div className="flex items-center justify-between ml-3 gap-6">
                                    {/* Main Content Area - Wider */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{task.clientName}</span>
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getVerificationStyle(task.verification)} flex items-center gap-1 shadow-sm`}>
                                                {task.verification === 'Instant Auto-Pay' ? <Zap className="w-2.5 h-2.5 fill-current" /> :
                                                    task.verification === 'Consensus' ? <Users className="w-2.5 h-2.5" /> :
                                                        <Clock className="w-2.5 h-2.5" />}
                                                {task.verification}
                                            </span>
                                        </div>

                                        <div className="flex items-baseline gap-3">
                                            <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{task.title}</h3>
                                            <p className="text-gray-500 text-xs truncate flex-1">{task.description}</p>
                                        </div>

                                        {/* Tags Row - Compact */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDifficultyColor(task.difficulty)}`}>
                                                {task.difficulty}
                                            </span>

                                            {/* Dynamic Module Tag */}
                                            <span className="flex items-center gap-1 text-gray-500 bg-gray-50 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-100">
                                                {getModuleIcon(moduleInfo.category)}
                                                {moduleInfo.title}
                                            </span>

                                            <span className="flex items-center gap-1 text-gray-400 text-[10px]">
                                                <Clock className="w-3 h-3" />
                                                ~{task.timePerTaskSec}s
                                            </span>

                                            <span className="flex items-center gap-1 text-gray-400 text-[10px]">
                                                <Target className="w-3 h-3" />
                                                {task.availableTasks} left
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Side Actions - Horizontal Layout for compact height */}
                                    <div className="flex items-center gap-4 border-l border-gray-100 pl-4">
                                        <div className="text-right min-w-[80px]">
                                            <div className="text-xl font-bold text-gray-900">
                                                <span className="text-sm text-gray-400 font-medium">$</span>{task.rewardPerTask.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] text-gray-400 uppercase">per task</div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button className="h-9 w-9 border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition flex items-center justify-center" title="Details">
                                                <Info className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setSelectedTask(task)}
                                                className="bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition shadow-sm flex items-center justify-center gap-2 h-9"
                                            >
                                                <Zap className="w-3.5 h-3.5" />
                                                Start
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
