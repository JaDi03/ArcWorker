'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { useRouter, usePathname } from 'next/navigation';

import { ArcWorkerCardLogo } from './ui/BrandAssets';
import WalletDashboardModal from './WalletDashboardModal';
import UsernameRegistrationModal from './UsernameRegistrationModal';

const navigation = [
    { name: 'Explore Tasks', href: '/worker' },
    { name: 'My Tasks', href: '/worker/tasks' },
    { name: 'Earnings', href: '/worker/earnings' },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
    const { address, isConnected, status } = useAccount();
    const { disconnect } = useDisconnect();
    const { connectors, connect } = useConnect();
    const [mounted, setMounted] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [circleAddress, setCircleAddress] = useState<string | null>(null);
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
            const addr = parsed.address || parsed.walletAddress;
            if (addr) setCircleAddress(addr);
            setProfile(parsed);
        }
    }, []);

    // Check for Username Registration logic
    // If connected, profile exists, but no name -> Open Modal
    useEffect(() => {
        if (mounted && isConnected && profile && !profile.name) {
            // Check if we should prompt
            // For MVP, if local profile has no name, prompt.
            // Ideally check contract too, but let's assume sync.
            setIsRegisterOpen(true);
        }
    }, [mounted, isConnected, profile]);


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
            console.log("DashboardLayout: Redirecting to home - Reason: Disconnected and no session.");
            router.push('/');
        }
    }, [mounted, status, isConnected, router, address]);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Sidebar Worker */}
            <aside
                className="w-64 border-r border-gray-100 hidden md:flex flex-col fixed h-full z-10 shadow-2xl"
                style={{ background: 'linear-gradient(160deg, #005edc 0%, #00b87b 100%)' }}
            >
                <div className="p-6 border-b border-white/10 flex justify-start">
                    <Link href="/" className="flex items-center justify-start pl-2 hover:opacity-80 transition-opacity">
                        <ArcWorkerCardLogo className="w-40 filter brightness-0 invert" />
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-4">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all group ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}

                    <div className="pt-4 mt-auto border-t border-white/10 space-y-2">
                        <button
                            onClick={() => setIsWalletOpen(true)}
                            className="w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all group border border-white/10"
                        >
                            My Wallet
                        </button>
                        <Link
                            href="/me"
                            className="flex items-center px-4 py-3 text-sm font-bold rounded-xl bg-transparent text-blue-200 hover:text-white transition-all group opacity-80 hover:opacity-100"
                        >
                            Back to Profile
                        </Link>
                    </div>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div
                        className="flex items-center px-4 py-3 mb-2 rounded-xl bg-white/10 border border-white/5"
                    >
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold mr-3">
                            {(profile?.name || 'W')[0]?.toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">{profile?.name || 'Worker Portal'}</p>
                            <p className="text-[10px] text-blue-200 truncate opacity-80">
                                {mounted && currentAddress ? `${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}` : 'Disconnected'}
                            </p>
                        </div>
                    </div>
                    {mounted && (isConnected || !!circleAddress) ? (
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-100 hover:bg-red-500/20 transition-all group"
                        >
                            <span className="font-bold text-xs uppercase tracking-widest">Logout Account</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => connect({ connector: connectors[0] })}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-100 hover:bg-green-500/20 transition-all group"
                        >
                            <span className="font-bold text-xs uppercase tracking-widest">Connect Wallet</span>
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-6 md:p-10 pt-20 md:pt-10">
                {children}
            </main>

            <WalletDashboardModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
            <UsernameRegistrationModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
        </div>
    );
}
