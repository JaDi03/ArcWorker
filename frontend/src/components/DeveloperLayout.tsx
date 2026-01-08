'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ArcWorkerCardLogo } from './ui/BrandAssets';

const navigation = [
    { name: 'SDK Config', href: '/developers', icon: '⚙️' },
    { name: 'Documentation', href: '/developers/docs', icon: '📚' },
    { name: 'API Explorer', href: '/developers/explorer', icon: '🔍' },
];

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
    const { address, isConnected, status } = useAccount();
    const { disconnect } = useDisconnect();
    const [mounted, setMounted] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('arc_user');
        if (saved) setProfile(JSON.parse(saved));
    }, [address]);

    const handleLogout = () => {
        localStorage.removeItem('arc_user');
        localStorage.removeItem('arc_session_token');
        localStorage.removeItem('arc_encryption_key');
        disconnect();
        router.push('/');
    };

    useEffect(() => {
        const hasLocalSession = localStorage.getItem('arc_user');
        if (mounted && status === 'disconnected' && !isConnected && !address && !hasLocalSession) {
            router.push('/');
        }
    }, [mounted, status, isConnected, router, address]);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex font-sans selection:bg-indigo-500/30">
            {/* Sidebar Developer (Dark/Tech theme) */}
            <aside className="w-64 bg-[#1e293b] text-white hidden md:flex flex-col fixed h-full z-10 shadow-2xl border-r border-slate-800">
                <div className="p-6 border-b border-slate-800 flex justify-center bg-[#1e293b]">
                    <Link href="/" className="w-full flex items-center justify-center hover:opacity-80 transition-opacity">
                        <ArcWorkerCardLogo className="w-48 brightness-110" />
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-4">
                    <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Developer Portal</p>
                    {navigation.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center px-4 py-3 text-sm font-semibold rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group border border-transparent hover:border-slate-700"
                        >
                            <span className="mr-3 text-lg opacity-80 group-hover:scale-110 transition-transform">{item.icon}</span>
                            {item.name}
                        </Link>
                    ))}

                    <div className="pt-4 mt-auto">
                        <Link
                            href="/me"
                            className="flex items-center px-4 py-3 text-sm font-bold rounded-xl bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 transition-all group border border-indigo-500/20"
                        >
                            <span className="mr-3 text-lg group-hover:-translate-x-1 transition-transform">⬅️</span>
                            Return to Profile
                        </Link>
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800 bg-[#1e293b]">
                    <div className="flex items-center px-4 py-3 mb-2 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 mr-3 shadow-lg shadow-indigo-500/20"></div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">{profile?.name || 'Developer'}</p>
                            <p className="text-[10px] text-slate-500 truncate">
                                {mounted && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Auth Active'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all group"
                    >
                        <span className="font-bold text-[10px] uppercase tracking-widest">Terminate Session</span>
                        <span className="group-hover:translate-x-1 transition-transform">🚪</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-6 md:p-10 pt-20 md:pt-10 bg-[#0f172a]">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none"></div>
                <div className="relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
