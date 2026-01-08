import React from 'react';
import { ArcWorkerIcon, CircleLogo } from './BrandAssets';

interface OnboardingLayoutProps {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    footerContent?: React.ReactNode;
    onClose?: () => void;
    onBack?: () => void;
    step?: number;
    totalSteps?: number;
    illustration?: React.ReactNode;
}

export function OnboardingLayout({ title, subtitle, children, footerContent, onClose, onBack, step, totalSteps, illustration }: OnboardingLayoutProps) {
    return (
        <div className="flex flex-col h-full relative">
            {/* Navigation Controls */}
            {onBack && (
                <button onClick={onBack} className="absolute top-4 left-4 z-20 p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
            )}
            {onClose && (
                <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* 1. Header: Text -> Logo */}
            <div className="flex flex-col items-center justify-center pt-2 md:pt-4 pb-1 md:pb-2 mt-0 md:mt-1">
                {/* Top Text (Black Box area) */}
                {title && (
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center mb-4">
                        {title}
                    </h2>
                )}

                {/* Top Text (Black Box area) */}
                {subtitle && (
                    <p className="text-slate-600 text-sm font-medium text-center px-4 leading-relaxed">
                        {subtitle}
                    </p>
                )}

                {/* Center Hero Image */}
                <div className="mb-1 drop-shadow-xl hover:scale-105 transition-transform duration-300">
                    <ArcWorkerIcon className="w-20 h-20 md:w-28 md:h-28 grayscale opacity-80" />
                </div>

                {/* Bottom subtitle removed to resolve duplication */}
            </div>

            {/* 2. Main Content (Natural growth) */}
            <div className="flex-1 px-4 md:px-8 py-1 md:py-2 min-h-[120px]">
                {children}
            </div>

            {/* 3. Footer (Secured By) */}
            <div className="pt-4 md:pt-6 pb-4 md:pb-6 text-center border-t border-slate-50 mt-4 bg-slate-50/50 rounded-b-[2rem]">
                {footerContent && (
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-100">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                            Secured by
                        </span>
                        <CircleLogo className="h-6 w-auto" />
                    </div>
                )}
            </div>
        </div>
    );
}

// Input Field Component for consistency
interface MinimalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    rightElement?: React.ReactNode;
}

export function MinimalInput({ label, rightElement, ...props }: MinimalInputProps) {
    return (
        <div className="space-y-1">
            {label && <label className="text-sm font-semibold text-slate-500 ml-1">{label}</label>}
            <div className="relative group">
                <input
                    className={`w-full h-14 px-4 ${rightElement ? 'pr-12' : ''} bg-slate-50 border-2 border-slate-100 rounded-xl text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#005ddb] focus:ring-4 focus:ring-[#005ddb]/10 transition-all text-center`}
                    {...props}
                />
                {rightElement && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none">
                        {rightElement}
                    </div>
                )}
            </div>
        </div>
    );
}

// Primary Button for consistency
export function PrimaryButton({ children, isLoading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }) {
    return (
        <button
            className={`w-full h-14 bg-[#005ddb] hover:bg-[#004bb3] text-white rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-md disabled:opacity-70 disabled:cursor-not-allowed`}
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
