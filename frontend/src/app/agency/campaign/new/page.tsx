'use client';

import React, { useState, useCallback } from 'react';
import { useRouter }
    from 'next/navigation';
import { Rocket, ArrowLeft, Loader2 } from 'lucide-react';
import { CampaignSidebar } from '@/components/v2/CampaignSidebar';
import { DynamicForm } from '@/components/v2/DynamicForm';
import { ComponentType, CampaignConfig } from '@/components/v2/types';

// Web3 & Circle Imports
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import { CONTRACTS } from '@/utils/contracts';
import { getSdk } from '@/utils/circle';
import { ensureCircleSession, getCircleUserId } from '@/utils/circleSession';

// Define the structure of our modules - synced with HTML IDs & Logic
const MODULES = {
    'computer-vision': {
        'vision-bbox': {
            title: 'Object Detection (Bounding Box)',
            desc: 'Draw boxes around objects of interest.',
            components: ['campaign-info', 'upload-image', 'labels-creator', 'instructions-vision', 'verification-config', 'payment-config'] as ComponentType[]
        },
        'vision-class': {
            title: 'Image Classification',
            desc: 'Categorize images into predefined classes.',
            components: ['campaign-info', 'upload-image', 'labels-creator', 'instructions-vision', 'difficulty-selector', 'verification-config', 'payment-config'] as ComponentType[]
        },
        'vision-seg': {
            title: 'Semantic Segmentation',
            desc: 'Pixel-wise coloring of objects.',
            components: ['campaign-info', 'upload-image', 'labels-creator', 'instructions-vision', 'payment-config'] as ComponentType[]
        }
    },
    'nlp': {
        'nlp-ner': {
            title: 'Named Entity Recognition (NER)',
            desc: 'Highlight people, places, and organizations.',
            components: ['campaign-info', 'upload-text', 'entity-tags', 'instructions-simple', 'payment-config'] as ComponentType[]
        },
        'nlp-sentiment': {
            title: 'Sentiment Analysis',
            desc: 'Determine if text is positive, negative, or neutral.',
            components: ['campaign-info', 'upload-text', 'sentiment-config', 'instructions-simple', 'payment-config'] as ComponentType[]
        },
        'nlp-trans': {
            title: 'Translation / Localization',
            desc: 'Translate text between languages.',
            components: ['campaign-info', 'upload-text', 'lang-pair', 'instructions-simple', 'payment-config'] as ComponentType[]
        },
        'nlp-text-class': {
            title: 'Text Classification',
            desc: 'Categorize text into custom topics.',
            components: ['campaign-info', 'upload-text', 'classes-creator', 'instructions-simple', 'payment-config'] as ComponentType[]
        }
    },
    'audio': {
        'audio-transcribe': {
            title: 'Audio Transcription',
            desc: 'Convert speech to text.',
            components: ['campaign-info', 'upload-audio', 'transcription-settings', 'instructions-simple', 'payment-config'] as ComponentType[]
        },
        'audio-collect': {
            title: 'Audio Data Collection',
            desc: 'Record users speaking specific phrases.',
            components: ['campaign-info', 'prompt-text', 'audio-reqs', 'payment-config'] as ComponentType[]
        }
    },
    'data-collection': {
        'data-enrich': {
            title: 'Web Scraping / Data Enrichment',
            desc: 'Find data from the web (URLs, contact info).',
            components: ['campaign-info', 'upload-csv', 'fields-def', 'instructions-simple', 'payment-config'] as ComponentType[]
        },
        'survey': {
            title: 'Survey / Market Research',
            desc: 'Collect structured answers from users.',
            components: ['campaign-info', 'survey-builder', 'payment-config'] as ComponentType[]
        }
    }
};

