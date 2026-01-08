'use client';

import React from 'react';
import { useArcWorkerWallet } from '@/arcworker-sdk/wallet';
import { OnboardingLayout, PrimaryButton } from './ui/OnboardingLayout';

interface PinSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (address: string) => void;
    userId: string; // REQUIRED: The developer's own user ID
}

export function PinSetupModal({ isOpen, onClose, onComplete, userId }: PinSetupModalProps) {
    const { setupPinOnlyWallet, isLoading, statusMessage, error } = useArcWorkerWallet();

    const handleStartPinFlow = async () => {
        try {
            console.log("Starting PIN-Only Setup for UserID:", userId);
            const address = await setupPinOnlyWallet(userId);
            if (address) {
                onComplete(address);
                onClose();
            }
        } catch (err) {
            console.error("PIN Setup Failed:", err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[420px] overflow-hidden relative border border-slate-100 min-h-[400px] flex flex-col">

                <OnboardingLayout
                    title="Security Check"
                    subtitle="Create your 6-digit PIN to secure your wallet."
                    footerContent={true}
                >
                    <div className="flex flex-col items-center justify-center space-y-8 pt-4">

                        {/* Error Display */}
                        {error && (
                            <div className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-xs text-red-600 font-bold flex items-center justify-center space-x-2 animate-shake">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Status Message */}
                        {isLoading ? (
                            <div className="text-center space-y-4 py-4 w-full bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                <div className="text-sm font-bold text-blue-900 animate-pulse uppercase tracking-wider">
                                    {statusMessage || "Initializing..."}
                                </div>
                                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                    Do not close this window
                                </div>
                            </div>
                        ) : (
                            <div className="w-full space-y-3">
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                    <div className="text-4xl mb-2">🛡️</div>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                        Your PIN is the only key to your funds. ArcWorker cannot recover it for you.
                                    </p>
                                </div>

                                <PrimaryButton onClick={handleStartPinFlow}>
                                    Create PIN Now
                                </PrimaryButton>

                                <button
                                    onClick={onClose}
                                    className="w-full py-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                    </div>
                </OnboardingLayout>

            </div>
        </div>
    );
}
