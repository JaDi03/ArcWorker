'use client';

import React, { useState } from 'react';
import { ArcWorker } from '@/arcworker-sdk';
import { ConnectModal } from '@/arcworker-sdk/ui/ConnectModal';
import { TaskFeed } from '@/arcworker-sdk/ui/TaskFeed';
import { ReputationCard } from '@/arcworker-sdk/ui/ReputationCard';

export default function SDKTestBench() {
    const [logs, setLogs] = useState<string[]>([]);
    const [sdk, setSdk] = useState<ArcWorker | null>(null);
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

    const initSDK = () => {
        try {
            const instance = new ArcWorker({
                appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || 'TEST_APP_ID'
            });
            setSdk(instance);
            addLog("SDK Initialized");
        } catch (e: any) {
            addLog(`Init Failed: ${e.message}`);
        }
    };

    const handleLogin = async () => {
        if (!sdk) return addLog("Initialize SDK first");
        if (!email) return addLog("Enter an email");

        addLog(`Starting Login for ${email}...`);
        try {
            const result = await sdk.auth.loginWithEmail(email);
            setAddress(result.address);
            addLog(`Login Success! Wallet: ${result.address}`);
        } catch (e: any) {
            addLog(`Login Failed: ${e.message}`);
        }
    };

    const checkReputation = async () => {
        if (!sdk) return addLog("Initialize SDK first");
        if (!address) return addLog("Login first to check reputation (or enter mock address)");

        const target = address || "0x123...";
        addLog(`Checking Reputation for ${target}...`);
        try {
            const score = await sdk.reputation.getScore(target);
            addLog(`Reputation Score: ${score.total}/100`);
            addLog(`   > Internal Work: ${score.internal.score}`);
            addLog(`   > DeFi Score: ${score.external.defiScore}`);
        } catch (e: any) {
            addLog(`Reputation Check Failed: ${e.message}`);
        }
    };

    const simulateTx = async () => {
        if (!sdk) return addLog("Initialize SDK first");

        addLog(`Simulating Transaction...`);
        try {
            // Note: In real scenarios needs active session
            // For this test bench we might hit "User not authenticated" if not logged in
            const txHash = await sdk.transactions.send("0xRecipient...", "1.0", "USDC");
            addLog(`Transaction Sent! Hash: ${txHash}`);
        } catch (e: any) {
            addLog(`Tx Failed: ${e.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <img
                            src="/assets/branding/arcworker-full.png"
                            alt="ArcWorker Protocol"
                            className="h-10 w-auto"
                        />
                        <div className="h-8 w-px bg-slate-200"></div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase">SDK Test Bench</h1>
                    </div>
                    <div className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">v1.0.0-beta</div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT COLUMN: Controls */}
                    <div className="space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">

                        {/* 1. Initialization */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Initialization</h3>
                            <button
                                onClick={initSDK}
                                disabled={!!sdk}
                                className={`px-4 py-3 rounded-xl font-bold w-full text-sm transition-all ${sdk ? 'bg-green-50 text-green-700 border border-green-200 cursor-default' : 'bg-[#005ddb] hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'}`}
                            >
                                {sdk ? 'SDK Initialized' : 'Initialize ArcWorker SDK'}
                            </button>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Authentication</h3>
                            <input
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-3 text-sm focus:outline-none focus:border-[#005ddb] transition-colors"
                                placeholder="user@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleLogin}
                                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                                >
                                    Headless Login
                                </button>

                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    disabled={!sdk}
                                    className={`px-4 py-3 rounded-xl font-bold text-sm border transition-all ${!sdk ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-[#005ddb] border-blue-100 hover:border-blue-300 hover:shadow-md'}`}
                                >
                                    Open Modal UI
                                </button>
                            </div>

                            {address && (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-blue-400 uppercase">Active Session</span>
                                        <span className="text-xs font-mono font-bold text-blue-800">{address.slice(0, 6)}...{address.slice(-4)}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (sdk) {
                                                sdk.auth.logout();
                                                setAddress('');
                                                addLog("Logged out.");
                                            }
                                        }}
                                        className="text-xs font-bold text-red-500 hover:text-red-700"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Modal Integration */}
                        {sdk && (
                            <ConnectModal
                                isOpen={isModalOpen}
                                onClose={() => setIsModalOpen(false)}
                                onSuccess={(addr: string) => {
                                    setAddress(addr);
                                    addLog(`UI Kit Login Success! Wallet: ${addr}`);
                                }}
                            />
                        )}
                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Modules</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={checkReputation} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs transition-colors">
                                    Check Reputation
                                </button>
                                <button onClick={simulateTx} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs transition-colors">
                                    Send Transaction
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Console */}
                    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 font-mono text-xs overflow-y-auto h-[600px] shadow-2xl">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                            <span className="text-slate-400 font-bold uppercase tracking-wider">System Logs</span>
                            <button onClick={() => setLogs([])} className="text-slate-600 hover:text-slate-400">Clear</button>
                        </div>
                        <div className="space-y-2">
                            {logs.map((log, i) => (
                                <div key={i} className="text-slate-300 border-l-2 border-slate-800 pl-3 py-1">
                                    {log}
                                </div>
                            ))}
                            {logs.length === 0 && <div className="text-slate-700 italic">Ready...</div>}
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------------------------
                    UI KIT: TASK FEED
                   --------------------------------------------------------------------------- */}
                <div className="mt-12 pt-12 border-t border-slate-200">
                    <div className="mb-8">
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">
                            Gig-in-a-Box: Task Feed
                        </h3>
                        <p className="text-slate-500 max-w-2xl">
                            Embeddable widget for decentralized work. Drop this component into any app to instantly offer tasks to your users.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Full Component</h4>
                            <TaskFeed
                                onTaskClick={(t) => addLog(`Clicked task: ${t.title} ($${t.reward})`)}
                            />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sidebar Widget (Compact)</h4>
                            <div className="max-w-sm">
                                <TaskFeed
                                    tag="AI"
                                    limit={3}
                                    compact={true}
                                    showHeader={true}
                                    onTaskClick={(t) => addLog(`Clicked AI task: ${t.title}`)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------------------------
                    UI KIT: REPUTATION CARD
                   --------------------------------------------------------------------------- */}
                <div className="mt-12 pt-12 border-t border-slate-200 mb-20">
                    <div className="mb-8">
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">
                            Gig-in-a-Box: Identity
                        </h3>
                        <p className="text-slate-500 max-w-2xl">
                            Visual credit layer for underwriting and trust.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Gold Tier User</h4>
                            <ReputationCard address="0x1234567890abcdef1234567890abcdef12345678" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Compact Variant</h4>
                            <ReputationCard address="0x987..." variant="compact" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
