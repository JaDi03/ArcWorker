import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ArcWorker } from '../index';

// ----------------------------------------------------------------------
// TYPES & INTERFACES
// ----------------------------------------------------------------------

interface Task {
    id: string;
    title: string;
    reward: string;
    type: string; // Maps to Category Label
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface TaskFeedProps {
    tag?: string; // Filter by tag (e.g., "AI", "Marketing")
    limit?: number;
    showHeader?: boolean;
    compact?: boolean;
    onTaskClick?: (task: Task) => void;
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------

const DifficultyBadge = ({ level }: { level: Task['difficulty'] }) => {
    const colors = {
        Easy: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        Medium: 'bg-amber-50 text-amber-600 border-amber-100',
        Hard: 'bg-red-50 text-red-600 border-red-100',
    };
    return (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${colors[level]}`}>
            {level}
        </span>
    );
};

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export function TaskFeed({ tag, limit = 5, showHeader = true, compact = false, onTaskClick }: TaskFeedProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRep, setUserRep] = useState<number>(0);
    const { address, isConnected } = useAccount();

    useEffect(() => {
        // Initialize SDK purely to access public methods
        const sdk = new ArcWorker({ appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || 'demo' });

        const initData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Tasks (Mock for now, but aligned with new schema)
                // In a real scenario, this would parse 'metadata' JSON from the contract events
                const data = await sdk.escrow.getTasks({ limit, tag });

                // transform mock data to match new categories if needed, for now MOCK_TASKS in escrow.ts details this
                // But we will override here for UI Demo purposes if sdk returns old mock
                // Let's assume SDK returns what we want or we post-process.
                // Actually, let's just use the SDK data, but SDK mock data needs update.
                // For this focused implementation, I will override the task list LOCALLY here 
                // to ensure it matches the user requirements immediately without touching SDK file yet.
                const DEMO_TASKS: Task[] = [
                    { id: '1', title: 'Train AI Model: Annotate Street Scenes', reward: '0.50', type: 'AI Training', difficulty: 'Easy' },
                    { id: '2', title: 'Voice Recording: "Hey Arc" Command', reward: '1.20', type: 'Audio & Voice', difficulty: 'Easy' },
                    { id: '3', title: 'Validate Business Leads (Batch #402)', reward: '5.00', type: 'Data Processing', difficulty: 'Medium' },
                    { id: '4', title: 'UX Review: DeFi Swap Flow', reward: '15.00', type: 'UX Testing', difficulty: 'Hard' },
                    { id: '5', title: 'Moderate Community Comments', reward: '0.10', type: 'Moderation', difficulty: 'Easy' },
                    { id: '6', title: 'Competitor Analysis: Q1 2026', reward: '25.00', type: 'Market Research', difficulty: 'Hard' },
                ];

                let filtered = DEMO_TASKS;
                if (tag) filtered = filtered.filter(t => t.type.includes(tag) || t.difficulty === tag); // allowances for filtering
                if (limit) filtered = filtered.slice(0, limit);

                setTasks(filtered);

                // 2. Fetch User Reputation
                if (address) {
                    const score = await sdk.reputation.getScore(address);
                    setUserRep(score.internal.score); // Use internal work score
                }

            } catch (err) {
                console.error("Failed to load task feed", err);
            } finally {
                setLoading(false);
            }
        };

        if (isConnected) {
            initData();
        } else {
            // Load tasks anyway for "Window Shopping"
            const DEMO_TASKS: Task[] = [
                { id: '1', title: 'Train AI Model: Annotate Street Scenes', reward: '0.50', type: 'AI Training', difficulty: 'Easy' },
                { id: '2', title: 'Voice Recording: "Hey Arc" Command', reward: '1.20', type: 'Audio & Voice', difficulty: 'Easy' },
                { id: '3', title: 'Validate Business Leads (Batch #402)', reward: '5.00', type: 'Data Processing', difficulty: 'Medium' },
                { id: '4', title: 'UX Review: DeFi Swap Flow', reward: '15.00', type: 'UX Testing', difficulty: 'Hard' },
            ];
            setTasks(DEMO_TASKS);
            setLoading(false);
        }
    }, [tag, limit, address, isConnected]);

    const isLocked = (difficulty: Task['difficulty']) => {
        if (!isConnected) return true; // Lock all if not connected (encourage login)
        // Easy: 0, Medium: 100, Hard: 500
        if (difficulty === 'Hard' && userRep < 500) return true;
        if (difficulty === 'Medium' && userRep < 100) return true;
        return false;
    };

    if (loading) {
        return (
            <div className={`w-full ${compact ? 'p-2' : 'p-4'} space-y-3 animate-pulse`}>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-slate-50 rounded-xl border border-slate-100"></div>
                ))}
            </div>
        );
    }

    return (
        <div className={`w-full bg-white rounded-2xl border border-slate-200 overflow-hidden font-sans antialiased shadow-sm`}>
            {/* Header (Optional) */}
            {showHeader && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        {/* Small ArcWorker Logo Branding */}
                        <img src="/assets/branding/arcworker-icon.png" alt="ArcWorker" className="w-5 h-5 rounded-sm" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {tag ? `${tag} Gigs` : 'Available Gigs'}
                        </span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">
                        Powered by ArcWorker Protocol
                    </span>
                </div>
            )}

            {/* List */}
            <div className="divide-y divide-slate-100">
                {tasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No tasks available currently.
                    </div>
                ) : (
                    tasks.map((task) => {
                        const locked = isLocked(task.difficulty);
                        return (
                            <div
                                key={task.id}
                                onClick={() => !locked && onTaskClick?.(task)}
                                className={`group relative flex items-center justify-between transition-all ${compact ? 'p-3' : 'p-5'} 
                                    ${locked ? 'bg-slate-50 opacity-75 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`}
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-bold text-sm leading-tight ${locked ? 'text-slate-500' : 'text-slate-800 group-hover:text-[#005ddb] transition-colors'}`}>
                                            {task.title}
                                        </h4>
                                        {locked && (
                                            <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                            {task.type}
                                        </span>
                                        <DifficultyBadge level={task.difficulty} />
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <span className={`font-bold text-sm ${locked ? 'text-slate-400' : 'text-[#005ddb]'}`}>
                                        ${task.reward} USDC
                                    </span>
                                    {locked ? (
                                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                            {task.difficulty === 'Medium' ? '100+ Rep' : task.difficulty === 'Hard' ? '500+ Rep' : 'Log In'}
                                        </span>
                                    ) : (
                                        <button className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-slate-200 rounded px-2 py-1 group-hover:bg-[#005ddb] group-hover:text-white group-hover:border-[#005ddb] transition-all">
                                            Apply
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer / CTA */}
            {!compact && (
                <div className="bg-slate-50 px-4 py-3 text-center border-t border-slate-100">
                    <a href="/protocol/tasks" className="text-xs font-bold text-slate-500 hover:text-[#005ddb] transition-colors flex items-center justify-center gap-1">
                        View all tasks on Protocol
                        <span className="text-lg leading-none">→</span>
                    </a>
                </div>
            )}
        </div>
    );
}
