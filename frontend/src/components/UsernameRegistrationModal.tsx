'use client';

import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';
import { ArcWorkerCardLogo } from './ui/BrandAssets';

interface UsernameRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UsernameRegistrationModal({ isOpen, onClose }: UsernameRegistrationModalProps) {
    const [username, setUsername] = useState('');
    const { writeContract, data: hash, error } = useWriteContract();
    const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });
    const { address } = useAccount();

    const handleRegister = () => {
        if (!username || username.length < 3) return;
        writeContract({
            address: CONTRACTS.UserRegistry.address,
            abi: CONTRACTS.UserRegistry.abi,
            functionName: 'register',
            args: [username]
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"></div>

                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <ArcWorkerCardLogo className="w-48" />
                    </div>

                    {isSuccess ? (
                        <div className="text-center animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm">
                                🎉
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Welcome to ArcWorker!</h3>
                            <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                                You are now known as <span className="font-bold text-blue-600">@{username}</span> across the protocol.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all hover:scale-[1.02] hover:shadow-lg"
                            >
                                Let's Build
                            </button>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Claim Your Identity</h2>
                            <p className="text-center text-slate-500 mb-8 max-w-sm mx-auto">
                                Choose a unique username to send & receive funds easily without wallet addresses.
                            </p>

                            <div className="space-y-4">
                                <div className="relative">
                                    <span className="absolute left-4 top-4 text-slate-400 font-bold text-lg">@</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())} // Alphanumeric lowercase
                                        placeholder="username"
                                        maxLength={15}
                                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-bold text-slate-900 outline-none focus:border-blue-600 transition-colors placeholder:text-slate-300"
                                    />
                                    <div className="absolute right-4 top-5 text-xs font-bold text-slate-300">
                                        {username.length}/15
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 text-red-600 text-sm font-semibold rounded-xl border border-red-100 flex items-start">
                                        <span className="mr-2">⚠️</span>
                                        {error.message.includes("Name already taken") ? "This username is already taken." : "Registration failed. Try again."}
                                    </div>
                                )}

                                <button
                                    onClick={handleRegister}
                                    disabled={isLoading || username.length < 3}
                                    className="w-full py-4 bg-[#005ddb] text-white font-bold rounded-2xl hover:bg-blue-600 transition-all hover:scale-[1.02] hover:shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center">
                                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                                            Registering...
                                        </div>
                                    ) : (
                                        "Claim Username"
                                    )}
                                </button>

                                <button onClick={onClose} className="w-full py-2 text-slate-400 text-sm font-bold hover:text-slate-600">
                                    Skip for now
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
