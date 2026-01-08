import React, { useEffect, useState } from 'react';
import { ArcWorker } from '../index';

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

interface ReputationCardProps {
    address: string;
    variant?: 'full' | 'compact';
    showHistory?: boolean;
}

interface ScoreData {
    total: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
    internal: number;
    external: number;
}

// ----------------------------------------------------------------------
// HELPER: TIER LOGIC (Brand Aligned)
// ----------------------------------------------------------------------

const getTierColor = (tier: string) => {
    switch (tier) {
        case 'Diamond': return 'text-[#005ddb] bg-blue-50 border-blue-100';
        case 'Gold': return 'text-amber-600 bg-amber-50 border-amber-100';
        case 'Silver': return 'text-slate-600 bg-slate-100 border-slate-200';
        default: return 'text-orange-600 bg-orange-50 border-orange-100'; // Bronze
    }
};

const getTierLabel = (tier: string) => {
    switch (tier) {
        case 'Diamond': return 'Diamond Member';
        case 'Gold': return 'Gold Member';
        case 'Silver': return 'Silver Member';
        default: return 'Bronze Member';
    }
}

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export function ReputationCard({ address, variant = 'full', showHistory = true }: ReputationCardProps) {
    const [score, setScore] = useState<ScoreData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const sdk = new ArcWorker({ appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || 'demo' });

        const fetchScore = async () => {
            setLoading(true);
            try {
                const data = await sdk.reputation.getScore(address);

                // Determine Tier based on Total Score
                let tier: ScoreData['tier'] = 'Bronze';
                if (data.total >= 90) tier = 'Diamond';
                else if (data.total >= 75) tier = 'Gold';
                else if (data.total >= 50) tier = 'Silver';

                setScore({
                    total: data.total,
                    internal: data.internal.score,
                    external: data.external.defiScore,
                    tier
                });
            } catch (err) {
                console.error("Failed to load reputation", err);
            } finally {
                setLoading(false);
            }
        };

        if (address) fetchScore();
    }, [address]);

    if (loading) {
        return (
            <div className="w-full h-40 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />
        );
    }

    if (!score) return null;

    return (
        <div className={`relative overflow-hidden bg-white border-2 border-slate-100 rounded-2xl font-sans antialiased shadow-sm hover:shadow-md transition-all duration-300 group`}>

            {/* Top Brand Stripe */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#005ddb]" />

            <div className="p-5">
                {/* Header: Identity */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        {/* Avatar Placeholder */}
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-lg">
                            👤
                        </div>
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                                Verified User
                            </h4>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-800 font-mono">
                                    {address.slice(0, 6)}...{address.slice(-4)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tier Badge (Pill Style) */}
                    <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${getTierColor(score.tier)}`}>
                        {getTierLabel(score.tier)}
                    </div>
                </div>

                {/* Main Score Display (Minimalist) */}
                <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-black text-[#005ddb] tracking-tight">
                        {score.total}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">
                        / 100
                    </span>
                    <span className="ml-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                        Excellent
                    </span>
                </div>

                {/* Metrics Grid (Subtle) */}
                {variant === 'full' && (
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Work Reputation</span>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#005ddb]"></span>
                                <span className="text-xs font-bold text-slate-700">{score.internal} pts</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">DeFi History</span>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                <span className="text-xs font-bold text-slate-700">{score.external} pts</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Powered By */}
            <div className="bg-slate-50 px-5 py-2 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-1.5 opacity-60 grayscale group-hover:grayscale-0 transition-all">
                    <img src="/assets/branding/arcworker-icon.png" alt="Arc" className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        Powered by ArcWorker
                    </span>
                </div>
                <span className="text-[9px] font-medium text-slate-400">
                    Last updated: Just now
                </span>
            </div>
        </div>
    );
}
