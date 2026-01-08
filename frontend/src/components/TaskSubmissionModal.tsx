'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, useAccount, useBalance } from 'wagmi';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import axios from 'axios';
import { CONTRACTS, CHAIN_ID } from '../utils/contracts';
import { formatEther } from 'viem';

interface TaskMetadata {
    title: string;
    desc: string;
    instructions?: string; // New: Detailed instructions
    detailedInstructions?: string; // Fallback
    category?: string; // New: Category for switching UI views
    tmpl: 'text-classification' | 'language-detection' | 'image-classification' | 'object-verification' | 'bounding-box' | string;
    content?: string;
    options?: string[];
    verification?: 'manual' | 'auto';
    correctAnswer?: string; // New: For instant verification
}

interface TaskSubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: number;
    metadata: TaskMetadata;
    reward: string;
}

// --- Sub-Component: Bounding Box Annotator ---
// Logic: User selects a class, then draws boxes on the image. Result is JSON string of boxes.
interface Box {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
}

const BoundingBoxAnnotator = ({ imageUrl, labels, onUpdate }: { imageUrl: string, labels: string[], onUpdate: (data: string) => void }) => {
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [currentLabel, setCurrentLabel] = useState<string>(labels[0] || 'Object');
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Notify parent of changes
    useEffect(() => {
        onUpdate(JSON.stringify(boxes));
    }, [boxes, onUpdate]);

    const getCoords = (e: React.MouseEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width * 100, // % relative to container
            y: (e.clientY - rect.top) / rect.height * 100
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        setStartPos(getCoords(e));
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const endPos = getCoords(e);

        // Calculate box (ensure w/h are positive)
        const x = Math.min(startPos.x, endPos.x);
        const y = Math.min(startPos.y, endPos.y);
        const w = Math.abs(endPos.x - startPos.x);
        const h = Math.abs(endPos.y - startPos.y);

        if (w < 1 || h < 1) return; // Ignore tiny clicks

        setBoxes([...boxes, { id: Date.now(), x, y, w, h, label: currentLabel }]);
    };

    const removeBox = (id: number) => {
        setBoxes(boxes.filter(b => b.id !== id));
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 h-full">
            {/* Toolbar */}
            <div className="w-full md:w-48 flex flex-col gap-3 shrink-0">
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-2">1. Select Label Tool</span>
                    <div className="flex flex-col gap-2">
                        {labels.map(lbl => (
                            <button
                                key={lbl}
                                onClick={() => setCurrentLabel(lbl)}
                                className={`px-3 py-2 rounded-lg text-sm font-bold text-left transition-all ${currentLabel === lbl
                                    ? 'bg-[#005ddb] text-white shadow-md ring-2 ring-blue-200'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'}`}
                            >
                                🔍 {lbl}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1 overflow-y-auto max-h-60">
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Annotations ({boxes.length})</span>
                    {boxes.length === 0 && <p className="text-xs text-slate-400 italic">Draw boxes on image...</p>}
                    <div className="flex flex-col gap-2">
                        {boxes.map(box => (
                            <div key={box.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 text-xs shadow-sm">
                                <span className="font-semibold text-slate-700">{box.label}</span>
                                <button onClick={() => removeBox(box.id)} className="text-red-400 hover:text-red-600 px-1">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Canvas Area */}
            <div
                ref={containerRef}
                className="relative flex-1 bg-slate-900 rounded-xl overflow-hidden cursor-crosshair border-2 border-slate-300 select-none group"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            >
                <img
                    ref={imgRef}
                    src={imageUrl}
                    alt="Annotation Target"
                    className="w-full h-full object-contain pointer-events-none select-none"
                    draggable={false}
                />

                {/* Render Boxes */}
                {boxes.map(box => (
                    <div
                        key={box.id}
                        className="absolute border-2 border-[#00f7ff] bg-[#00f7ff]/20 hover:bg-[#00f7ff]/30 transition-colors"
                        style={{
                            left: `${box.x}%`,
                            top: `${box.y}%`,
                            width: `${box.w}%`,
                            height: `${box.h}%`
                        }}
                    >
                        <span className="absolute -top-5 left-0 bg-[#00f7ff] text-black text-[9px] font-bold px-1 rounded-t-sm shadow-sm">
                            {box.label}
                        </span>
                    </div>
                ))}

                {/* Helper Text */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-[10px] backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Click and drag to annotate
                </div>
            </div>
        </div>
    );
};


export function TaskSubmissionModal({ isOpen, onClose, taskId, metadata, reward }: TaskSubmissionModalProps) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);

    // Wagmi hooks
    const { address: wagmiAddress } = useAccount();
    const [circleAddress, setCircleAddress] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('arc_user');
        if (saved) {
            try {
                const profile = JSON.parse(saved);
                const addr = profile.address || profile.walletAddress;
                if (addr) setCircleAddress(addr);
            } catch (e) { }
        }
    }, []);

    const address = wagmiAddress || circleAddress;
    const { data: balanceData, refetch: refetchBalance } = useBalance({ address: address as `0x${string}` });
    const currentChainId = useChainId();
    const { switchChain } = useSwitchChain();
    const { data: hash, isPending, writeContract, error: writeError, reset } = useWriteContract();
    const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
        hash,
    });

    const hasNoGas = !balanceData || Number(balanceData.value) === 0;

    useEffect(() => {
        // Log task submission intent for tracking
    }, [isOpen]);

    const triggerAutoVerify = async () => {
        try {
            await axios.post('/api/tasks/auto-verify', { taskId });
        } catch (e) {
            console.error("Failed to trigger auto-verify:", e);
        }
    };

    useEffect(() => {
        if (isSuccess) {
            triggerAutoVerify();
            alert(`✅ Submission Successful! Reward: ${reward} USDC.`);
            onClose(); setSelectedOption(null); setLastError(null); reset();
            setIsSubmitting(false); // Reset submitting state
            return;
        }

        if (writeError) {
            const err = writeError as any;
            const msg = err.shortMessage || err.message || "Unknown error";
            const revertReason = err.cause?.data?.message || err.cause?.cause?.message || "";
            setLastError(`Signing Error: ${msg} ${revertReason}`);
            setIsSubmitting(false); // Reset submitting state
        }

        if (receiptError) {
            setLastError(`Transaction Failed: The task may have already been completed or expired.`);
            setIsSubmitting(false); // Reset submitting state
        }
    }, [isSuccess, writeError, receiptError, onClose, taskId, reward, reset]);

    if (!isOpen) return null;

    const [isCircleLoading, setIsCircleLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedOption || isSubmitting || isCircleLoading) return;
        setIsSubmitting(true);

        const circleProfileStr = localStorage.getItem('arc_user');
        if (circleProfileStr) {
            const profile = JSON.parse(circleProfileStr);
            const userId = profile.id || profile.email;

            // Robust check: If walletType is 'circle' OR if we have an ID/Email but NO active Wagmi connection
            if ((profile.walletType === 'circle' || profile.id || profile.email) && userId && !wagmiAddress) {
                setIsCircleLoading(true);
                setLastError(null);
                try {
                    // 1. Get current session tokens
                    const userToken = localStorage.getItem('arc_session_token');
                    const encryptionKey = localStorage.getItem('arc_encryption_key');

                    // 2. Initiate gasless call through backend
                    const response = await axios.post('/api/circle/submit-task', {
                        userId,
                        taskId,
                        answer: selectedOption,
                        userToken,
                        encryptionKey
                    });

                    const { challengeId, userToken: updatedUserToken, encryptionKey: updatedEncryptionKey, appId } = response.data;

                    console.log("[DEBUG] Auth Response:", {
                        hasUserToken: !!updatedUserToken,
                        hasKey: !!updatedEncryptionKey,
                        appId: appId || "MISSING"
                    });

                    // 3. Persist fresh tokens
                    if (updatedUserToken && updatedUserToken !== userToken) {
                        localStorage.setItem('arc_session_token', updatedUserToken);
                        if (updatedEncryptionKey) localStorage.setItem('arc_encryption_key', updatedEncryptionKey);
                    }

                    // 4. Initialize SDK
                    const finalAppId = appId || process.env.NEXT_PUBLIC_CIRCLE_APP_ID;
                    const finalUserToken = updatedUserToken || userToken;
                    const finalEncryptionKey = updatedEncryptionKey || encryptionKey;

                    const sdk = new W3SSdk();
                    sdk.setAppSettings({ appId: finalAppId || '' });
                    sdk.setAuthentication({
                        userToken: finalUserToken || '',
                        encryptionKey: finalEncryptionKey || ''
                    });

                    // Persist refreshed credentials
                    if (updatedUserToken) localStorage.setItem('arc_session_token', updatedUserToken);
                    if (updatedEncryptionKey) localStorage.setItem('arc_encryption_key', updatedEncryptionKey);

                    await new Promise((resolve, reject) => {
                        sdk.execute(challengeId, (error: any, result: any) => {
                            if (error) reject(error);
                            else resolve(result);
                        });
                    });

                    // 5. Poll for Confirmation (Crucial Fix for "Silent Failure")
                    console.log("[ArcWorker] Submission signed. Polling for on-chain finality...");
                    let attempts = 0;
                    const maxAttempts = 20; // ~40 seconds

                    const pollInterval = setInterval(async () => {
                        try {
                            attempts++;
                            const statusRes = await axios.get(`/api/circle/challenge?id=${challengeId}`, {
                                headers: { 'X-User-Token': finalUserToken }
                            });

                            const challengeData = statusRes.data.status;

                            // Forensic discovery of status and hash
                            const challengeStatus = challengeData?.status || challengeData?.challenge?.status;
                            const txStatus = challengeData?.transaction?.status || challengeData?.result?.state || challengeData?.result?.status;
                            const txHash = challengeData?.transaction?.txHash || challengeData?.result?.txHash || challengeData?.result?.transactionHash;
                            const errorReason = challengeData?.transaction?.errorReason || challengeData?.result?.errorReason;

                            console.log(`[ArcWorker] Polling submission (${attempts}): Challenge=${challengeStatus}, TX=${txStatus || 'N/A'}, Hash=${txHash || 'Pending'}`);

                            if (challengeStatus === 'COMPLETE') {
                                if (txStatus === 'FAILED') {
                                    clearInterval(pollInterval);
                                    setIsCircleLoading(false);
                                    setLastError(`Submission Failed: ${errorReason || "Transaction reverted."}`);
                                    return;
                                }

                                if (txHash || attempts > 10) {
                                    clearInterval(pollInterval);
                                    setIsCircleLoading(false);
                                    triggerAutoVerify();
                                    alert(`✅ Submission Confirmed on Chain!\n\nReward: ${reward} USDC\nTX: ${txHash || 'Broadcasting...'}`);
                                    onClose();
                                    setSelectedOption(null);
                                }
                            } else if (challengeStatus === 'FAILED' || txStatus === 'FAILED') {
                                clearInterval(pollInterval);
                                setIsCircleLoading(false);
                                setLastError(`Submission Failed: ${errorReason || "Challenge failed or was cancelled."}`);
                            } else if (attempts >= 45) {
                                clearInterval(pollInterval);
                                setIsCircleLoading(false);
                                alert("Submission is taking longer than expected. It might be pending in the background.");
                                onClose();
                            }
                        } catch (e) {
                            console.error("Polling Error:", e);
                        }
                    }, 2000);

                    return;
                } catch (err: any) {
                    const msg = err.response?.data?.details || err.message || "Unknown error";
                    setLastError(`Gasless Error: ${msg}`);
                    return;
                } finally {
                    // Do not set isCircleLoading(false) here, the polling loop will do it if successful.
                    // Actually if we reach catch, we should.
                    if (lastError) setIsCircleLoading(false);
                }
            }
        }

        if (currentChainId !== CHAIN_ID) {
            if (window.confirm("WRONG NETWORK: You must be on Arc Testnet to submit. Switch now?")) {
                switchChain({ chainId: CHAIN_ID });
            }
            return;
        }

        // Contract interaction (MetaMask/EOA)
        writeContract({
            address: CONTRACTS.TaskEscrow.address,
            abi: CONTRACTS.TaskEscrow.abi,
            functionName: 'submitTask',
            args: [
                BigInt(taskId),
                selectedOption
            ]
        });
    };

    if (!metadata) return null;

    // Determine if we should show Text View or Image View
    const isTextTask =
        metadata?.tmpl === 'text-classification' ||
        metadata?.tmpl === 'language-detection' ||
        metadata?.tmpl === 'Sentiment Analysis' ||
        metadata?.tmpl === 'Text Classification';

    // Logic: If Category is AI Training or Tmpl is Bounding Box, use Annotator
    const isAnnotationTask = (metadata.category === 'ai-training' && !isTextTask) || metadata.tmpl?.includes('bounding-box');

    // Defaults if metadata options are missing
    const options = metadata?.options && metadata.options.length > 0
        ? metadata.options
        : ['Yes', 'No'];

    // Prioritize specific instruction field, fallback to generic desc
    const instructions = metadata.instructions || metadata.detailedInstructions || metadata.desc;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className={`bg-white rounded-3xl shadow-2xl w-full ${isAnnotationTask ? 'max-w-6xl' : 'max-w-2xl'} overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-5 duration-300`}>
                {/* Header */}
                <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-[#005ddb] text-white shrink-0">
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                                Task #{taskId}
                            </span>
                            <span className="bg-white/90 text-[#005ddb] font-bold text-sm px-2 py-1 rounded-full shadow-sm">
                                +{reward} USDC
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-white mt-1">{metadata.title}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-full">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                    {isPending || isConfirming || isCircleLoading ? (
                        <div className="flex flex-col items-center justify-center h-full py-10 space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-slate-200 rounded-full"></div>
                                <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-slate-800">Submitting Work...</p>
                                <p className="text-slate-500 mt-1">Recording your answer on the Arc Network.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 h-full flex flex-col">
                            {/* Instructions Box */}
                            <div className="bg-blue-50/80 p-5 rounded-xl border border-blue-100 shrink-0">
                                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Instructions
                                </h3>
                                <p className="text-slate-700 text-sm whitespace-pre-wrap font-medium leading-relaxed">{instructions}</p>
                            </div>

                            {/* Dynamic Work Space */}
                            {isAnnotationTask && metadata.content ? (
                                <div className="flex-1 min-h-[400px]">
                                    <BoundingBoxAnnotator
                                        imageUrl={metadata.content}
                                        labels={options}
                                        onUpdate={(json) => setSelectedOption(json)}
                                    />
                                    {/* Override selectedOption behavior for Annotator: it updates automatically via onUpdate */}
                                </div>
                            ) : (
                                <>
                                    {/* Standard View */}
                                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm shrink-0">
                                        {isTextTask ? (
                                            <div className="prose prose-slate max-w-none">
                                                <p className="text-lg leading-relaxed text-slate-800 font-medium">
                                                    "{metadata.content || "Loading task content..."}"
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex justify-center bg-slate-100 rounded-xl overflow-hidden py-4">
                                                {metadata.content ? (
                                                    <img
                                                        src={metadata.content}
                                                        alt="Task Subject"
                                                        className="max-h-48 object-contain rounded-lg shadow-sm"
                                                    />
                                                ) : (
                                                    <div className="h-48 w-full flex items-center justify-center text-slate-400">
                                                        [Image Placeholder: {metadata.content}]
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Options Grid */}
                                    {/* Options Grid or Free Text */}
                                    <div className="shrink-0">
                                        <h3 className="text-sm font-bold text-slate-700 mb-3 ml-1">
                                            {options.length === 1 && options[0] === '' ? 'Your Answer:' : 'Select Answer:'}
                                        </h3>

                                        {/* Logic: If options are [""] (from empty creation), show Text Area. Else show Buttons. */}
                                        {options.length === 1 && options[0] === '' ? (
                                            <textarea
                                                className="w-full p-4 rounded-xl border-2 border-slate-200 outline-none focus:border-[#005ddb] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700 placeholder:text-slate-400 min-h-[120px]"
                                                placeholder="Type your answer here..."
                                                value={selectedOption || ''}
                                                onChange={(e) => setSelectedOption(e.target.value)}
                                            />
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {options.map((opt, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSelectedOption(opt)}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between group ${selectedOption === opt
                                                            ? 'border-[#005ddb] bg-[#005ddb] text-white shadow-lg scale-[1.02]'
                                                            : 'border-white bg-white hover:border-[#005ddb]/50 text-slate-600 shadow-sm hover:shadow-md'
                                                            }`}
                                                    >
                                                        <span className="font-semibold">{opt}</span>
                                                        {selectedOption === opt && (
                                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}


                            {/* Wallet-Specific Gas View */}
                            {address && (
                                <div className={`p-4 rounded-xl border flex items-start space-x-3 shrink-0 ${!wagmiAddress ? 'bg-blue-50 border-blue-100' : (hasNoGas ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200')}`}>
                                    <span className="text-xl">{!wagmiAddress ? '⛽' : (hasNoGas ? '⚠️' : '✅')}</span>
                                    <div className="flex-1">
                                        {!wagmiAddress ? (
                                            <>
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-bold text-blue-800 uppercase tracking-tight">Arc Gas Station Active</p>
                                                    <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Gasless Flow</span>
                                                </div>
                                                <p className="text-xs text-blue-700 mt-1 font-medium leading-tight">
                                                    Your Smart Wallet is powered by **Circle Gas Station**. You don't need native tokens to submit this task!
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-bold text-amber-800">EOA Wallet Interaction</p>
                                                    <a
                                                        href="https://faucet.circle.com/"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-1 rounded hover:bg-amber-300 transition-colors uppercase tracking-tight"
                                                    >
                                                        Get Free Fuel ⛽
                                                    </a>
                                                </div>
                                                <p className="text-xs text-amber-700 mt-0.5 font-medium">
                                                    {hasNoGas
                                                        ? "You need a small amount of Arc Net tokens to pay for the transaction."
                                                        : "Gas ready. Transaction costs will be deducted from your balance."}
                                                </p>
                                            </>
                                        )}
                                        <div className="mt-2 p-2 bg-white/50 rounded-lg text-[9px] font-mono text-slate-500 overflow-hidden text-ellipsis border border-black/5">
                                            <p className="truncate uppercase tracking-tighter opacity-70">Authenticated: {address}</p>
                                            {wagmiAddress && <p>BALANCE: {balanceData ? formatEther(balanceData.value) : '0'} {balanceData?.symbol}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Display */}
                            {lastError && !isPending && !isConfirming && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col space-y-1 animate-in shake duration-300 shrink-0">
                                    <p className="text-sm font-bold text-red-800 flex items-center">
                                        <span className="mr-2">❌</span> Transaction Failed
                                    </p>
                                    <p className="text-xs text-red-700 font-mono break-words leading-tight">
                                        {lastError}
                                    </p>
                                    <p className="text-[10px] text-red-500 font-bold mt-2 border-t border-red-100 pt-2">
                                        💡 TIP: If the error persists, try clearing your browser cache or switching wallets.
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <button
                                            onClick={() => { setLastError(null); reset(); }}
                                            className="text-[10px] font-bold text-red-600 bg-red-100 hover:bg-red-200 px-2 py-1 rounded transition-colors"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!isPending && !isConfirming && (
                    <div className="px-8 py-5 border-t border-gray-100 bg-white flex justify-end space-x-3 shrink-0">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedOption || (hasNoGas && !localStorage.getItem('arc_user')) || isCircleLoading || isSubmitting}
                            className={`px-8 py-2.5 text-white font-bold rounded-xl transition-all shadow-lg transform active:scale-95 ${selectedOption && (!hasNoGas || localStorage.getItem('arc_user')) && !isCircleLoading && !isSubmitting
                                ? 'bg-[#005ddb] hover:bg-[#004bb3] hover:-translate-y-0.5'
                                : 'bg-slate-300 cursor-not-allowed'
                                }`}
                        >
                            {isCircleLoading ? 'Processing Gasless...' : isSubmitting ? 'Signing...' : (hasNoGas && !localStorage.getItem('arc_user') ? 'Need Gas Tokens' : 'Submit Task')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
