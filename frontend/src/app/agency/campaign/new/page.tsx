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
            components: ['campaign-info', 'upload-image', 'labels-creator', 'instructions-vision', 'difficulty-selector', 'payment-config'] as ComponentType[]
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

    const handleViaCircle = async (userId: string | undefined, userToken: string | undefined, totalValue: string, totalSeconds: number, metadata: string) => {
        try {
            setIsCircleLoading(true);
            const args = [
                parseUnits((campaignConfig.rewardPerTask || 0.15).toString(), 6).toString(),
                (campaignConfig.totalTasks || 10).toString(), // Match new default
                totalSeconds.toString(),
                metadata
            ];

            console.log("Creating Campaign via Circle...", { userId, args, totalValue });
            const res = await fetch('/api/circle/create-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userToken, args, amount: totalValue })
            });

            const data = await res.json();

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

                // Configure SDK with app settings and authentication
                sdk.setAppSettings({ appId: data.appId || process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '' });

                const authPayload: any = { userToken: data.userToken };
                if (data.encryptionKey) {
                    authPayload.encryptionKey = data.encryptionKey;
                } else {
                    const localKey = localStorage.getItem('arc_encryption_key');
                    if (localKey) authPayload.encryptionKey = localKey;
                }
                sdk.setAuthentication(authPayload);

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
            desc: campaignConfig.description,
            mod: activeModuleId,
            diff: campaignConfig.difficulty,
            ver: campaignConfig.verificationStrategy,
            timestamp: new Date().toISOString()
        });

        // Calculate total with 5% platform fee
        const rewardPerTask = campaignConfig.rewardPerTask || 0.15;
        const totalTasks = campaignConfig.totalTasks || 10; // Match new default
        const subtotal = rewardPerTask * totalTasks;
        const fee = subtotal * 0.05; // 5% platform fee
        const totalValue = (subtotal + fee).toFixed(6); // Total including fee

        const totalSeconds = 604800; // 7 days deadline for tasks

        if (isConnected) {
            try {
                writeContract({
                    address: CONTRACTS.TaskEscrow.address,
                    abi: CONTRACTS.TaskEscrow.abi,
                    functionName: 'createTasksBatch',
                    args: [parseUnits(rewardPerTask.toString(), 6), BigInt(totalTasks), BigInt(totalSeconds), metadata],
                    value: parseUnits(totalValue, 6)
                });
            } catch (e: any) {
                alert("Transaction failed: " + e.message);
            }
            return;
        }

        // Circle / Email Logic
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
        } else {
            alert("No wallet connected. Please connect MetaMask or Log In.");
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
