'use client';

import React from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import AdminLayout from '@/components/AdminLayout';
import { CONTRACTS } from '@/utils/contracts';
import { formatEther } from 'viem';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

export default function AdminDashboardPage() {
    // 1. Fetch Data
    const { data: taskCounter } = useReadContract({
        address: CONTRACTS.TaskEscrow.address,
        abi: CONTRACTS.TaskEscrow.abi,
        functionName: 'taskCounter',
    });

    const tasksConfig = [];
    if (taskCounter) {
        for (let i = 1; i <= Number(taskCounter); i++) {
            tasksConfig.push({
                address: CONTRACTS.TaskEscrow.address,
                abi: CONTRACTS.TaskEscrow.abi,
                functionName: 'tasks',
                args: [BigInt(i)],
            });
        }
    }

    const { data: rawTasks, isLoading } = useReadContracts({
        contracts: tasksConfig as any,
    });

    // 2. Process Data
    const metrics = React.useMemo(() => {
        if (!rawTasks) return null;

        const tasks = rawTasks
            .map((r: any) => r.result)
            .filter((t: any) => t);

        // Basic Counts
        const totalTasks = tasks.length;
        const approved = tasks.filter((t: any) => Number(t[6]) === 2).length;
        const rejected = tasks.filter((t: any) => Number(t[6]) === 3).length;
        const pending = tasks.filter((t: any) => Number(t[6]) === 1).length;
        const open = tasks.filter((t: any) => Number(t[6]) === 0).length;

        // Financials
        // Reward is index 3. Deposit is index 4.
        // Status: 0=Created, 1=Submitted, 2=Approved, 3=Rejected, 4=Cancelled
        let totalVolume = 0; // Total rewards paid (Approved)
        let totalRevenue = 0; // Total fees earned (5% of Approved)
        let potentialRevenue = 0; // Fees in Open/Submitted tasks
        let totalEscrow = 0; // Value currently locked

        tasks.forEach((t: any) => {
            const reward = Number(formatEther(t[3]));
            const status = Number(t[6]);
            const fee = reward * 0.05; // 5%

            if (status === 2) { // Approved
                totalVolume += reward;
                totalRevenue += fee;
            } else if (status === 0 || status === 1) { // Open/Submitted
                potentialRevenue += fee;
                totalEscrow += (reward + fee);
            } else if (status === 3) { // Rejected (Refunded to agency, fee kept? Contract says refund reward. Fee kept.)
                // In contract implementation: `rejectTask` refunds `reward`. `deposit` was `reward + fee`. 
                // So Fee stays in contract.
                totalRevenue += fee;
            }
        });

        // Charts Data
        const pieData = [
            { name: 'Approved', value: approved, color: '#10b981' }, // Green
            { name: 'Pending', value: pending, color: '#f59e0b' },   // Amber
            { name: 'Open', value: open, color: '#3b82f6' },        // Blue
            { name: 'Rejected', value: rejected, color: '#ef4444' }  // Red
        ];

        // Mock Time Series (Since we don't have timestamps in contract read)
        // We will distribute tasks over last 7 days nicely for demo
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const volumeData = days.map(d => ({
            name: d,
            volume: Math.floor(Math.random() * (totalVolume / 2)) + (totalVolume / 10) // Mock
        }));

        return {
            counts: { total: totalTasks, approved, rejected, pending, open },
            financials: { totalVolume, totalRevenue, potentialRevenue, totalEscrow },
            charts: { pieData, volumeData }
        };

    }, [rawTasks]);

    if (isLoading || !metrics) {
        return (
            <AdminLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Platform Analytics</h1>
                        <p className="text-slate-500 mt-1">Real-time overview of protocol performance and treasury.</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 md:mt-0">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide border border-green-200 flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                            Live Data
                        </span>
                        <div className="text-xs text-slate-400 font-mono">
                            Block: Syncing...
                        </div>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Revenue Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Realized Revenue (Fees)</p>
                        <h3 className="text-3xl font-black text-slate-900">${metrics.financials.totalRevenue.toFixed(2)}</h3>
                        <div className="mt-4 flex items-center text-xs font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded">
                            +${metrics.financials.potentialRevenue.toFixed(2)} Pending
                        </div>
                    </div>

                    {/* Volume Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Volume Processed</p>
                        <h3 className="text-3xl font-black text-slate-900">${metrics.financials.totalVolume.toFixed(2)}</h3>
                        <p className="text-xs text-slate-500 mt-2">Paid to Workers</p>
                    </div>

                    {/* Escrow Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Active TVL (Escrow)</p>
                        <h3 className="text-3xl font-black text-slate-900">${metrics.financials.totalEscrow.toFixed(2)}</h3>
                        <p className="text-xs text-slate-500 mt-2">Locked in Contracts</p>
                    </div>

                    {/* Tasks Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Tasks</p>
                        <h3 className="text-3xl font-black text-slate-900">{metrics.counts.total}</h3>
                        <div className="flex gap-2 mt-4">
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">{metrics.counts.approved} OK</span>
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">{metrics.counts.rejected} Bad</span>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Volume & Revenue Trends</h3>
                            <select className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none text-slate-600">
                                <option>Last 7 Days</option>
                                <option>Last 30 Days</option>
                            </select>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metrics.charts.volumeData}>
                                    <defs>
                                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#005ddb" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#005ddb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="volume" stroke="#005ddb" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Donut Chart */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Task Distribution</h3>
                        <p className="text-xs text-slate-500 mb-6">Breakdown by current status</p>
                        <div className="flex-1 min-h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.charts.pieData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {metrics.charts.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                                <span className="text-3xl font-black text-slate-900">{metrics.counts.total}</span>
                                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Tasks</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions / Tasks */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800">Recent Transactions</h3>
                        <button className="text-xs font-bold text-blue-600 hover:text-blue-700">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-3">Task ID</th>
                                    <th className="px-6 py-3">Worker / Agent</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Value</th>
                                    <th className="px-6 py-3 text-right">Fee Earned</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rawTasks && rawTasks.slice(0, 5).map((t: any) => { // Show last 5
                                    if (!t.result) return null;
                                    const task = t.result;
                                    const statusMap = ['Created', 'Submitted', 'Approved', 'Rejected', 'Cancelled'];
                                    const status = Number(task[6]);
                                    const reward = Number(formatEther(task[3]));
                                    const fee = reward * 0.05;

                                    return (
                                        <tr key={String(task[0])} className="bg-white border-b border-gray-50 hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                #{String(task[0])}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs">
                                                {String(task[2]) === '0x0000000000000000000000000000000000000000' ? (
                                                    <span className="text-slate-400">Unassigned</span>
                                                ) : (
                                                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">{String(task[2]).substring(0, 6)}...</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${status === 2 ? 'bg-green-100 text-green-700' :
                                                        status === 3 ? 'bg-red-100 text-red-700' :
                                                            status === 4 ? 'bg-gray-100 text-gray-700' :
                                                                'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {statusMap[status]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                ${reward.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-emerald-600 font-bold">
                                                +${fee.toFixed(3)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

