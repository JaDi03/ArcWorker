'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { useRouter, usePathname } from 'next/navigation';

import { ArcWorkerCardLogo } from './ui/BrandAssets';
import RevenueWithdrawModal from './RevenueWithdrawModal';
import UsernameRegistrationModal from './UsernameRegistrationModal';
import WalletDashboardModal from './WalletDashboardModal';

const navigation = [
    { name: 'Platform Overview', href: '/admin' },
    // { name: 'User Management', href: '/admin/users' }, // Future
    // { name: 'Treasury', href: '/admin/treasury' }, // Future
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { address, isConnected, status } = useAccount();
    const { disconnect } = useDisconnect();
    const { connectors, connect } = useConnect();
    const [mounted, setMounted] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [circleAddress, setCircleAddress] = useState<string | null>(null);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const currentAddress = address || circleAddress;

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('arc_user');
        if (saved) {
            const parsed = JSON.parse(saved);
            setProfile(parsed);
        }
    }, []);

    useEffect(() => {
        if (isConnected && profile && !profile.name) {
            setIsRegisterOpen(true);
        }
    }, [isConnected, profile]);

    const handleLogout = () => {
        localStorage.removeItem('arc_user');
        localStorage.removeItem('arc_session_token');
        localStorage.removeItem('arc_encryption_key');
        disconnect();
        router.push('/');
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Sidebar Admin */}
            <aside
                className="w-64 border-r border-slate-800 hidden md:flex flex-col fixed h-full z-10 shadow-2xl bg-slate-900"
            >
                <div className="p-6 border-b border-white/10 flex justify-start">
                    <Link href="/" className="flex items-center justify-start pl-2 hover:opacity-80 transition-opacity">
                        <ArcWorkerCardLogo className="w-40 filter brightness-0 invert" />
                        <span className="ml-2 text-[10px] bg-red-600 text-white px-1 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-4">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all group ${isActive ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}

                    <div className="mt-8 px-4 space-y-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">System Actions</p>
                        <button
                            onClick={() => setIsWithdrawModalOpen(true)}
                            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 transition-all hover:-translate-y-0.5"
                        >
                            <span>💸</span>
                            <span>Claim Revenue</span>
                        </button>

                        <button
                            onClick={() => setIsWalletOpen(true)}
                            className="w-full flex items-center justify-center space-x-2 bg-white/5 text-slate-300 font-bold py-3 rounded-xl border border-white/5 hover:bg-white/10 transition-all hover:text-white"
                        >
                            <span>💳</span>
                            <span>Admin Wallet</span>
                        </button>
                    </div>

                    <div className="mt-8 px-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">System Status</p>
                        <div className="flex items-center space-x-2 text-xs text-green-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span>Operational</span>
                        </div>
                    </div>
                </nav>

                <div className="p-4 border-t border-white/10 bg-black/20">
                    <div className="flex items-center px-4 py-3 mb-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">Administrator</p>
                            <p className="text-[10px] text-slate-400 truncate opacity-80">
                                {mounted && currentAddress ? `${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}` : 'Disconnected'}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-6 md:p-10 pt-20 md:pt-10">
                {children}
            </main>

            <RevenueWithdrawModal
                isOpen={isWithdrawModalOpen}
                onClose={() => setIsWithdrawModalOpen(false)}
                currentRevenue={0}
            />
            <UsernameRegistrationModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
            <WalletDashboardModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
        </div>
    );
}
