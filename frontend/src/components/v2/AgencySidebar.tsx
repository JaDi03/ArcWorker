import React from 'react';
import { LayoutDashboard, Layers, Users, Settings, LogOut, CheckSquare } from 'lucide-react';

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
        <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col shrink-0 h-screen font-sans">
            <div className="h-16 flex items-center px-6 border-b border-gray-800">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-lg shadow-blue-900/40">A</div>
                <span className="font-bold text-white text-lg tracking-tight">ArcWorker</span>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                <button
                    onClick={() => onNavigate('overview')}
                    className={`nav-item w-full flex items-center px-4 py-3 rounded-lg transition ${activePage === 'overview' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
                >
                    <LayoutDashboard className="w-5 h-5 mr-3" /> Overview
                </button>
                <button
                    onClick={() => onNavigate('campaigns')}
                    className={`nav-item w-full flex items-center px-4 py-3 rounded-lg transition ${activePage === 'campaigns' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
                >
                    <Layers className="w-5 h-5 mr-3" /> Campaigns
                </button>
                <button
                    onClick={() => onNavigate('review')}
                    className={`nav-item w-full flex items-center px-4 py-3 rounded-lg transition ${activePage === 'review' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
                >
                    <CheckSquare className="w-5 h-5 mr-3" /> Review Tasks
                    <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">12</span>
                </button>
                <button
                    onClick={() => onNavigate('workforce')}
                    className={`nav-item w-full flex items-center px-4 py-3 rounded-lg transition ${activePage === 'workforce' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
                >
                    <Users className="w-5 h-5 mr-3" /> Workforce
                </button>
                <button
                    onClick={() => onNavigate('settings')}
                    className={`nav-item w-full flex items-center px-4 py-3 rounded-lg transition ${activePage === 'settings' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
                >
                    <Settings className="w-5 h-5 mr-3" /> Settings
                </button>
            </nav>

            <div className="p-4 border-t border-gray-800 space-y-3">
                <button
                    onClick={onWalletOpen}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-900/20"
                >
                    My Wallet
                </button>

                <div className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/10 flex items-center justify-center text-white text-xs font-bold">
                        {user?.username?.charAt(1).toUpperCase() || 'A'}
                    </div>
                    <div className="overflow-hidden">
                        <h4 className="text-sm font-bold text-white truncate">{user?.username || 'Agency Account'}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{user?.role || 'Organization'}</p>
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
                    className="flex items-center px-2 py-2 text-red-400 hover:bg-gray-800 rounded-lg transition text-xs font-bold uppercase tracking-wide w-full"
                >
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </button>
            </div>
        </aside>
    );
};
