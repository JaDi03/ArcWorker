'use client';

import React, { useState } from 'react';

interface StepOneDemoProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StepOneDemo({ isOpen, onClose }: StepOneDemoProps) {
    const [selectedCategory, setSelectedCategory] = useState('ai-training');

    if (!isOpen) return null;

    const categories = [
        { id: 'ai-training', icon: '🧠', label: 'AI Training', description: 'RLHF, Data Labeling, and Model Tuning.' },
        { id: 'content-moderation', icon: '🛡️', label: 'Content Moderation', description: 'Review and categorize digital content.' },
        { id: 'market-research', icon: '�', label: 'Market Research', description: 'Surveys and consumer feedback collection.' },
        { id: 'micro-tasks', icon: '⚡', label: 'Micro Tasks', description: 'Quick data entry and small digital jobs.' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header - Aligned with the Step 2 screenshot style */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight">Create New Campaign</h2>
                        <p className="text-sm text-slate-400 font-medium">Step 1 of 3 • Category Selection</p>
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors p-1">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto">
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-6">1. Select Project Category</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`p-6 rounded-2xl border-2 text-left transition-all group ${selectedCategory === cat.id
                                                ? 'border-[#005ddb] bg-blue-50/50 shadow-sm'
                                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 shadow-none'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl mb-4 transition-colors ${selectedCategory === cat.id ? 'bg-blue-100' : 'bg-slate-50 group-hover:bg-slate-100'
                                            }`}>
                                            {cat.icon}
                                        </div>
                                        <p className={`font-bold text-base mb-1 ${selectedCategory === cat.id ? 'text-[#005ddb]' : 'text-slate-700'}`}>
                                            {cat.label}
                                        </p>
                                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                            {cat.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-blue-50/30 rounded-2xl p-6 border border-blue-100/50 flex items-center justify-center text-sm text-blue-600 font-bold space-x-2">
                            <span>Ready to set up your project specifics.</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-between">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Back
                    </button>
                    <button
                        className="px-10 py-2.5 bg-[#005ddb] text-white font-bold rounded-xl hover:bg-[#004bb3] transition-all shadow-lg active:scale-95"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
