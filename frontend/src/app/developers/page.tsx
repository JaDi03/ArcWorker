'use client';

import React, { useState, useEffect } from 'react';
import DeveloperLayout from '@/components/DeveloperLayout';

export default function DeveloperDashboard() {
    const [apiKey, setApiKey] = useState('arc_live_9f82d...x2z');
    const [appId, setAppId] = useState('arc-worker-client-v1');
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <DeveloperLayout>
            <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header SECTION */}
                <div className="flex justify-between items-end border-b border-slate-800 pb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">
                            SDK <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Configuration</span>
                        </h1>
                        <p className="text-slate-400 mt-2 text-lg">Manage your integration keys and protocol settings.</p>
                    </div>
                    <div className="flex items-center space-x-3 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                        <span>DEVELOPER PREVIEW V1</span>
                    </div>
                </div>

                {/* API Credentials Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-[#1e293b] rounded-3xl p-8 border border-white/5 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                                <span className="mr-3">🔑</span> API Credentials
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3">Your Application ID</label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            readOnly
                                            value={appId}
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-indigo-300 font-mono text-sm focus:outline-none"
                                        />
                                        <button
                                            onClick={() => handleCopy(appId)}
                                            className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl transition-colors border border-slate-700"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3">Live API Key</label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="password"
                                            readOnly
                                            value={apiKey}
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-400 font-mono text-sm focus:outline-none"
                                        />
                                        <button
                                            onClick={() => handleCopy(apiKey)}
                                            className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl transition-colors border border-slate-700"
                                        >
                                            📋
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 italic px-1">Never share your API keys publicly. This key allows full access to your protocol actions.</p>
                                </div>
                            </div>

                            {copied && (
                                <div className="mt-6 text-center animate-bounce text-indigo-400 text-xs font-bold">
                                    Copied to clipboard! ✨
                                </div>
                            )}
                        </div>

                        {/* Integration Quickstart */}
                        <div className="bg-[#1e293b] rounded-3xl p-8 border border-white/5 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                                <span className="mr-3">🚀</span> Quickstart
                            </h3>
                            <div className="bg-slate-900 rounded-2xl p-6 font-mono text-xs overflow-x-auto border border-slate-800">
                                <p className="text-slate-500 mb-2">// 1. Initialize ArcWorker Engine</p>
                                <p className="text-indigo-400">const<span className="text-white"> engine </span>=<span className="text-white"> new </span><span className="text-purple-400">ArcWorker</span><span className="text-white">({'{ appId:'}</span><span className="text-emerald-400">"{appId}"</span><span className="text-white"> {'}'})</span>;</p>
                                <br />
                                <p className="text-slate-500 mb-2">// 2. Authenticate User</p>
                                <p className="text-indigo-400">await<span className="text-white"> engine.auth.</span><span className="text-purple-400">login</span><span className="text-white">(</span><span className="text-emerald-400">"user@email.com"</span><span className="text-white">);</span></p>
                                <br />
                                <p className="text-slate-500 mb-2">// 3. Send Gasless Transaction</p>
                                <p className="text-indigo-400">await<span className="text-white"> engine.transactions.</span><span className="text-purple-400">send</span><span className="text-white">(</span><span className="text-emerald-400">"0xRecipient..."</span>, <span className="text-emerald-400">"1.5"</span><span className="text-white">);</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl">
                            <h4 className="font-black text-lg mb-4 uppercase tracking-tighter italic">Build the future of Gig-Economy</h4>
                            <p className="text-indigo-100 text-sm leading-relaxed font-medium">
                                The ArcWorker SDK allows you to leverage our gasless infrastructure, universal identity, and escrow system with just a few lines of code.
                            </p>
                            <button className="mt-8 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-sm w-full hover:bg-indigo-50 transition-colors shadow-lg">
                                Read Full Docs
                            </button>
                        </div>

                        <div className="bg-[#1e293b] rounded-3xl p-8 border border-slate-800">
                            <h4 className="font-bold text-white text-sm mb-4">Support</h4>
                            <ul className="space-y-4">
                                <li className="flex items-center text-xs text-slate-400 hover:text-white cursor-pointer transition-colors">
                                    <span className="mr-2">💬</span> Discord Developer Hub
                                </li>
                                <li className="flex items-center text-xs text-slate-400 hover:text-white cursor-pointer transition-colors">
                                    <span className="mr-2">🛠️</span> GitHub Issues
                                </li>
                                <li className="flex items-center text-xs text-slate-400 hover:text-white cursor-pointer transition-colors">
                                    <span className="mr-2">📧</span> Technical Support
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DeveloperLayout>
    );
}
