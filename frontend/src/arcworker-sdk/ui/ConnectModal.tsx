import React, { useState } from 'react';
import { ArcWorker } from '../index'; // Adjust path as needed

// ----------------------------------------------------------------------
// ASSETS & ICONS (Inlined for Portability)
// ----------------------------------------------------------------------

const ArcWorkerIcon = ({ className }: { className?: string }) => (
    <img src="/assets/branding/arcworker-icon.png" alt="ArcWorker" className={className} />
);

const ArcWorkerFull = ({ className }: { className?: string }) => (
    <img src="/assets/branding/arcworker-full.png" alt="ArcWorker" className={className} />
);

// Mimic BrandAssets.tsx: CircleLogo
const CircleLogo = ({ className }: { className?: string }) => (
    <img
        src="/assets/branding/circle-logo-text.png"
        alt="Circle"
        className={`${className}`}
        style={{ width: '140px', height: 'auto', objectFit: 'contain' }}
    />
);


// ----------------------------------------------------------------------
// UI COMPONENTS (Copied from OnboardingLayout.tsx)
// ----------------------------------------------------------------------

function MinimalInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#005ddb] focus:ring-4 focus:ring-[#005ddb]/10 transition-all text-center"
            {...props}
        />
    );
}

function PrimaryButton({ children, isLoading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }) {
    return (
        <button
            className={`w-full h-14 bg-[#005ddb] hover:bg-[#004bb3] text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-md disabled:opacity-70 disabled:cursor-not-allowed`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                </>
            ) : children}
        </button>
    );
}

interface OnboardingLayoutProps {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    footerContent?: React.ReactNode;
    onClose?: () => void;
}

function OnboardingLayout({ title, subtitle, children, footerContent, onClose }: OnboardingLayoutProps) {
    return (
        <div className="flex flex-col h-full relative">
            {onClose && (
                <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* 1. Header: Text -> Logo */}
            <div className="flex flex-col items-center justify-center pt-8 pb-4 mt-2">
                {/* Header Branding (Custom for SDK) */}
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                    CONNECT WITH
                </p>

                {/* Center Hero Image 
                   UserSetupModal uses ArcWorkerIcon (w-40 h-40).
                   User earlier said large full logo was good. 
                   I'll stick to ArcWorkerFull w-52 opacity-90 grayscale for consistency with the last "good" check on that specific logo.
                */}
                <div className="mb-4 drop-shadow-xl hover:scale-105 transition-transform duration-300">
                    <ArcWorkerFull className="w-52 h-auto opacity-90 grayscale" />
                </div>
            </div>

            {/* 2. Main Content */}
            <div className="flex-1 px-8 py-2 overflow-y-auto no-scrollbar min-h-[120px]">
                {children}
            </div>

            {/* 3. Footer (Secured By) */}
            <div className="pt-6 pb-6 text-center border-t border-slate-50 mt-4 bg-slate-50/50 rounded-b-[2rem]">
                {footerContent && (
                    <div className="flex flex-col items-center justify-center space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-0.5">
                            SECURED BY
                        </span>
                        {/* Match BrandAssets default size */}
                        <CircleLogo className="h-8 w-auto" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

interface ConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (address: string) => void;
}

export function ConnectModal({ isOpen, onClose, onSuccess }: ConnectModalProps) {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<'input' | 'processing' | 'done'>('input');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email) return;
        setStep('processing');
        setError(null);

        try {
            // Use the SDK instance
            const sdk = new ArcWorker({
                appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || 'your-app-id'
            });

            // Destructure the address from the response object
            const { address } = await sdk.auth.loginWithEmail(email);

            setStep('done');
            setTimeout(() => {
                onSuccess(address); // Now passing string correctly
                onClose();
            }, 1000); // Slight delay to show success
        } catch (err: any) {
            console.error("SDK Login Failed:", err);
            setError(err.message || 'Connection failed.');
            setStep('input');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[2rem] shadow-xl w-full max-w-[420px] overflow-hidden relative border-2 border-slate-200 min-h-[200px] h-auto flex flex-col antialiased transform-gpu transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: 'Inter, sans-serif' }} // Ensure font consistency
            >
                <OnboardingLayout
                    title="" // Replaced by internal "CONNECT WITH"
                    subtitle=""
                    footerContent={true}
                    onClose={onClose}
                >
                    <div className="space-y-4 mt-2">
                        {/* Error Feedback */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <div>
                            <MinimalInput
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={step === 'processing'}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                autoFocus
                            />
                        </div>

                        <PrimaryButton onClick={handleLogin} isLoading={step === 'processing'}>
                            Continue with Email
                        </PrimaryButton>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-slate-400 font-medium">or continue with</span>
                            </div>
                        </div>

                        {/* Metamask Button - Wired Up */}
                        <button
                            type="button"
                            onClick={() => {
                                if ((window as any).ethereum) {
                                    (window as any).ethereum.request({ method: 'eth_requestAccounts' })
                                        .then((accounts: string[]) => {
                                            if (accounts[0]) onSuccess(accounts[0]);
                                        })
                                        .catch((err: any) => console.error(err));
                                } else {
                                    window.open('https://metamask.io', '_blank');
                                }
                            }}
                            className="w-full h-14 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-all flex items-center justify-center gap-3"
                        >
                            <img
                                src="/assets/branding/metamask-fox.png"
                                alt="MetaMask"
                                style={{ width: '180px', height: 'auto', objectFit: 'contain' }}
                            />
                        </button>
                    </div>
                </OnboardingLayout>
            </div>
        </div>
    );
}

// ... internal OnboardingLayout updates for footer spacing ...
