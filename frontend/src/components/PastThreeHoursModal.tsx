'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACTS } from '../utils/contracts';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

// Helper to get SDK instance (or create if missing)
function getSdk() {
    if (typeof window === 'undefined') return null;
    if (!window.__circle_sdk_instance) {
        // We assume app ID is available via env or fetched
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
    // Specific Task Data
    taskContent: string; // The text to classify or Image URL
    options: string;     // Comma separated options
    days: number;
    hours: number;
    minutes: number;
    // Verification
    verification: 'manual' | 'auto';
    correctAnswer: string;
}

interface CreateCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CampaignData) => void;
}

export function PastThreeHoursModal({ isOpen, onClose, onSubmit }: CreateCampaignModalProps) {
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
        correctAnswer: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [isCircleLoading, setIsCircleLoading] = useState(false);

    // Wagmi hooks
    const { isConnected } = useAccount();
    const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    useEffect(() => {
        if (isSuccess) {
            alert("Campaign Created Successfully on Chain!");
            onSubmit(formData);
            onClose();
            setStep(1); // Reset
        }
        if (writeError) {
            console.error("Write Error", writeError);
            alert("Transaction failed: " + writeError.message);
        }
    }, [isSuccess, writeError]); // Removed onSubmit, onClose, formData to prevent unnecessary triggers during typing if parent re-renders

    // Set default options when template changes
    useEffect(() => {
        let defaultOptions = '';
        let defaultTitle = '';
        let defaultDesc = '';

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
            } else {
                alert("Upload failed: " + (result.error || "Unknown error"));
            }
        } catch (err) {
            console.error(err);
            alert("Error uploading file.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const calculateTotal = () => {
        const subtotal = (parseFloat(formData.reward) || 0) * (formData.quantity || 0);
        const fee = subtotal * 0.05; // 5% de comisi├│n
        return (subtotal + fee).toFixed(4);
    };



    // ... (CreateCampaignModal definition)


    const handleViaCircle = async (userId: string | undefined, userToken: string | undefined, totalValue: string, totalSeconds: number, metadata: string) => {
        try {
            setIsCircleLoading(true);
            if (userId) console.log("[Circle] User session identified");

            // Prepare Args for Contract (Wei for reward)
            const args = [
                parseEther(formData.reward).toString(), // Reward in Wei
                totalSeconds.toString(),
                metadata
            ];

            // Call API to create transaction
            const res = await fetch('/api/circle/create-campaign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    userToken, // Pass token if connected via Email/Social
                    args,
                    amount: Number(totalValue).toString() // Remove trailing zeros for API compatibility (e.g. "1.05")
                })
            });

            const data = await res.json();

            if (!data.challengeId) throw new Error("No challenge ID returned");

            // Execute Challenge via SDK
            const sdk = getSdk();
            if (!sdk) throw new Error("Circle SDK not initialized");

            sdk.setAppSettings({ appId: data.appId });

            // CRITICAL FIX: Only set authentication if we have it. 
            // If encryptionKey is missing (reusing session), we assume SDK already has it or we shouldn't overwrite.
            const authPayload: any = { userToken: data.userToken };
            if (data.encryptionKey) {
                authPayload.encryptionKey = data.encryptionKey;
            } else {
                const localKey = localStorage.getItem('arc_encryption_key');
                if (localKey) {
                    authPayload.encryptionKey = localKey;
                }
            }
            sdk.setAuthentication(authPayload);

            await new Promise((resolve, reject) => {
                sdk.execute(data.challengeId, (error: any, result: any) => {
                    if (error) {
                        console.error("Circle Challenge Error:", error);
                        reject(error);
                    } else {
                        console.log("Circle Challenge One-Time Success:", result);
                        resolve(result);
                    }
                });
            });

            setIsCircleLoading(false);
            alert("Campaign Created Successfully via Circle Wallet! ­ƒƒó");
            onSubmit(formData);
            onClose();
            setStep(1);

        } catch (error: any) {
            setIsCircleLoading(false);
            console.error("Circle Execution Failed:", error);
            // Alert the user to check console for details if it's a specific API error
            alert(`Circle Transaction Failed: ${error.message}\n(Check console for 'DEBUG: Circle API Error Payload' details)`);
        }
    };

    const handleFundAndPublish = async () => {
        const totalSeconds = (formData.days || 0) * 86400 + (formData.hours || 0) * 3600 + (formData.minutes || 0) * 60;

        if (totalSeconds < 60) {
            alert("Minimum duration is 1 minute.");
            return;
        }

        const totalValue = calculateTotal();

        // Metadata contains all the specific task config
        const metadata = JSON.stringify({
            title: formData.title,
            desc: formData.description,
            tmpl: formData.template,
            content: formData.taskContent,
            options: formData.options.split(',').map(o => o.trim()),
            verification: formData.verification,
            correctAnswer: formData.correctAnswer
        });

        // CHECK 1: Functionality for Wagmi (External Wallet)
        if (isConnected) {
            try {
                writeContract({
                    address: CONTRACTS.TaskEscrow.address,
                    abi: CONTRACTS.TaskEscrow.abi,
                    functionName: 'createTask',
                    args: [
                        parseEther(formData.reward), // Reward per task
                        BigInt(totalSeconds),        // Deadline
                        metadata
                    ],
                    value: parseEther(totalValue)      // Total deposit
                });
            } catch (error) {
                console.error("Publication error:", error);
                alert("Error creating task. See console.");
            }
            return;
        }

        // CHECK 2: Functionality for Circle (Social/PIN Wallet)
        const circleUser = localStorage.getItem('arc_user');
        const sessionToken = localStorage.getItem('arc_session_token'); // New Token

        if (circleUser) {
            try {
                const user = JSON.parse(circleUser);
                const userId = user.id || user.userId;

                // Priority: Session Token -> User ID
                const encryptionKey = localStorage.getItem('arc_encryption_key');

                console.log("DEBUG: Checking session credentials...");
                console.log("DEBUG: sessionToken present:", !!sessionToken);
                console.log("DEBUG: encryptionKey present:", !!encryptionKey);

                // Priority 1: Full session (Token + Key) available locally
                if (sessionToken && encryptionKey) {
                    console.log("DEBUG: Using stored session token and key.");
                    await handleViaCircle(userId, sessionToken, totalValue, totalSeconds, metadata);
                    return;
                }

                // Priority 2: Use User ID to generate a fresh session in the backend (Custom Auth ONLY)
                const isEmail = userId && userId.includes('@');
                if (userId && !isEmail) {
                    console.log("DEBUG: Local session incomplete or missing. Generating fresh session via User ID.");
                    await handleViaCircle(userId, undefined, totalValue, totalSeconds, metadata);
                    return;
                }

                if (isEmail && (!sessionToken || !encryptionKey)) {
                    alert("Security session expired. Please log out and back in once to restore your security key.");
                    return;
                }

                console.warn("DEBUG: User object missing id/userId and no session token found.");
            } catch (e) {
                console.error("DEBUG: Failed to parse arc_user", e);
            }
        }

        // Fallback
        alert("Wallet disconnected. Please connect using the sidebar or login again. (Debug: Missing Session Token or User ID)");
    };

    const isTextTask = formData.template === 'text-classification' || formData.template === 'language-detection';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Create New Campaign</h2>
                        <p className="text-sm text-slate-500">Step {step} of 3</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* content */}
                <div className="p-8 overflow-y-auto flex-1">
                    {isPending || isConfirming || isCircleLoading ? (
                        <div className="flex flex-col items-center justify-center h-full py-10 space-y-4">
                            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="text-lg font-bold text-slate-800">Processing Transaction...</p>
                            <p className="text-sm text-slate-500 text-center">
                                Authorizing deposit of <span className="font-bold text-[#005ddb]">{calculateTotal()} USDC</span>
                            </p>
                            <p className="text-xs text-slate-400">Wait for confirmation on the Arc Network.</p>
                            {hash && <p className="text-xs text-blue-500 font-mono">Hash: {hash.slice(0, 10)}...</p>}
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                <div className="space-y-6 animate-fade-in">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">1. Task Type</h3>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        {[
                                            { id: 'text-classification', icon: '💬', label: 'Sentiment Analysis' },
                                            { id: 'language-detection', icon: '🌍', label: 'Language Detection' },
                                            { id: 'image-classification', icon: '🖼️', label: 'Image Classification' },
                                            { id: 'object-verification', icon: '🚨', label: 'Object Verification' },
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setFormData({ ...formData, template: t.id as any })}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${formData.template === t.id
                                                    ? 'border-[#005ddb] bg-blue-50 text-[#005ddb] shadow-md'
                                                    : 'border-slate-100 hover:border-slate-300 text-slate-600'
                                                    }`}
                                            >
                                                <span className="text-2xl mb-2 block">{t.icon}</span>
                                                <span className="font-semibold text-sm">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                        <h4 className="text-md font-bold text-slate-800 mb-4 flex items-center">
                                            {isTextTask ? '📄 Text Configuration' : '🖼️ Image Configuration'}
                                        </h4>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-800 mb-2">
                                                    {isTextTask ? 'Content to Analyze' : 'Image URL'}
                                                </label>
                                                {isTextTask ? (
                                                    <textarea
                                                        name="taskContent"
                                                        value={formData.taskContent}
                                                        onChange={handleChange}
                                                        rows={3}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#2874ca] outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400 bg-white"
                                                        placeholder="e.g., The shipment arrived earlier than expected..."
                                                    />
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div
                                                            className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center ${dragActive ? 'border-[#005ddb] bg-blue-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                                                                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                                                        >
                                                            {isUploading ? (
                                                                <div className="flex flex-col items-center">
                                                                    <div className="w-8 h-8 border-2 border-[#005ddb] border-t-transparent rounded-full animate-spin mb-2"></div>
                                                                    <p className="text-xs font-bold text-[#005ddb]">Uploading image...</p>
                                                                </div>
                                                            ) : formData.taskContent ? (
                                                                <div className="relative group">
                                                                    <img
                                                                        src={formData.taskContent}
                                                                        alt="Preview"
                                                                        className="max-h-40 rounded-lg shadow-sm mb-2"
                                                                    />
                                                                    <button
                                                                        onClick={() => setFormData(prev => ({ ...prev, taskContent: '' }))}
                                                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">{formData.taskContent}</p>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner">📷</div>
                                                                    <p className="text-sm font-bold text-slate-700">Drag and drop your image</p>
                                                                    <p className="text-xs text-slate-400 mt-1">or click to browse from files</p>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onDragEnter={handleDrag}
                                                                        onDragLeave={handleDrag}
                                                                        onDragOver={handleDrag}
                                                                        onDrop={handleDrop}
                                                                        onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                    />
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <div className="h-px bg-slate-200 flex-1"></div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or enter URL</span>
                                                            <div className="h-px bg-slate-200 flex-1"></div>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            name="taskContent"
                                                            value={formData.taskContent}
                                                            onChange={handleChange}
                                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#005ddb] outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400 bg-white"
                                                            placeholder="https://example.com/image.jpg"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-slate-800 mb-2">Allowed Options (Comma Separated)</label>
                                                <input
                                                    type="text"
                                                    name="options"
                                                    value={formData.options}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#2874ca] outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400 bg-white"
                                                    placeholder="Option 1, Option 2, Option 3"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-800 mb-2">Campaign Name</label>
                                            <input
                                                type="text"
                                                name="title"
                                                value={formData.title}
                                                onChange={handleChange}
                                                autoFocus
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#005ddb] outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400 bg-white shadow-inner"
                                                placeholder="e.g., Sentiment analysis for my new product"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-800 mb-2">Instructions for Workers</label>
                                            <input
                                                type="text"
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#005ddb] outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400 bg-white"
                                                placeholder="e.g., Please be objective and follow the content rules..."
                                            />
                                        </div>
                                    </div>

                                    {/* Verification Method */}
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <h4 className="text-md font-bold text-slate-800 mb-4 flex items-center">
                                            ✅ Verification Method
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <button
                                                onClick={() => setFormData({ ...formData, verification: 'manual' })}
                                                className={`p-4 rounded-xl border text-left transition-all ${formData.verification === 'manual'
                                                    ? 'border-[#005ddb] bg-blue-50 text-[#005ddb]'
                                                    : 'border-gray-200 hover:border-gray-300 text-slate-600'
                                                    }`}
                                            >
                                                <div className="font-bold mb-1">Manual Review</div>
                                                <div className="text-xs opacity-70">You approve each submission.</div>
                                            </button>
                                            <button
                                                onClick={() => setFormData({ ...formData, verification: 'auto' })}
                                                className={`p-4 rounded-xl border text-left transition-all ${formData.verification === 'auto'
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-200 hover:border-gray-300 text-slate-600'
                                                    }`}
                                            >
                                                <div className="font-bold mb-1">Automatic (Instant)</div>
                                                <div className="text-xs opacity-70">Matches exact answer.</div>
                                            </button>
                                        </div>

                                        {formData.verification === 'auto' && (
                                            <div className="animate-fade-in bg-green-50/50 p-4 rounded-xl border border-green-100">
                                                <label className="block text-sm font-bold text-green-800 mb-2">Correct Answer (Exact Match)</label>
                                                <input
                                                    type="text"
                                                    name="correctAnswer"
                                                    value={formData.correctAnswer}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-green-200 focus:border-green-500 outline-none transition-all text-sm text-slate-900 bg-white"
                                                    placeholder="e.g., Positive"
                                                />
                                                <p className="text-[10px] text-green-600 mt-2 font-medium">
                                                    Worker's submission must match this exactly (case-insensitive) to be auto-approved.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-fade-in">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">2. Audience & Budget</h3>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Reward per Task (USDC)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3.5 text-slate-500 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    name="reward"
                                                    value={formData.reward}
                                                    onChange={handleChange}
                                                    step="0.01"
                                                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#005ddb] outline-none text-slate-900 bg-white"
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">Avg. for this type: $0.30 - $0.80</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-800 mb-2">Total Tasks</label>
                                            <input
                                                type="number"
                                                name="quantity"
                                                value={formData.quantity}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#005ddb] outline-none text-slate-900 bg-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Real-time Total Preview */}
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Total (incl. 5% fee)</p>
                                            <p className="text-sm font-semibold text-slate-600 italic">Workers payout + Platform maintenance</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-[#005ddb]">{calculateTotal()} USDC</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-800 mb-2">Campaign Duration</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <input
                                                    type="number"
                                                    name="days"
                                                    value={formData.days}
                                                    onChange={handleChange}
                                                    min="0"
                                                    className="w-full px-3 py-3 rounded-xl border border-gray-300 focus:border-[#005ddb] outline-none text-slate-900 bg-white"
                                                    placeholder="Days"
                                                />
                                                <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block px-1">Days</span>
                                            </div>
                                            <div>
                                                <input
                                                    type="number"
                                                    name="hours"
                                                    value={formData.hours}
                                                    onChange={handleChange}
                                                    min="0"
                                                    max="23"
                                                    className="w-full px-3 py-3 rounded-xl border border-gray-300 focus:border-[#005ddb] outline-none text-slate-900 bg-white"
                                                    placeholder="Hours"
                                                />
                                                <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block px-1">Hours</span>
                                            </div>
                                            <div>
                                                <input
                                                    type="number"
                                                    name="minutes"
                                                    value={formData.minutes}
                                                    onChange={handleChange}
                                                    min="0"
                                                    max="59"
                                                    className="w-full px-3 py-3 rounded-xl border border-gray-300 focus:border-[#005ddb] outline-none text-slate-900 bg-white"
                                                    placeholder="Mins"
                                                />
                                                <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block px-1">Minutes</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">Workers must submit within this timeframe.</p>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6 animate-fade-in">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">3. Review & Fund</h3>

                                    <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 space-y-3">
                                        <div className="flex justify-between text-sm text-slate-600">
                                            <span className="font-semibold">{formData.title}</span>
                                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md">{formData.template}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 italic my-2 p-2 bg-white rounded border border-gray-100">
                                            {formData.taskContent}
                                        </div>
                                        <div className="h-px bg-slate-200 my-2"></div>

                                        <div className="flex justify-between text-sm text-slate-600">
                                            <span>Task Reward</span>
                                            <span>${parseFloat(formData.reward).toFixed(4)} x {formData.quantity}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-slate-600">
                                            <span>Subtotal</span>
                                            <span>${(parseFloat(formData.reward) * formData.quantity).toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-slate-600">
                                            <span>Platform Fee (5%)</span>
                                            <span>${((parseFloat(formData.reward) * formData.quantity) * 0.05).toFixed(4)}</span>
                                        </div>
                                        <div className="h-px bg-slate-200 my-2"></div>
                                        <div className="flex justify-between text-lg font-bold text-slate-900 border-t-2 border-[#005ddb]/20 pt-2">
                                            <span>TOTAL AUTHORIZATION</span>
                                            <span className="text-[#005ddb] underline underline-offset-4">${calculateTotal()} USDC</span>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-xl flex items-start space-x-3">
                                        <div className="text-blue-600 mt-0.5">ℹ️</div>
                                        <p className="text-xs text-blue-700 leading-relaxed">
                                            By funding this campaign, <span className="font-bold underline">{calculateTotal()} USDC</span> will be locked in the <strong>ArcWorker Escrow Contract</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex justify-between">
                    {!isPending && !isConfirming && (
                        <>
                            <button
                                onClick={step === 1 ? onClose : prevStep}
                                className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                {step === 1 ? 'Cancel' : 'Back'}
                            </button>

                            <button
                                onClick={step === 3 ? handleFundAndPublish : nextStep}
                                className="px-8 py-2.5 bg-[#005ddb] text-white font-bold rounded-xl hover:bg-[#004bb3] transition-transform transform active:scale-95 shadow-lg"
                            >
                                {step === 3 ? 'Fund & Publish' : 'Continue'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
