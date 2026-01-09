import React from 'react';
import { LayoutDashboard, Layers, Users, Settings, LogOut, CheckSquare } from 'lucide-react';
import { ArcWorkerCardLogo } from '@/components/ui/BrandAssets';

type Page = 'overview' | 'campaigns' | 'workforce' | 'settings' | 'review';

interface AgencySidebarProps {
    activePage: Page;
    onNavigate: (page: Page) => void;
    onWalletOpen?: () => void;
}

export const AgencySidebar: React.FC<AgencySidebarProps> = ({ activePage, onNavigate, onWalletOpen }) => {
    const [user, setUser] = React.useState<any>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('arc_user');
        if (stored) setUser(JSON.parse(stored));
    }, []);
    return (
        <aside className="w-64 bg-gradient-to-b from-[#005edc] from-70% to-[#007a53] text-white flex flex-col shrink-0 h-screen font-sans border-r border-white/5">
            <div className="h-20 flex items-center justify-center border-b border-white/10 p-4">
                <ArcWorkerCardLogo className="w-40 h-auto filter brightness-0 invert" />
            </div>

            <nav className="flex-1 p-4 space-y-1">
                <button
                    onClick={() => onNavigate('overview')}
                    className={`nav-item w-full flex items-center px-4 py-3 rounded-lg transition font-medium ${activePage === 'overview' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                >
                    <LayoutDashboard className="w-5 h-5 mr-3" /> Overview
                </button>
                <button
                    onClick={() => onNavigate('campaigns')}
                    className={`nav-item w-full flex items-center px-4 py-3 rounded-lg transition font-medium ${activePage === 'campaigns' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                >
                    <Layers className="w-5 h-5 mr-3" /> Campaigns
                </button>
                <button
                    onClick={() => onNavigate('review')}
                    className={`nav-item w-full flex items-center px-4 py-3 rounded-lg transition font-medium ${activePage === 'review' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                >
                    <CheckSquare className="w-5 h-5 mr-3" /> Review Tasks
                    <span className="ml-auto bg-white/20 text-white border border-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full">12</span>
                </button>
                <button
                    onClick={() => onNavigate('workforce')}
                    className={`nav-item w-full flex items-center px-4 py-3 rounded-lg transition font-medium ${activePage === 'workforce' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                >
                    <Users className="w-5 h-5 mr-3" /> Workforce
                </button>
                <button
                    onClick={() => onNavigate('settings')}
                    className={`nav-item w-full flex items-center px-4 py-3 rounded-lg transition font-medium ${activePage === 'settings' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                >
                    <Settings className="w-5 h-5 mr-3" /> Settings
                </button>
            </nav>

            <div className="p-4 border-t border-white/10 space-y-3">
                <button
                    onClick={onWalletOpen}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-blue-50 text-[#005edc] text-xs font-bold rounded-xl transition shadow-lg shadow-blue-900/20"
                >
                    My Wallet
                </button>

                <div className="flex items-center gap-3 py-2 px-1">
                    <div className="w-9 h-9 rounded-full bg-white text-[#005edc] border-2 border-white/20 flex items-center justify-center text-xs font-bold">
                        {user?.username?.charAt(1).toUpperCase() || 'A'}
                    </div>
                    <div className="overflow-hidden">
                        <h4 className="text-sm font-bold text-white truncate">{user?.username || 'Agency Account'}</h4>
                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">{user?.role || 'Organization'}</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        // Limpiar TODA la sesión y caché
                        Object.keys(localStorage).forEach(key => {
                            if (key.startsWith('arc_')) localStorage.removeItem(key);
                        });
                        window.location.href = '/';
                    }}
                    className="flex items-center px-2 py-2 text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition text-xs font-bold uppercase tracking-wide w-full justify-center"
                >
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </button>
            </div>
        </aside>
    );
};
