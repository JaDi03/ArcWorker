import React, { useState, useMemo, useEffect } from 'react';
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
import { useRouter, useSearchParams } from 'next/navigation';
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
    'image-classification': { title: "Image Classification", category: 'vision' }, // Sync from Creator
    'object-verification': { title: "Object Verification", category: 'vision' },   // Sync from Creator
    'nlp-ner': { title: "Named Entity Recognition (NER)", category: 'nlp' },
    'nlp-sentiment': { title: "Sentiment Analysis", category: 'nlp' },
    'nlp-trans': { title: "Translation", category: 'nlp' },
    'text-classification': { title: "Text Classification", category: 'nlp' },      // Sync from Creator
    'language-detection': { title: "Language Detection", category: 'nlp' },        // Sync from Creator
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
    metadata?: any; // Full metadata for dynamic config
    groupKey?: string; // Unique identifier for the campaign group
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
        tags: ['NLP', 'Fashion'],
        metadata: {
            options: ['Positive', 'Neutral', 'Negative'],
            desc: 'Analyze sentiment of reviews for a sustainable fashion brand.'
        }
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

interface WorkerTaskFeedProps {
    onBack: () => void;
}

export const WorkerTaskFeed: React.FC<WorkerTaskFeedProps> = ({ onBack }) => {
    const { address: userAddress, isConnected } = useAccount();
    const { allTasks: rawTasks, isLoading, refetch, markAsParticipated } = useTasks(undefined, userAddress);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    // Local blacklist for immediate feedback, persisted to localStorage to prevent regression on reload
    const [recentlySubmitted, setRecentlySubmitted] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('arc_submitted_tasks');
            if (saved) return new Set(JSON.parse(saved));
        }
        return new Set();
    });

    // Persist changes to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const cacheValue = JSON.stringify(Array.from(recentlySubmitted));
            localStorage.setItem('arc_submitted_tasks', cacheValue);
            console.log('[Worker Feed] 💾 Saved to localStorage:', cacheValue.substring(0, 200) + '...');
        }
    }, [recentlySubmitted]);

    // URL Synchronization Helper
    const router = useRouter();
    const searchParams = useSearchParams();

    const updateUrl = (taskId: string | number | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (taskId) {
            params.set('taskId', taskId.toString());
        } else {
            params.delete('taskId');
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const availableTasks: TaskOpportunity[] = useMemo(() => {
        if (!rawTasks) {
            return [];
        }

        const now = Math.floor(Date.now() / 1000);
        const currentUserLower = userAddress?.toLowerCase();

        // Helper to determine unique campaign identifier - MODIFIED TO BE MORE ROBUST
        const getGroupKey = (t: any) => {
            // Priority 0: Explicit campaign ID if we adds it later
            if (t.campaignId) return t.campaignId.toString();

            // Priority 1: Cleaned Title + Agency (Most stable)
            const cleanTitle = (t.title || 'Untitled').trim().toLowerCase();
            const agency = (t.agency || 'Unknown').toLowerCase();

            if (cleanTitle !== 'unknown' && cleanTitle !== 'untitled') {
                return `campaign-${cleanTitle}-${agency}`;
            }

            // Priority 2: metadataHash if it's a real hash or long enough JSON
            if (t.metadataHash && t.metadataHash.length > 5) {
                // Return first 100 chars to avoid huge keys but maintain uniqueness
                return `hash-${t.metadataHash.substring(0, 100)}`;
            }

            return `single-${t.id}`; // Fallback: Individual task
        };

        // 1. Identify campaigns where the current worker has already participated
        const participatedGroups = new Set<string>();

        if (currentUserLower) {
            rawTasks.forEach((t: any) => {
                const groupKey = getGroupKey(t);
                const idStr = t.id.toString();

                // Check if User Participated (RPC) OR Locally Submitted (Cache)
                const isParticipated = t.hasParticipated ||
                    recentlySubmitted.has(idStr) ||
                    recentlySubmitted.has(groupKey) || // NEW: Campaign-level block
                    (t.metadataHash && recentlySubmitted.has(t.metadataHash));

                if (isParticipated) {
                    participatedGroups.add(groupKey);
                }
            });
        }

        // 2. Group available tasks by GroupKey
        const groups: Record<string, any[]> = {};

        rawTasks.forEach((t: any) => {
            const groupKey = getGroupKey(t);

            const isAvailable = (t.status === 0 || t.status === 1) &&
                Number(t.currentSubmissions) < Number(t.requiredSubmissions) &&
                Number(t.deadline) > now &&
                !recentlySubmitted.has(t.id.toString()) &&
                !recentlySubmitted.has(groupKey) &&
                !t.hasParticipated;

            if (isAvailable) {
                if (!groups[groupKey]) groups[groupKey] = [];
                groups[groupKey].push(t);
            }
        });

        // 3. Transform groups into TaskOpportunities, skipping participated ones
        const opportunities: TaskOpportunity[] = [];

        Object.entries(groups).forEach(([groupKey, tasksInGroup]) => {
            // CRITICAL: Prevent double dipping
            // If user has done ANY task in this group (Campaign), they cannot see ANY other tasks in this group.
            if (participatedGroups.has(groupKey)) {
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

            const moduleId = metadata.tmpl || metadata.moduleId || metadata.mod || 'vision-class';
            const category = MODULE_INFO[moduleId]?.category || 'vision';

            opportunities.push({
                id: representative.id.toString(),
                moduleId: moduleId,
                title: metadata.title || representative.title || "Untreated Task",
                clientName: representative.agency?.substring(0, 8) + '...',
                description: metadata.desc || representative.description || "No description provided.",
                rewardPerTask: parseFloat(representative.reward),
                timePerTaskSec: metadata.timePerTaskSec || 45,
                difficulty: metadata.diff || metadata.difficulty || 'Medium',
                verification: verificationLabel,
                availableTasks: tasksInGroup.length, // Shows how many tasks are in this campaign
                tags: metadata.tags || [category.toUpperCase()],
                metadata: { ...metadata, metadataHash: representative.metadataHash },
                groupKey: groupKey // Add this
            });
        });

        return opportunities;
    }, [rawTasks, userAddress, recentlySubmitted]);

    // Only show mock tasks if there are NO real tasks from the contract at all
    const tasksToShow = (rawTasks && rawTasks.length > 0) ? availableTasks : MOCK_TASKS;

    // Dynamic Config Generator based on task metadata
    const getTaskConfig = (task: any): TaskConfig => {
        const metadata = task.metadata || {};
        const moduleId = metadata.tmpl || metadata.moduleId || metadata.mod || 'vision-class';
        const instruction = metadata.desc || "Follow the prompt to complete the task.";

        // Map options from metadata to classes format
        const options: string[] = Array.isArray(metadata.options) ? metadata.options : [];
        const classes = options.map((opt, i) => ({
            id: opt, // Use name as ID for easier answer matching
            name: opt,
            color: `hsl(${(i * 137) % 360}, 70%, 50%)` // Stable random colors
        }));

        switch (moduleId) {
            case 'vision-bbox':
                return {
                    instruction,
                    tools: ['draw', 'select'],
                    classes: classes.length > 0 ? classes : [
                        { id: 1, name: 'Object A', color: '#fbbf24' },
                        { id: 2, name: 'Object B', color: '#f97316' }
                    ]
                };
            case 'vision-seg':
                return {
                    instruction,
                    tools: ['poly', 'select'],
                    classes: classes
                };
            case 'nlp-ner':
                return {
                    instruction,
                    entityTags: metadata.entityTags || ['Person', 'Organization', 'Location'], // Fallback defaults
                    classes: [] // No classification classes for NER
                };
            case 'image-classification':
            case 'vision-class':
            case 'object-verification':
                return {
                    instruction,
                    classes: classes
                };
            case 'text-classification':
            case 'nlp-sentiment':
            case 'language-detection':
                // Provide default options if none exist for common types
                const nlpClasses = classes.length > 0 ? classes : (
                    moduleId === 'nlp-sentiment' ? [
                        { id: 'Positive', name: 'Positive', color: '#10b981' },
                        { id: 'Neutral', name: 'Neutral', color: '#6b7280' },
                        { id: 'Negative', name: 'Negative', color: '#ef4444' }
                    ] : []
                );
                return {
                    instruction,
                    classes: nlpClasses,
                    hasTranslationInput: moduleId === 'nlp-trans' || moduleId === 'language-detection'
                };
            default:
                return {
                    instruction,
                    classes: classes
                };
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const { writeContractAsync: writeSubmit } = useWriteContract();

    const handleSubmission = async (result: any) => {
        if (!selectedTask) return;

        try {
            setIsSubmitting(true);

            // Extract the most relevant answer string for on-chain verification
            const answer = result.output.classification || result.output.text || (result.output.ner ? JSON.stringify(result.output.ner) : "") || "";

            console.log(`[Worker Feed] Submitting answer: "${answer}" for Task #${selectedTask.id}`);

            // Helper to trigger verification
            const triggerAutoVerify = async (id: string) => {
                try {
                    console.log(`[Worker Feed] Triggering auto-verification for task ${id}...`);
                    const res = await fetch('/api/tasks/auto-verify', {
                        method: 'POST',
                        body: JSON.stringify({ taskId: id })
                    });
                    const d = await res.json();
                    if (d.success) {
                        alert(`Auto-verification Success: ${d.message}`);
                    } else {
                        alert(`Auto-verification Failed: ${d.error}`);
                    }
                } catch (e: any) {
                    console.error("Auto-verify trigger failed:", e);
                    alert(`Auto-verification Error: ${e.message}`);
                }
            };

            if (isConnected) {
                // EOA Flow
                await writeSubmit({
                    address: CONTRACTS.TaskEscrow.address,
                    abi: CONTRACTS.TaskEscrow.abi,
                    functionName: 'submitTask',
                    args: [BigInt(selectedTask.id), answer],
                });
                alert("Task submitted successfully via Wallet!");

                // Trigger Verification (Only for Auto/Consensus)
                if (selectedTask.verification !== 'Manual Review') {
                    triggerAutoVerify(selectedTask.id);
                }

                // Optimistic Update
                setRecentlySubmitted(prev => {
                    const next = new Set(prev);
                    next.add(selectedTask.id);
                    if (selectedTask.groupKey) {
                        next.add(selectedTask.groupKey);
                        console.log(`[Worker Feed] ✅ EOA: Blocked campaign group: "${selectedTask.groupKey}"`);
                    }
                    if (selectedTask.metadata?.metadataHash) next.add(selectedTask.metadata.metadataHash);
                    console.log(`[Worker Feed] 🚫 Task #${selectedTask.id} marked as participated`);
                    console.log(`[Worker Feed] 📋 Cache now contains ${next.size} entries:`, Array.from(next).slice(0, 5));
                    return next;
                });
                markAsParticipated(selectedTask.id); // Force persistent removal
                refetch(); // Trigger background refresh

                setSelectedTask(null);
                updateUrl(null);
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

                // Trigger Verification (Only for Auto/Consensus)
                // NOW SAFE: The SDK has confirmed execution!
                if (selectedTask.verification !== 'Manual Review') {
                    triggerAutoVerify(selectedTask.id);
                }

                // Optimistic Update
                setRecentlySubmitted(prev => {
                    const next = new Set(prev);
                    next.add(selectedTask.id);
                    if (selectedTask.groupKey) next.add(selectedTask.groupKey);
                    if (selectedTask.metadata?.metadataHash) next.add(selectedTask.metadata.metadataHash);
                    console.log(`[Worker Feed] Marking participated (Circle): ID=${selectedTask.id}, Group=${selectedTask.groupKey}`);
                    return next;
                });
                markAsParticipated(selectedTask.id); // Force persistent removal
                refetch(); // Trigger background refresh

                setSelectedTask(null);
                updateUrl(null);
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
        const isVision = selectedTask.moduleId?.includes('vision') || selectedTask.moduleId?.includes('image') || selectedTask.moduleId?.includes('object');
        const isNLP = selectedTask.moduleId?.includes('nlp') || selectedTask.moduleId?.includes('text') || selectedTask.moduleId?.includes('language');

        const taskData: TaskData = {
            id: selectedTask.id.toString(),
            type: isVision ? 'vision' : isNLP ? 'nlp' : 'form',
            title: selectedTask.title,
            subtitle: selectedTask.clientName || 'Agency',
            reward: `$${selectedTask.rewardPerTask || selectedTask.reward} USDC`,
            verificationType: selectedTask.verification,
            imageUrl: metadata.content || metadata.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
            textContent: metadata.content || metadata.textContent || "Loading task content...",
            formData: metadata.questions || metadata.formData
        };

        return (
            <WorkerTaskInterface
                task={taskData}
                config={getTaskConfig(selectedTask)}
                onExit={() => {
                    setSelectedTask(null);
                    updateUrl(null);
                }}
                onSubmit={(res) => {
                    handleSubmission(res);
                    updateUrl(null);
                }}
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
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 mb-2 transition"
                    >
                        <ArrowLeft className="w-3 h-3" /> Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 flex gap-2 items-center">
                        Task Market
                        <span className="text-xs font-normal text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">{tasksToShow.length} active</span>
                    </h1>
                </div>
                <div className="flex gap-3 items-center">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                        />
                    </div>

                    <button
                        onClick={onBack}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
                        title="Close Market"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
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
                        const isExpanded = expandedTaskId === task.id;

                        return (
                            <div key={task.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all group overflow-hidden ${isExpanded ? 'ring-2 ring-blue-500/20' : ''}`}>

                                <div className="p-3 relative">
                                    {/* Thin Left Accent Bar */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.difficulty === 'Easy' ? 'bg-green-500' :
                                        task.difficulty === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}></div>

                                    <div className="flex items-center justify-between ml-3 gap-6">
                                        {/* Main Content Area - Wider */}
                                        <div className="flex-1 min-w-0" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{task.clientName}</span>
                                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getVerificationStyle(task.verification)} flex items-center gap-1 shadow-sm`}>
                                                    {task.verification === 'Instant Auto-Pay' ? <Zap className="w-2.5 h-2.5 fill-current" /> :
                                                        task.verification === 'Consensus' ? <Users className="w-2.5 h-2.5" /> :
                                                            <Clock className="w-2.5 h-2.5" />}
                                                    {task.verification}
                                                </span>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{task.title}</h3>
                                                {!isExpanded && <p className="text-gray-500 text-xs leading-relaxed truncate">{task.description}</p>}
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
                                                <button
                                                    className={`h-9 w-9 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition flex items-center justify-center ${isExpanded ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white'}`}
                                                    title="Details"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedTaskId(isExpanded ? null : task.id);
                                                    }}
                                                >
                                                    <Info className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTask(task);
                                                        updateUrl(task.id);
                                                    }}
                                                    className="bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition shadow-sm flex items-center justify-center gap-2 h-9"
                                                >
                                                    <Zap className="w-3.5 h-3.5" />
                                                    Start
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details Section */}
                                {isExpanded && (
                                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 ml-1">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Full Description</p>
                                                <p className="text-sm text-gray-700 leading-relaxed mb-3">{task.description}</p>

                                                <div className="flex gap-2 flex-wrap">
                                                    {task.tags?.map((tag: string, i: number) => (
                                                        <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] text-gray-500 font-mono">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
