'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ArcWorkerLogo, CircleLogoLanding, ArcNetworkLogo } from '@/components/ui/BrandAssets';
import { Zap, Globe, Shield, ArrowRight, CheckCircle2, Layout, Users, Wallet, Cpu } from 'lucide-react';
import { UserSetupModal } from '@/components/UserSetupModal';

export default function DesignPreview() {
    const router = useRouter();
    const { isConnected } = useAccount();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
    const [preselectedRole, setPreselectedRole] = useState<'worker' | 'agency' | 'developer' | undefined>(undefined);
    const [user, setUser] = useState<any>(null);

    // Initial check for local user to update UI
    useEffect(() => {
        const stored = localStorage.getItem('arc_user');
        if (stored) {
            setUser(JSON.parse(stored));
        }
    }, [isConnected]);

    const openAuth = (mode: 'register' | 'login', role?: 'worker' | 'agency') => {
        setAuthMode(mode);
        setPreselectedRole(role);
        setIsAuthModalOpen(true);
    };

    const handleAuthComplete = (userData: any) => {
        setUser(userData);
        window.dispatchEvent(new Event('storage'));

        // Redirect based on role
        if (userData.role === 'agency') {
            router.push('/agency/dashboard');
        } else {
            router.push('/worker/dashboard');
        }
    };


    return (
        <div className="bg-slate-50 min-h-screen font-sans selection:bg-blue-100 text-slate-900">
            {/* Auth Modal */}
            <UserSetupModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialMode={authMode}
                preselectedRole={preselectedRole}
                onComplete={handleAuthComplete}
            />

            {/* --- NAVBAR (Mock) --- */}
            <nav className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Official Logo Component */}
                        <ArcWorkerLogo className="w-48 h-12" />
                    </div>

                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
                        <a href="#solutions" className="hover:text-[#2874ca] transition-colors">Solutions</a>
                        <a href="#how-it-works" className="hover:text-[#2874ca] transition-colors">How it Works</a>
                        <a href="#business" className="hover:text-[#2874ca] transition-colors">For Business</a>
                        <a href="#talent" className="hover:text-[#2874ca] transition-colors">For Talent</a>
                    </div>

                    <div className="flex items-center space-x-4">
                        {user || isConnected ? (
                            <div className="flex items-center gap-3 bg-white border border-slate-200 p-1.5 pr-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                onClick={() => user?.role === 'agency' ? router.push('/agency/dashboard') : router.push('/worker/dashboard')}>
                                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-100 group-hover:scale-105 transition-transform">
                                    {user?.username?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-900 leading-tight">@{user?.username || 'User'}</span>
                                    <span className="text-[10px] font-bold text-[#00b87b] uppercase tracking-wider">Dashboard →</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#00b87b] animate-pulse" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol status: Online</span>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 text-center">

                    {/* Badge - Green for "Live/Status" */}
                    <div className="inline-flex items-center gap-2 bg-[#f0fdf4] border border-[#00b87b]/20 px-4 py-1.5 rounded-full mb-8">
                        <div className="w-2 h-2 rounded-full bg-[#00b87b] animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[#00b87b]">ArcWorker V2 Live</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-[1.1]">
                        The Liquidity Layer for <br />
                        <span className="text-[#2874ca]">Digital Work</span>
                    </h1>

                    <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Microtasks, Freelance, and AI Training. Paid instantly in USDC. <br className="hidden md:block" />
                        Secure, global, and fee-efficient.
                    </p>

                    {/* Trust Row - Perfectly Aligned */}
                    <div className="flex flex-col md:flex-row items-start justify-center gap-8 md:gap-20 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 opacity-90">

                        {/* Group 1: Arc */}
                        <div className="flex flex-col items-center group cursor-default">
                            {/* Text Line - Darker for visibility */}
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 h-4 flex items-center">Powered by</span>
                            {/* Logo Box - Fixed height for vertical alignment */}
                            <div className="h-12 flex items-center justify-center">
                                <ArcNetworkLogo className="w-28 opacity-90 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" />
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden md:block w-px h-12 bg-slate-200/50 mt-2" />

                        {/* Group 2: Circle */}
                        <div className="flex flex-col items-center group cursor-default">
                            {/* Text Line - Darker for visibility */}
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 h-4 flex items-center">Secured by</span>
                            {/* Logo Box - Fixed height for vertical alignment */}
                            <div className="h-12 flex items-center justify-center">
                                <CircleLogoLanding className="w-36 opacity-90 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- THE SPLIT (Core User Types) --- */}
            <section className="max-w-7xl mx-auto px-6 pb-24 -mt-12">
                <div className="grid md:grid-cols-2 gap-8">

                    {/* TALENT CARD - Green Accents for "Money/Growth" */}
                    <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-[#00b87b]/10 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users size={120} className="text-[#2874ca] -rotate-12 transform translate-x-8 -translate-y-8" />
                        </div>

                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-[#2874ca]">
                                <Users size={28} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-3">I want to Earn</h2>
                            <p className="text-slate-500 mb-8 text-lg leading-relaxed">
                                Turn your time into digital dollars. Access global tasks, train AI models, and get paid instantly with no minimums.
                            </p>

                            <ul className="space-y-3 mb-10">
                                {['Instant USDC Settlements', 'No Bank Account Required', 'Build On-Chain Reputation'].map((item, i) => (
                                    <li key={i} className="flex items-center text-slate-600 font-medium">
                                        {/* Brand Green Checkmark */}
                                        <CheckCircle2 size={18} className="text-[#00b87b] mr-3" />
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => openAuth('register', 'worker')}
                                className="w-full bg-[#2874ca] hover:bg-[#1d5ca3] text-white py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                            >
                                Join Workforce <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* BUSINESS CARD - Blue Accents for "Scale/Corporate" */}
                    <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Layout size={120} className="text-[#2874ca] -rotate-12 transform translate-x-8 -translate-y-8" />
                        </div>

                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-[#2874ca]">
                                <Layout size={28} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-3">I want to Hire</h2>
                            <p className="text-slate-500 mb-8 text-lg leading-relaxed">
                                Crowdsource globally via API or UI. Scale your data labeling and microtasks with programmatic payments.
                            </p>

                            <ul className="space-y-3 mb-10">
                                {['API-First Integration', 'Automated QA & Consensus', 'Pay only for Valid Work'].map((item, i) => (
                                    <li key={i} className="flex items-center text-slate-600 font-medium">
                                        <CheckCircle2 size={18} className="text-[#2874ca] mr-3" />
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <div className="relative group/btn">
                                <button
                                    disabled={process.env.NODE_ENV !== 'development'}
                                    onClick={() => process.env.NODE_ENV === 'development' && openAuth('register', 'agency')}
                                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all 
                                        ${process.env.NODE_ENV === 'development'
                                            ? 'bg-white text-[#2874ca] border-2 border-[#2874ca] hover:bg-blue-50 cursor-pointer group-hover:scale-[1.02]'
                                            : 'bg-white text-gray-400 border-2 border-gray-200 cursor-not-allowed'}`}
                                >
                                    Create Campaign <ArrowRight size={20} />
                                </button>
                                {process.env.NODE_ENV !== 'development' && (
                                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs font-bold py-2 px-3 rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                        🚧 Private Beta: Invitation Only
                                    </div>
                                )}
                                {process.env.NODE_ENV === 'development' && (
                                    <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono">
                                        DEV MODE: ENABLED
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PROTOCOL SOLUTIONS (SDK & Yields) --- */}
            <section id="solutions" className="py-24 bg-slate-50 border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Protocol Solutions</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                            Built for liquidity. Programmatic payouts and automated yield generation for every participant.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">

                        {/* RIGHT: SDK (Placement swapped for visual flow?) Let's stick to plan: Left Yield, Right SDK or vice versa. 
                           User plan: Left (Developers), Right (Yield). Let's do that.
                        */}

                        {/* LEFT: Developer SDK */}
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg text-[#2874ca]">
                                        <Layout size={24} />
                                    </div>
                                    Build with Arc SDK
                                </h3>
                                <p className="text-slate-500 leading-relaxed text-lg">
                                    Automate your workforce. Integrate gloabl payouts into your dApp or platform with just a few lines of code.
                                </p>
                            </div>

                            {/* Code Snippet */}
                            <div className="bg-[#1e293b] rounded-2xl p-6 shadow-2xl overflow-hidden font-mono text-sm relative group border border-slate-700">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="ml-auto text-xs text-slate-400">campaign.ts</span>
                                </div>
                                <div className="text-blue-300">import <span className="text-white">{`{ Arc }`}</span> from <span className="text-green-400">'@arc/sdk'</span>;</div>
                                <div className="text-slate-400 mt-2">{`// Pay 1,000+ workers instantly`}</div>
                                <div className="text-purple-400 mt-1">await <span className="text-blue-300">Arc</span>.<span className="text-yellow-300">pay</span>({`{`}</div>
                                <div className="pl-4 text-white">amount: <span className="text-orange-400">5000</span>, <span className="text-slate-500">{`// USDC`}</span></div>
                                <div className="pl-4 text-white">campaignId: <span className="text-green-400">'label-data-v1'</span>,</div>
                                <div className="pl-4 text-white">workers: [<span className="text-green-400">'verified-set'</span>]</div>
                                <div className="text-purple-400">{`}`});</div>
                            </div>
                        </div>

                        {/* RIGHT: Smart Yields (USYC) */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5">
                                <Shield size={140} className="text-[#00b87b]" />
                            </div>

                            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg text-[#00b87b]">
                                    <Zap size={24} />
                                </div>
                                Powered by USYC
                            </h3>

                            <div className="space-y-6">
                                <p className="text-slate-500 text-lg leading-relaxed">
                                    Your idle capital never sleeps. Arc Protocol automatically routes treasury funds to
                                    <strong className="text-slate-900"> Hashnote's USYC</strong>,
                                    generating institutional-grade yield backed by Real World Assets.
                                </p>

                                <div className="bg-[#f0fdf4] rounded-xl p-5 border border-[#00b87b]/20 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-[#00b87b] uppercase tracking-wider mb-1">Current APY</div>
                                        <div className="text-3xl font-black text-slate-900">~5.12%</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Asset</div>
                                        <div className="text-sm font-bold text-slate-700">Short Duration Yield Utility Token</div>
                                    </div>
                                </div>

                                <ul className="space-y-2 text-sm text-slate-500 font-medium">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#00b87b]" /> Short-term US Treasury Bills</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#00b87b]" /> Reverse Repurchase Agreements</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#00b87b]" /> Fully Liquid & Permissioned</li>
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS (3-Step Flow) --- */}
            <section id="how-it-works" className="py-24 bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">How it Works</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                            A seamless flow from funding to settlement. No intermediaries, just code.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line (Desktop Only) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-100 -z-10" />

                        {/* Step 1 */}
                        <div className="relative text-center group">
                            <div className="w-24 h-24 bg-white border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-50 group-hover:scale-110 transition-transform duration-300">
                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[#2874ca]">
                                    <Wallet size={24} />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">1. Connect & Deposit</h3>
                            <p className="text-slate-500 leading-relaxed px-4">
                                Businesses fund the smart contract vault with USDC. Capital is instantly secured on-chain.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="relative text-center group">
                            <div className="w-24 h-24 bg-white border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-50 group-hover:scale-110 transition-transform duration-300 delay-100">
                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[#2874ca]">
                                    <Cpu size={24} />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">2. Execute & Verify</h3>
                            <p className="text-slate-500 leading-relaxed px-4">
                                Talent or AI Agents complete tasks. Validations run automatically via API or Consensus.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="relative text-center group">
                            <div className="w-24 h-24 bg-white border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-50 group-hover:scale-110 transition-transform duration-300 delay-200">
                                <div className="w-12 h-12 bg-[#f0fdf4] rounded-full flex items-center justify-center text-[#00b87b]">
                                    <Zap size={24} />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">3. Instant Settle</h3>
                            <p className="text-slate-500 leading-relaxed px-4">
                                Payment triggers automatically the moment work is verified. Yields are paid out daily.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOR BUSINESS (Enterprise Infrastructure) --- */}
            <section id="business" className="py-24 bg-slate-50 border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row gap-16 items-center">
                        <div className="flex-1">
                            <div className="inline-block px-3 py-1 bg-blue-100 text-[#2874ca] rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                                Enterprise Infrastructure
                            </div>
                            <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Scale with Confidence.</h2>
                            <p className="text-slate-500 text-lg leading-relaxed mb-8">
                                Whether you're a startup or an enterprise, Arc provides the liquidity layer to manage a global workforce.
                            </p>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#2874ca] flex-shrink-0">
                                        <Layout size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900">Flexible Launch</h4>
                                        <p className="text-slate-500">Launch via our intuitive UI Dashboard or integrate directly via API.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#2874ca] flex-shrink-0">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900">Smart Validation</h4>
                                        <p className="text-slate-500">Pay only for valid results. Set consensus rules automatically.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#2874ca] flex-shrink-0">
                                        <Zap size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900">Direct Settlement</h4>
                                        <p className="text-slate-500">Funds go directly to workers. No agency markups.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Visual Placeholder for Business - Code or UI Mock could go here. Keeping text focused for now or simple graphic. */}
                        <div className="flex-1 bg-white p-8 rounded-3xl border border-gray-100 shadow-2xl">
                            <div className="space-y-4">
                                <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
                                <div className="h-8 w-3/4 bg-slate-200 rounded animate-pulse mb-8" />
                                <div className="space-y-2">
                                    <div className="h-12 w-full bg-blue-50 rounded-xl border border-blue-100 flex items-center px-4">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-3" />
                                        <span className="text-sm font-medium text-slate-600">Campaign: Data Labeling V1</span>
                                    </div>
                                    <div className="h-12 w-full bg-green-50 rounded-xl border border-green-100 flex items-center px-4">
                                        <div className="w-2 h-2 rounded-full bg-green-500 mr-3" />
                                        <span className="text-sm font-medium text-slate-600">Status: 98% Validated</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOR TALENT (Work Your Way) --- */}
            <section id="talent" className="py-24 bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row-reverse gap-16 items-center">
                        <div className="flex-1">
                            <div className="inline-block px-3 py-1 bg-green-100 text-[#00b87b] rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                                For Talent
                            </div>
                            <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Work Freedom.</h2>
                            <p className="text-slate-500 text-lg leading-relaxed mb-8">
                                Connect your wallet and start earning. No bank accounts, no minimums, no waiting.
                            </p>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl shadow-sm flex items-center justify-center text-[#00b87b] flex-shrink-0">
                                        <Wallet size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900">Instant Global Payments</h4>
                                        <p className="text-slate-500">Receive USDC directly to your wallet immediately after approval.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl shadow-sm flex items-center justify-center text-[#00b87b] flex-shrink-0">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900">Reputation Passport</h4>
                                        <p className="text-slate-500">Your work history is stored on-chain. Own your professional identity.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl shadow-sm flex items-center justify-center text-[#00b87b] flex-shrink-0">
                                        <Globe size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900">Work Anywhere</h4>
                                        <p className="text-slate-500">Accessible from 150+ countries. Permissionless access.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Visual Placeholder for Talent (Light Theme) */}
                        <div className="flex-1 bg-white p-8 rounded-3xl border border-gray-100 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-5 text-[#00b87b]">
                                <Zap size={140} />
                            </div>
                            <div className="relative z-10">
                                <div className="text-sm text-slate-500 uppercase tracking-widest mb-1">Current Balance</div>
                                <div className="text-5xl font-mono font-bold text-slate-900 mb-2">$845.50</div>
                                <div className="inline-flex items-center gap-2 bg-[#f0fdf4] border border-[#00b87b]/20 px-3 py-1 rounded-full text-[#00b87b] text-xs font-bold mb-8">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#00b87b] animate-pulse" />
                                    Live Yield Active
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="text-sm text-slate-500">Data Labeling Task #892</span>
                                        <span className="text-sm font-bold text-[#00b87b]">+$2.50 USDC</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="text-sm text-slate-500">Translation Task #104</span>
                                        <span className="text-sm font-bold text-[#00b87b]">+$15.00 USDC</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- WHY ARC? (Clean Text Banner - Light Version) --- */}
            <section className="py-24 bg-white text-slate-900 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl md:text-5xl font-extrabold mb-12 tracking-tight text-slate-900">
                            Build faster. Scale globally. <br />
                            <span className="text-[#00b87b]">Pay transparently.</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-gray-100">
                        <div className="px-6 py-4">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Borderless</h3>
                            <p className="text-slate-500">Access talent in 150+ countries instantly.</p>
                        </div>
                        <div className="px-6 py-4">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Audited</h3>
                            <p className="text-slate-500">Bank-grade smart contracts & security.</p>
                        </div>
                        <div className="px-6 py-4">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Cost Efficient</h3>
                            <p className="text-slate-500">Save ~30% vs traditional BPO firms.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="bg-slate-50 py-12 border-t border-gray-200 text-center">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    © 2025 ArcWorker Protocol. Powered by Arc Network.
                </p>
            </footer>

        </div>
    );
}
