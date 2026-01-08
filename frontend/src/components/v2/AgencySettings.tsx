import React from 'react';
import { Book, Copy, PlusCircle } from 'lucide-react';
import { AgencySidebar } from './AgencySidebar';

interface AgencySettingsProps {
    onNavigate: (page: any) => void;
    onWalletOpen?: () => void;
}

export const AgencySettings: React.FC<AgencySettingsProps> = ({ onNavigate, onWalletOpen }) => {
    const [user, setUser] = React.useState<any>(null);
    const [circleAddress, setCircleAddress] = React.useState<string | null>(null);

    React.useEffect(() => {
        const storedUser = localStorage.getItem('arc_user');
        if (storedUser) setUser(JSON.parse(storedUser));

        const cachedAddress = localStorage.getItem('arc_wallet_address');
        if (cachedAddress) setCircleAddress(cachedAddress);
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
            <AgencySidebar activePage="settings" onNavigate={onNavigate} onWalletOpen={onWalletOpen} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-8 shadow-sm shrink-0">
                    <h1 className="text-xl font-bold text-gray-900">Agency Settings</h1>
                    <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
                        Save Changes
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 max-w-4xl">

                    {/* API Keys Section */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Developer API Keys</h2>
                                <p className="text-sm text-gray-500">Use these keys to programmatically create task batches.</p>
                            </div>
                            <button className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                                <Book className="w-3 h-3" /> Read Documentation
                            </button>
                        </div>

                        <div className="bg-gray-900 rounded-lg p-4 flex items-center justify-between group">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Production Key</p>
                                <code className="text-green-400 font-mono text-sm">sk_live_9283-....-9283</code>
                            </div>
                            <button className="text-gray-400 hover:text-white transition">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Regenerate Key</button>
                            <button className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 text-red-600">Revoke</button>
                        </div>
                    </section>

                    {/* Funding & Billing */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Escrow Funding Source</h2>

                        <div className="flex items-center gap-4 p-4 border border-blue-200 bg-blue-50 rounded-lg mb-4">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Ethereum-icon-purple.svg/480px-Ethereum-icon-purple.svg.png" className="w-5 h-5" alt="ETH" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-900">Circle Programmable Wallet (USDC)</p>
                                <p className="text-xs text-gray-600 font-mono">{circleAddress || 'Not Connected'}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${circleAddress ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                {circleAddress ? 'Active' : 'Missing'}
                            </span>
                        </div>

                        <button className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium">
                            <PlusCircle className="w-4 h-4" /> Add Credit Card (Stripe)
                        </button>
                    </section>

                    {/* Team Members */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Team Members</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                        {user?.username?.charAt(0).toUpperCase() || 'A'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{user?.username || 'You'} (Owner)</p>
                                        <p className="text-xs text-gray-500">{user?.email || 'No email set'}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400">Admin</span>
                            </div>
                            <div className="flex items-center justify-between opacity-60">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs">JM</div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">John Manager</p>
                                        <p className="text-xs text-gray-500">john@shelfvision.ai</p>
                                    </div>
                                </div>
                                <button className="text-red-500 text-xs hover:underline">Remove</button>
                            </div>
                        </div>
                        <button className="mt-6 w-full py-2 border border-dashed border-gray-300 rounded text-gray-500 text-sm hover:border-gray-400 hover:text-gray-700">
                            Invite Team Member
                        </button>
                    </section>

                </div>
            </main>
        </div>
    );
};
