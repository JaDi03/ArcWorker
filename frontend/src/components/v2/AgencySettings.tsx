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

                    {/* Agent Connection & API */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Agent Connection & API</h2>
                                <p className="text-sm text-gray-500">Connect your AI Agents to the ArcWorker Protocol using these credentials.</p>
                            </div>
                            <button className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                                <Book className="w-3 h-3" /> Read Agent Ops Docs
                            </button>
                        </div>

                        <div className="bg-gray-900 rounded-lg p-4 flex items-center justify-between group mb-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Agent Secret Key</p>
                                <code className="text-green-400 font-mono text-sm">sk_live_9283-....-9283</code>
                            </div>
                            <button className="text-gray-400 hover:text-white transition">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600">
                            <p className="font-bold mb-1">Quick Start:</p>
                            <code className="bg-gray-200 px-2 py-0.5 rounded text-gray-800 text-xs">npm install @arcworker/agent-kit</code>
                            <p className="mt-2 text-xs">Use the key above to initialize the SDK and start programmatically creating tasks.</p>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Regenerate Key</button>
                        </div>
                    </section>

                    {/* Funding & Billing */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Escrow Funding Source</h2>

                        <div className="flex items-center gap-4 p-4 border border-blue-200 bg-blue-50 rounded-lg mb-4">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 p-1">
                                {/* ARC Logo Placeholder - Ready for asset */}
                                <img
                                    src="/arc-logo-mark.svg"
                                    onError={(e) => {
                                        e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Ethereum-icon-purple.svg/480px-Ethereum-icon-purple.svg.png";
                                        e.currentTarget.style.filter = "grayscale(100%)";
                                    }}
                                    className="w-full h-full object-contain"
                                    alt="ARC"
                                />
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

                </div>
            </main>
        </div>
    );
};
