import React, { useState } from 'react';
import { Plus, Info, Star, Search } from 'lucide-react';
import { AgencySidebar } from './AgencySidebar';

export const AgencyWorkforce: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'top' | 'flagged' | 'groups'>('top');

    // Navigation stub
    const handleNavigate = (page: string) => {
        // In a real app this would use a router
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
            <AgencySidebar activePage="workforce" onNavigate={handleNavigate} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-8 shadow-sm shrink-0">
                    <h1 className="text-xl font-bold text-gray-900">Workforce Management</h1>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                        <Plus className="w-4 h-4" /> Create Private Group
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-8">

                    {/* Explanation Card */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <Info className="w-5 h-5" /> How Worker Management Works
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-blue-800">
                            <div>
                                <strong className="block mb-1 text-blue-900">1. Automated Quality Scores</strong>
                                <p>Our "Golden Set" algorithms automatically verify random tasks. Workers below 80% accuracy are automatically flagged.</p>
                            </div>
                            <div>
                                <strong className="block mb-1 text-blue-900">2. Manual "Elite" Selection</strong>
                                <p>You can verify high-performers manually and add them to "Private Groups". Tasks assigned to these groups ensure 99% quality.</p>
                            </div>
                            <div>
                                <strong className="block mb-1 text-blue-900">3. Contacting Workers</strong>
                                <p>Direct messaging is disabled for security. Instead, send "Bonus Offers" or "Private Invites" directly to their dashboard.</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            onClick={() => setActiveTab('top')}
                            className={`px-6 py-3 border-b-2 font-bold text-sm transition ${activeTab === 'top' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Top Performers
                        </button>
                        <button
                            onClick={() => setActiveTab('flagged')}
                            className={`px-6 py-3 border-b-2 font-bold text-sm transition ${activeTab === 'flagged' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Flagged / Blocked
                        </button>
                        <button
                            onClick={() => setActiveTab('groups')}
                            className={`px-6 py-3 border-b-2 font-bold text-sm transition ${activeTab === 'groups' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Private Groups
                        </button>
                    </div>

                    {/* Worker Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 font-semibold text-gray-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Worker Profile</th>
                                    <th className="px-6 py-4">Reputation Score</th>
                                    <th className="px-6 py-4">Tasks Approved</th>
                                    <th className="px-6 py-4">Accuracy</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {/* Row 1 */}
                                <tr className="hover:bg-gray-50 transition group">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <img src="https://i.pravatar.cc/150?u=882" className="w-10 h-10 rounded-full border border-gray-200" alt="Avatar" />
                                        <div>
                                            <p className="font-bold text-gray-900">Worker_882</p>
                                            <p className="text-xs text-gray-400">Joined Oct 2023</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-blue-600 font-bold">
                                            4.9 <Star className="w-4 h-4 fill-current" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-700 font-mono">1,240</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500 w-[98%]"></div>
                                            </div>
                                            <span className="text-xs font-bold text-green-700">98%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition">
                                        <button className="text-blue-600 font-bold hover:underline text-xs mr-3">Add to Elite Group</button>
                                        <button className="text-gray-400 hover:text-gray-600 text-xs">Details</button>
                                    </td>
                                </tr>

                                {/* Row 2 */}
                                <tr className="hover:bg-gray-50 transition group">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <span className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">JD</span>
                                        <div>
                                            <p className="font-bold text-gray-900">J. Doe</p>
                                            <p className="text-xs text-gray-400">Joined Dec 2023</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-blue-600 font-bold">
                                            4.7 <Star className="w-4 h-4 fill-current" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-700 font-mono">850</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500 w-[94%]"></div>
                                            </div>
                                            <span className="text-xs font-bold text-green-700">94%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition">
                                        <button className="text-blue-600 font-bold hover:underline text-xs mr-3">Add to Elite Group</button>
                                        <button className="text-gray-400 hover:text-gray-600 text-xs">Details</button>
                                    </td>
                                </tr>

                                {/* Spammer Row */}
                                <tr className="hover:bg-red-50/50 transition bg-red-50/20 group">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <span className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">X</span>
                                        <div>
                                            <p className="font-bold text-gray-900">Bot_User_99</p>
                                            <span className="bg-red-100 text-red-600 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Flagged</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-red-500 font-bold">
                                            1.2 <Star className="w-4 h-4 fill-current" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-700 font-mono">45</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-red-500 w-[20%]"></div>
                                            </div>
                                            <span className="text-xs font-bold text-red-700">20%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-bold hover:bg-red-200">BAN USER</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </main>
        </div>
    );
};
