import React from 'react';
import { LayoutDashboard, ClipboardCheck, History, Wallet, Settings, LogOut, Search } from 'lucide-react';
import { AuthModule } from '@/arcworker-sdk/auth';

type WorkerPage = 'dashboard' | 'market' | 'submissions' | 'earnings' | 'settings';

interface WorkerSidebarProps {
    activePage: WorkerPage;
    onNavigate: (page: WorkerPage) => void;
    onWalletOpen?: () => void;
}

export const WorkerSidebar: React.FC<WorkerSidebarProps> = ({ activePage, onNavigate, onWalletOpen }) => {
    const [user, setUser] = React.useState<any>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('arc_user');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                console.error("Error parsing user data", e);
            }
        }
    }, []);

    return (
        <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col shrink-0 h-screen font-sans">
            <div className="h-16 flex items-center px-6 border-b border-gray-800">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-lg shadow-blue-900/40">W</div>
                <span className="font-bold text-white text-lg tracking-tight">ArcWorker</span>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                <button
                    onClick={() => onNavigate('dashboard')}
                    className={`nav - item w - full flex items - center px - 4 py - 3 rounded - lg transition ${activePage === 'dashboard' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'} `}
                >
                    <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
                </button>
                <button
                    onClick={() => onNavigate('market')}
                    className={`nav - item w - full flex items - center px - 4 py - 3 rounded - lg transition ${activePage === 'market' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'} `}
                >
                    <Search className="w-5 h-5 mr-3" /> Task Market
                </button>
                <button
                    onClick={() => onNavigate('submissions')}
                    className={`nav - item w - full flex items - center px - 4 py - 3 rounded - lg transition ${activePage === 'submissions' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'} `}
                >
                    <ClipboardCheck className="w-5 h-5 mr-3" /> My Submissions
                </button>
                <button
                    onClick={() => onNavigate('earnings')}
                    className={`nav - item w - full flex items - center px - 4 py - 3 rounded - lg transition ${activePage === 'earnings' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'} `}
                >
                    <History className="w-5 h-5 mr-3" /> Earnings History
                </button>
                <button
                    onClick={() => onNavigate('settings')}
                    className={`nav - item w - full flex items - center px - 4 py - 3 rounded - lg transition ${activePage === 'settings' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'} `}
                >
                    <Settings className="w-5 h-5 mr-3" /> Settings
                </button>
            </nav>

            <div className="p-4 border-t border-gray-800 space-y-3">
                <button
                    onClick={onWalletOpen}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-900/20"
                >
                    <Wallet className="w-4 h-4" /> My Wallet
                </button>

                <div className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/10 flex items-center justify-center text-white text-xs font-bold">
                        {user?.username?.charAt(1).toUpperCase() || 'W'}
                    </div>
                    <div className="overflow-hidden">
                        <h4 className="text-sm font-bold text-white truncate">{user?.username || 'Worker Account'}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{user?.role || 'Protocol Agent'}</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        AuthModule.clearAllSessions();
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