export default function CampaignCreatorPage() {
    const router = useRouter();

    // Web3 State
    const { isConnected } = useAccount();
    const { writeContract, isPending: isWagmiLoading } = useWriteContract();
    const [isCircleLoading, setIsCircleLoading] = useState(false);

    // Form State
    const [activeModuleId, setActiveModuleId] = useState<string>('vision-bbox');
    const [campaignConfig, setCampaignConfig] = useState<CampaignConfig>({
        moduleId: 'vision-bbox', // default
        title: '',
        description: '',
        difficulty: 'Medium',
        verificationStrategy: 'Consensus',
        rewardPerTask: 0.15,
        totalTasks: 10 // Reduced from 1000 to avoid gas limit
    });

    const isLoading = isWagmiLoading || isCircleLoading;

    // Helper to find current module config
    const getCurrentModuleConfig = () => {
        for (const category of Object.values(MODULES)) {
            if (activeModuleId in category) {
                // @ts-ignore
                return category[activeModuleId];
            }
        }
        return MODULES['computer-vision']['vision-bbox'];
    };

    const currentModule = getCurrentModuleConfig();

    const handleViaCircle = async (
        userId: string | undefined,
        userToken: string | undefined,
        encryptionKey: string | undefined,
        totalValue: string,
        deadlineSeconds: number,
        metadata: string,
        requiredSubmissions: number,
        correctAnswerHash: string
    ) => {
        try {
            setIsCircleLoading(true);

            console.log("Creating Campaign via Circle...", { userId, totalValue, requiredSubmissions });
            const res = await fetch('/api/circle/create-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    userToken,
                    amount: totalValue,
                    rewardPerTask: (campaignConfig.rewardPerTask || 0.15).toString(),
                    taskCount: (campaignConfig.totalTasks || 10).toString(),
                    deadlineDays: Math.ceil(deadlineSeconds / 86400),
                    metadataHash: metadata,
                    requiredSubmissions,
                    correctAnswerHash
                })
            });

            const data = await res.json();

            if (data.userToken) {
                localStorage.setItem('arc_session_token', data.userToken);
                if (data.encryptionKey) localStorage.setItem('arc_encryption_key', data.encryptionKey);
            }

            if (!res.ok) {
                alert(`Campaign Creation Failed: ${data.message || data.error}`);
                setIsCircleLoading(false);
                return;
            }

            // Challenge flow if needed
            if (data.challengeId) {
                const sdk = getSdk();
                if (!sdk) {
                    alert('❌ Circle SDK not initialized. Please refresh and try again.');
                    setIsCircleLoading(false);
                    return;
                }

                // CRÍTICO: Siempre priorizar lo que viene de la API ya que es lo que se usó para crear el challenge.
                const finalUserToken = data.userToken || userToken;
                const finalEncryptionKey = data.encryptionKey || encryptionKey || (typeof window !== 'undefined' ? localStorage.getItem('arc_encryption_key') : undefined);
                const finalAppId = data.appId || process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '';

                console.log('[Circle SDK] Configurando Autenticación:', {
                    appId: finalAppId ? `${finalAppId.substring(0, 8)}...` : 'MISSING',
                    tokenSource: data.userToken ? 'API' : 'Parameter',
                    hasToken: !!finalUserToken,
                    challengeId: data.challengeId ? `${data.challengeId.substring(0, 8)}...` : 'MISSING'
                });

                sdk.setAppSettings({ appId: finalAppId });
                sdk.setAuthentication({
                    userToken: finalUserToken,
                    encryptionKey: finalEncryptionKey || undefined
                });

                // Execute the challenge
                sdk.execute(data.challengeId, (error, result) => {
                    if (error) {
                        console.error('Circle SDK Error:', error);
                        const errorMsg = error.message || error.toString();

                        // Parse common error types
                        if (errorMsg.includes('Invalid credentials')) {
                            alert('❌ Authentication failed. Please log out and log back in.');
                        } else if (errorMsg.includes('ESTIMATION_ERROR')) {
                            alert('❌ Transaction simulation failed. This may be due to:\n• Insufficient balance\n• Contract error\n• Network issues\n\nPlease check your wallet balance and try again.');
                        } else if (errorMsg.includes('User denied')) {
                            alert('⚠️ Transaction cancelled by user.');
                        } else {
                            alert('❌ Transaction failed: ' + errorMsg);
                        }

                        setIsCircleLoading(false);
                        return;
                    }

                    // Check result status
                    console.log('Circle SDK Result:', result);
                    if (result && result.status === 'COMPLETE') {
                        alert('✅ Campaign created successfully!\n\nYour tasks are now live on the Arc Network.');
                    } else if (result && result.status === 'FAILED') {
                        alert('❌ Transaction failed on-chain. Please try again.');
                    } else {
                        alert('⏳ Transaction submitted. Please check your dashboard for status.');
                    }

                    setIsCircleLoading(false);
                });
            } else {
                alert('❌ No challenge ID received from server. Please try again.');
                setIsCircleLoading(false);
            }
        } catch (error: any) {
            console.error('Circle campaign error:', error);
            const errorMsg = error.message || 'Unknown error occurred';
            alert('❌ Campaign creation failed: ' + errorMsg);
            setIsCircleLoading(false);
        }
    };

    const handleDeploy = async () => {
        const metadata = JSON.stringify({
            title: campaignConfig.title,
            desc: campaignConfig.instructions || campaignConfig.description, // Prioritize instructions for worker
            tmpl: activeModuleId, // Worker Feed expects 'tmpl'
            diff: campaignConfig.difficulty,
            ver: campaignConfig.verificationStrategy,
            content: campaignConfig.datasetUrl || campaignConfig.textDatasetUrl || campaignConfig.audioDatasetUrl || campaignConfig.sourceDataUrl || "",
            options: campaignConfig.classificationOptions || campaignConfig.labels || [],
            timestamp: new Date().toISOString()
        });

        // Calculate total with 5% platform fee
        const rewardPerTask = campaignConfig.rewardPerTask || 0.15;
        const totalTasks = campaignConfig.totalTasks || 10;
        const workersPerTask = campaignConfig.workersPerTask || 1;

        const subtotal = rewardPerTask * totalTasks * workersPerTask;
        const fee = subtotal * 0.05; // 5% platform fee
        const totalValue = (subtotal + fee).toFixed(6); // Total including fee
        const totalValueInAtoms = parseUnits(totalValue, 6);

        // 2. Prepare Contract Arguments
        const rewardInAtoms = BigInt(Math.round(rewardPerTask * 1e6));
        const totalCount = BigInt(totalTasks);
        const deadline = BigInt(7) * BigInt(24) * BigInt(3600); // 7 days
        const metadataHash = metadata;
        const requiredSubmissions = BigInt(workersPerTask);

        // Generate hash for Golden Set if answer provided
        let correctAnswerHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
        if (campaignConfig.correctAnswer) {
            const { keccak256, encodePacked } = await import('viem');
            correctAnswerHash = keccak256(encodePacked(['string'], [campaignConfig.correctAnswer]));
        }

        console.log(`[Campaign] Deploying with ${requiredSubmissions} workers per task. Golden Set: ${campaignConfig.correctAnswer ? 'YES' : 'NO'}`);

        if (isConnected) {
            try {
                // EOA Flow
                writeContract({
                    address: CONTRACTS.TaskEscrow.address,
                    abi: CONTRACTS.TaskEscrow.abi,
                    functionName: 'createTasksBatch',
                    args: [rewardInAtoms, totalCount, deadline, metadataHash, requiredSubmissions, correctAnswerHash as `0x${string}`],
                    value: totalValueInAtoms,
                });
            } catch (e: any) {
                alert("Transaction failed: " + e.message);
            }
            return;
        }

        // Circle / Email Logic
        const userId = getCircleUserId();
        if (!userId) {
            alert("No session found. Please login again.");
            return;
        }

        try {
            setIsCircleLoading(true);

            // 1. Ensure valid session (auto-renews if expired)
            const session = await ensureCircleSession(userId);
            if (!session) {
                alert("Could not renew Circle session. Please login again.");
                setIsCircleLoading(false);
                return;
            }

            // 2. Call Contract via Circle
            await handleViaCircle(
                userId,
                session.userToken,
                session.encryptionKey,
                totalValue,
                Number(deadline),
                metadataHash,
                Number(requiredSubmissions),
                correctAnswerHash
            );
        } catch (e: any) {
            console.error("[Campaign] Circle Deploy Error:", e);
            alert("Circle Transaction failed: " + e.message);
        } finally {
            setIsCircleLoading(false);
        }
    };

    const handleModuleChange = (id: string) => {
        setActiveModuleId(id);
        setCampaignConfig(prev => ({
            ...prev,
            moduleId: id
        }));
    };

    const handleConfigChange = useCallback((updates: Partial<CampaignConfig>) => {
        setCampaignConfig(prev => ({
            ...prev,
            ...updates
        }));
    }, []);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">

            {/* Sidebar Navigation */}
            <CampaignSidebar
                activeModuleId={activeModuleId}
                onSelect={handleModuleChange}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                {/* Dynamic Header */}
                <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
                    <div>
                        <button
                            onClick={() => router.push('/agency/dashboard')}
                            className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-700 mb-1 transition"
                        >
                            <ArrowLeft className="w-3 h-3" /> Dashboard
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">{currentModule.title}</h1>
                        <p className="text-sm text-gray-500 mt-1">{currentModule.desc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
                            Auto-Save On
                        </span>
                        <button
                            onClick={handleDeploy}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition shadow-lg shadow-green-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                            {isLoading ? 'Deploying...' : 'Deploy Campaign'}
                        </button>
                    </div>
                </header>

                {/* Scrollable Form Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50 custom-scrollbar">
                    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
                        <DynamicForm
                            components={currentModule.components}
                            config={campaignConfig}
                            onChange={handleConfigChange}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}
