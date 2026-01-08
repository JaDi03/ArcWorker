'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACTS } from '../utils/contracts';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import {
    X,
    ChevronLeft,
    Upload,
    Info,
    MessageSquare,
    Globe,
    Image as ImageIcon,
    ShieldCheck,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

// Helper to get SDK instance (or create if missing)
function getSdk() {
    if (typeof window === 'undefined') return null;
    if (!window.__circle_sdk_instance) {
        const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '';
        window.__circle_sdk_instance = new W3SSdk({
            appSettings: { appId }
        });
    }
    return window.__circle_sdk_instance;
}

interface CampaignData {
    title: string;
    description: string;
    template: 'text-classification' | 'language-detection' | 'image-classification' | 'object-verification';
    reward: string;
    quantity: number;
    taskContent: string; // The text to classify or Image URL
    options: string;     // Comma separated options
    days: number;
    hours: number;
    minutes: number;
    verification: 'manual' | 'auto';
    correctAnswer: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

interface CreateCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CampaignData) => void;
}

export function CreateCampaignModal({ isOpen, onClose, onSubmit }: CreateCampaignModalProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<CampaignData>({
        title: '',
        description: '',
        template: 'text-classification',
        reward: '0.01',
        quantity: 10,
        taskContent: '',
        options: '',
        days: 0,
        hours: 1,
        minutes: 0,
        verification: 'manual',
        correctAnswer: '',
        difficulty: 'EASY'
    });
    const [isUploading, setIsUploading] = useState(false);
    const [isCircleLoading, setIsCircleLoading] = useState(false);

    // Wagmi hooks
    const { isConnected } = useAccount();
    const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    useEffect(() => {
        if (isSuccess) {
            setStep(4); // Move to success step instead of alert
        }
        if (writeError) {
            console.error("Write Error", writeError);
        }
    }, [isSuccess, writeError]);

    // Set default options when template changes
    useEffect(() => {
        let defaultOptions = '';
        switch (formData.template) {
            case 'text-classification':
                defaultOptions = 'Positive, Neutral, Negative';
                break;
            case 'language-detection':
                defaultOptions = 'Spanish, English, French, Portuguese, Other';
                break;
            case 'image-classification':
                defaultOptions = 'Food, People, Animals, Text, None';
                break;
            case 'object-verification':
                defaultOptions = 'Yes, No';
                break;
        }
        setFormData(prev => ({
            ...prev,
            options: defaultOptions
        }));
    }, [formData.template]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = async (file: File) => {
        if (!file) return;

        setIsUploading(true);
        const data = new FormData();
        data.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: data
            });
            const result = await res.json();
            if (result.url) {
                setFormData(prev => ({ ...prev, taskContent: result.url }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    const calculateTotal = () => {
        const subtotal = (parseFloat(formData.reward) || 0) * (formData.quantity || 0);
        const fee = subtotal * 0.05; // 5% fee
        return (subtotal + fee).toFixed(4);
    };

    const handleViaCircle = async (userId: string | undefined, userToken: string | undefined, totalValue: string, totalSeconds: number, metadata: string) => {
        try {
            setIsCircleLoading(true);
            const args = [
                parseEther(formData.reward).toString(), // Reward in Wei
                formData.quantity.toString(),        // Multi-task Batch Support
                totalSeconds.toString(),
                metadata
            ];

            const res = await fetch('/api/circle/create-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userToken, args, amount: totalValue })
            });

            const data = await res.json();
            if (!data.challengeId) throw new Error(data.message || data.error || "Circle Error");

            const sdk = getSdk();
            if (!sdk) throw new Error("Circle SDK not initialized");

            sdk.setAppSettings({ appId: data.appId });
            const authPayload: any = { userToken: data.userToken };
            if (data.encryptionKey) {
                authPayload.encryptionKey = data.encryptionKey;
            } else {
                const localKey = localStorage.getItem('arc_encryption_key');
                if (localKey) authPayload.encryptionKey = localKey;
            }
            sdk.setAuthentication(authPayload);

            await new Promise((resolve, reject) => {
                sdk.execute(data.challengeId, (error: any, result: any) => {
                    if (error) reject(error);
                    else resolve(result);
                });
            });

            setIsCircleLoading(false);
            setStep(4);

        } catch (error: any) {
            setIsCircleLoading(false);
            alert(`Circle Transaction Failed: ${error.message}`);
        }
    };

    const handleFundAndPublish = async () => {
        const totalSeconds = (formData.days || 0) * 86400 + (formData.hours || 0) * 3600 + (formData.minutes || 0) * 60;
        const totalValue = calculateTotal();
        const metadata = JSON.stringify({
            title: formData.title,
            desc: formData.description,
            tmpl: formData.template,
            content: formData.taskContent,
            options: formData.options.split(',').map(o => o.trim()),
            verification: formData.verification,
            correctAnswer: formData.correctAnswer,
            difficulty: formData.difficulty
        });

        if (isConnected) {
            writeContract({
                address: CONTRACTS.TaskEscrow.address,
                abi: CONTRACTS.TaskEscrow.abi,
                functionName: 'createTasksBatch',
                args: [parseEther(formData.reward), BigInt(formData.quantity || 1), BigInt(totalSeconds), metadata],
                value: parseEther(totalValue)
            });
            return;
        }

        const circleUser = localStorage.getItem('arc_user');
        const sessionToken = localStorage.getItem('arc_session_token');

        if (circleUser) {
            try {
                const user = JSON.parse(circleUser);
                const userId = user.id || user.userId;
                const encryptionKey = localStorage.getItem('arc_encryption_key');

                if (sessionToken && encryptionKey) {
                    await handleViaCircle(userId, sessionToken, totalValue, totalSeconds, metadata);
                    return;
                }
                if (userId && !userId.includes('@')) {
                    await handleViaCircle(userId, undefined, totalValue, totalSeconds, metadata);
                    return;
                }
                alert("Security session expired. Please log out and back in once.");
            } catch (e) {
                console.error(e);
            }
        }
    };

    const categories = [
        { id: 'text-classification', label: 'Sentiment Analysis', icon: <MessageSquare className="w-8 h-8" /> },
        { id: 'language-detection', label: 'Language Detection', icon: <Globe className="w-8 h-8" /> },
        { id: 'image-classification', label: 'Image Classification', icon: <ImageIcon className="w-8 h-8" /> },
        { id: 'object-verification', label: 'Object Verification', icon: <ShieldCheck className="w-8 h-8" /> },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-5 duration-300">

                {/* --- HEADER --- */}
                <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
                            Create New Campaign
                        </h2>
                        {step < 4 && (
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
                                Step {step} of 3 • {step === 1 ? 'Category Selection' : formData.template.replace('-', ' ')}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors p-2 hover:bg-slate-50 rounded-full">
                        <X className="w-7 h-7" />
                    </button>
                </div>

                {/* --- CONTENT --- */}
                <div className="p-10 overflow-y-auto flex-1 text-left">

                    {/* LOADING STATE */}
                    {(isPending || isConfirming || isCircleLoading) ? (
                        <div className="flex flex-col items-center justify-center h-full py-16 space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
                                <div className="w-20 h-20 border-4 border-[#005ddb] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-black text-slate-900">Deploying Campaign...</p>
                                <p className="text-slate-400 font-medium mt-1 uppercase tracking-widest text-[11px]">Writing to Arc Network</p>
                            </div>
                            <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 flex items-center gap-3 mx-auto">
                                <Info className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-bold text-blue-700">{calculateTotal()} USDC Security Deposit</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* STEP 1: CATEGORY SELECTION */}
                            {step === 1 && (
                                <div className="space-y-8">
                                    <h3 className="text-xl font-bold text-slate-800">1. Select Project Category</h3>
                                    <div className="grid grid-cols-2 gap-5">
                                        {categories.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setFormData(prev => ({ ...prev, template: cat.id as any }))}
                                                className={`p-6 rounded-3xl border-2 text-left transition-all group ${formData.template === cat.id
                                                        ? 'border-[#005ddb] bg-blue-50/30'
                                                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-colors ${formData.template === cat.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                                                    }`}>
                                                    {cat.icon}
                                                </div>
                                                <p className={`font-black text-lg leading-tight mb-2 ${formData.template === cat.id ? 'text-[#005ddb]' : 'text-slate-800'}`}>
                                                    {cat.label}
                                                </p>
                                                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                                                    Standard crowd task with automated or review-based settlement.
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: CAMPAIGN DETAILS (1:1 with Screenshot) */}
                            {step === 2 && (
                                <div className="space-y-10 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                                        <Info className="w-4 h-4" />
                                        2. Define Project Details
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                                        {/* Left Column */}
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Campaign Title</label>
                                                <input
                                                    name="title"
                                                    value={formData.title}
                                                    onChange={handleChange}
                                                    placeholder="Ex: Sentiment Analysis - Q4"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 px-5 text-slate-900 font-bold focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-300"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Short Description</label>
                                                <input
                                                    name="description"
                                                    value={formData.description}
                                                    onChange={handleChange}
                                                    placeholder="Overview of the task"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 px-5 text-slate-900 font-bold focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-300"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Required Skills / Difficulty</label>
                                                <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl border-2 border-slate-100/50 min-h-[58px]">
                                                    {['EASY', 'MEDIUM', 'HARD'].map(d => (
                                                        <button
                                                            key={d}
                                                            type="button"
                                                            onClick={() => setFormData(p => ({ ...p, difficulty: d as any }))}
                                                            className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${formData.difficulty === d ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            {d}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column */}
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Detailed Instructions</label>
                                                <textarea
                                                    placeholder="Steps for the workers..."
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-32 p-5 text-slate-900 font-bold focus:border-blue-500 focus:outline-none transition-all resize-none placeholder:text-slate-300"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Dataset or Image URL</label>
                                                    <div className="relative group cursor-pointer overflow-hidden rounded-2xl">
                                                        <input
                                                            name="taskContent"
                                                            value={formData.taskContent}
                                                            onChange={handleChange}
                                                            placeholder="URL"
                                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 pl-12 pr-5 text-slate-900 font-bold group-hover:border-slate-200 transition-all focus:outline-none"
                                                        />
                                                        <Upload className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                                        <input
                                                            type="file"
                                                            onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Class Labels</label>
                                                    <input
                                                        name="options"
                                                        value={formData.options}
                                                        onChange={handleChange}
                                                        placeholder="Labels (e.g. Pos, Neg)"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 px-5 text-slate-900 font-bold focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-300"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Verification Toggle */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Verification Method</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setFormData(p => ({ ...p, verification: 'manual' }))}
                                                className={`p-6 rounded-3xl border-2 flex items-start text-left gap-4 transition-all ${formData.verification === 'manual' ? 'border-[#005ddb] bg-blue-50/30' : 'border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <div className={`w-6 h-6 rounded-full border-4 flex-shrink-0 mt-1 ${formData.verification === 'manual' ? 'border-[#005ddb]' : 'border-slate-200'}`} />
                                                <div>
                                                    <p className={`font-black mb-1 ${formData.verification === 'manual' ? 'text-[#005ddb]' : 'text-slate-400'}`}>REVIEW</p>
                                                    <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                                                        Manually approve submissions before releasing payment.
                                                    </p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setFormData(p => ({ ...p, verification: 'auto' }))}
                                                className={`p-6 rounded-3xl border-2 flex items-start text-left gap-4 transition-all ${formData.verification === 'auto' ? 'border-[#005ddb] bg-blue-50/30' : 'border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <div className={`w-6 h-6 rounded-full border-4 flex-shrink-0 mt-1 ${formData.verification === 'auto' ? 'border-[#005ddb]' : 'border-slate-200'}`} />
                                                <div>
                                                    <p className={`font-black mb-1 ${formData.verification === 'auto' ? 'text-[#005ddb]' : 'text-slate-400'}`}>INSTANT</p>
                                                    <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                                                        Algorithm automatically validates and pays correctly.
                                                    </p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Reward & Quantity */}
                                    <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-50">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none text-left block">Reward per Task (USDC)</label>
                                            <div className="relative">
                                                <input
                                                    name="reward"
                                                    value={formData.reward}
                                                    onChange={handleChange}
                                                    placeholder="0.00"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 px-5 text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs uppercase tracking-widest">USDC</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-left block">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none text-left block">Task Quantity</label>
                                            <input
                                                name="quantity"
                                                type="number"
                                                value={formData.quantity}
                                                onChange={handleChange}
                                                placeholder="1"
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 px-5 text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: SUMMARY */}
                            {step === 3 && (
                                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                                    <div className="bg-[#005ddb] p-10 rounded-[2rem] text-white shadow-xl shadow-blue-100 flex flex-col items-center">
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Total Deposit Estimate</p>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-5xl font-black">{calculateTotal()}</h3>
                                            <span className="text-xl font-bold opacity-80 uppercase tracking-widest font-mono">USDC</span>
                                        </div>
                                        <div className="mt-8 pt-8 border-t border-white/10 space-y-4 w-full">
                                            <div className="flex justify-between text-sm font-bold opacity-70">
                                                <span>Work Rewards ({formData.quantity} tasks)</span>
                                                <span>{(parseFloat(formData.reward) * formData.quantity).toFixed(4)} USDC</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-bold opacity-70">
                                                <span>Platform Security Fee (5%)</span>
                                                <span>{(parseFloat(formData.reward) * formData.quantity * 0.05).toFixed(4)} USDC</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Campaign</p>
                                            <p className="font-bold text-slate-900">{formData.title || 'Untitled'}</p>
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Verification</p>
                                            <p className="font-bold text-slate-900 uppercase">{formData.verification}</p>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4 mx-auto text-left">
                                        <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-900 font-bold leading-relaxed">
                                            Funds will be locked in the secure Arc Protocol Escrow. You only pay for tasks that meet your verification criteria.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: SUCCESS */}
                            {step === 4 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-8 animate-in zoom-in-95 duration-700">
                                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Campaign Published!</h3>
                                        <p className="text-slate-400 font-bold max-w-xs mx-auto leading-relaxed uppercase tracking-widest text-[11px]">
                                            Your project is now live on the ArcWorker network.
                                        </p>
                                    </div>

                                    {hash && (
                                        <a
                                            href={`https://explorer.arcworker.io/tx/${hash}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-500 font-mono text-xs hover:underline bg-blue-50 px-4 py-2 rounded-lg"
                                        >
                                            TX: {hash.slice(0, 16)}...
                                        </a>
                                    )}

                                    <button
                                        onClick={onClose}
                                        className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-800 transition-all"
                                    >
                                        Go to Dashboard
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                </div>

                {/* --- FOOTER --- */}
                {!isPending && !isConfirming && !isCircleLoading && step < 4 && (
                    <div className="px-10 py-8 border-t border-slate-100 bg-white flex justify-between items-center">
                        <button
                            onClick={() => step === 1 ? onClose() : setStep(step - 1)}
                            className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-colors"
                        >
                            {step > 1 && <ChevronLeft className="w-5 h-5" />}
                            {step === 1 ? 'Cancel' : 'Back'}
                        </button>
                        <button
                            onClick={() => step === 3 ? handleFundAndPublish() : setStep(step + 1)}
                            className="px-12 py-5 bg-[#005ddb] text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-600 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:translate-y-0"
                            disabled={step === 2 && !formData.title}
                        >
                            {step === 3 ? 'Fund and Publish' : 'Continue'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
