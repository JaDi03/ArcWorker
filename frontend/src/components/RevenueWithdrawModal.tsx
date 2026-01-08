'use client';

import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';
import { formatEther, parseEther } from 'viem';

interface RevenueWithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRevenue: number; // passed from admin dashboard logic or fetched
}

export default function RevenueWithdrawModal({ isOpen, onClose, currentRevenue }: RevenueWithdrawModalProps) {
    const [percentage, setPercentage] = useState(50);
    const { writeContract, data: hash, error } = useWriteContract();
    const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Fetch on-chain accumulated fees just to be sure (or use prop)
    const { data: accumulatedFees } = useReadContract({
        address: CONTRACTS.TaskEscrow.address,
        abi: CONTRACTS.TaskEscrow.abi,
        functionName: 'accumulatedFees',
    });

    const realBalance = accumulatedFees ? Number(formatEther(accumulatedFees as bigint)) : 0;
    const withdrawAmount = (realBalance * (percentage / 100));

    // Handle Withdraw
    const handleWithdraw = () => {
        const amountWei = parseEther(withdrawAmount.toFixed(18)); // Avoid precision errors
        writeContract({
            address: CONTRACTS.TaskEscrow.address,
            abi: CONTRACTS.TaskEscrow.abi,
            functionName: 'withdrawFees',
            args: [amountWei]
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold">Withdraw Revenue</h3>
                        <p className="text-sm text-slate-400">Transfer fees to your wallet</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="p-6">
                    {/* Status Display */}
                    {isSuccess ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
                            <h4 className="text-xl font-bold text-slate-900 mb-2">Withdrawal Successful!</h4>
                            <p className="text-slate-500 mb-6">Funds have been sent to your admin wallet.</p>
                            <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800">
                                Close
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Available to Claim</div>
                                <div className="text-3xl font-black text-slate-900">
                                    ${realBalance.toFixed(2)} <span className="text-sm text-slate-400 font-normal">USDC</span>
                                </div>
                            </div>

                            <div className="mb-8">
                                <div className="flex justify-between text-sm font-bold text-slate-700 mb-4">
                                    <span>Amount to Withdraw</span>
                                    <span className="text-blue-600">${withdrawAmount.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={percentage}
                                    onChange={(e) => setPercentage(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                                    <span>1%</span>
                                    <span>{percentage}%</span>
                                    <span>100%</span>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                    Error: {error.message.substring(0, 100)}...
                                </div>
                            )}

                            <div className="flex space-x-3">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleWithdraw}
                                    disabled={isLoading || realBalance === 0}
                                    className="flex-1 py-3 bg-[#005ddb] text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isLoading ? (
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                                    ) : (
                                        <span className="mr-2">💸</span>
                                    )}
                                    {isLoading ? 'Processing...' : 'Confirm Withdraw'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
