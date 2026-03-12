import { useState } from 'react';
import { Filter, Zap, Trash2, Eye, LayoutGrid, ListTodo, AlertCircle, UserX, MailWarning, UserCheck, Bot } from 'lucide-react';
import Badge from '../ui/Badge';
import clsx from 'clsx';

const MOCK_QUEUE = [
    {
        id: "8492-B",
        time: "2 mins ago",
        content: "Hey, check out this amazing offer a...",
        badgeText: "Potential Phishing",
        badgeVariant: "warning",
        riskScore: 94,
        riskLevel: "High",
        reporter: "User_Alpha21",
        isAutoMod: false
    },
    {
        id: "8491-K",
        time: "14 mins ago",
        content: "I think users like you shouldn't be...",
        badgeText: "Hate Speech",
        badgeVariant: "default",
        riskScore: 67,
        riskLevel: "Medium",
        reporter: "AutoMod AI",
        isAutoMod: true
    },
    {
        id: "8490-X",
        time: "22 mins ago",
        content: "Repetitive posting of commercial lin...",
        badgeText: "Spam",
        badgeVariant: "info",
        riskScore: 21,
        riskLevel: "Low",
        reporter: "Mod_Helper",
        isAutoMod: false
    },
    {
        id: "8489-V",
        time: "45 mins ago",
        content: "Profile image and name matches...",
        badgeText: "Impersonation",
        badgeVariant: "danger",
        riskScore: 88,
        riskLevel: "High",
        reporter: "User_Zee09",
        isAutoMod: false
    }
];

export default function ModerationQueue() {
    const [activeTab, setActiveTab] = useState('active');

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Moderation Queue</h2>
                    <p className="text-gray-500 mt-1">Review pending items and maintain community safety standards.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm">
                        <Zap className="w-4 h-4" />
                        Quick Review
                    </button>
                </div>
            </div>

            <div className="flex flex-1 gap-6 items-start">
                {/* Inner Sidebar Menu */}
                <div className="w-64 shrink-0 space-y-8">
                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Moderation</h4>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={clsx("w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                    activeTab === 'overview' ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" /> Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('active')}
                                className={clsx("w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                    activeTab === 'active' ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                <ListTodo className="w-4 h-4" /> Active Queue
                            </button>
                            <button
                                onClick={() => setActiveTab('high')}
                                className={clsx("w-full justify-between flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                    activeTab === 'high' ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                <div className="flex items-center gap-3"><AlertCircle className="w-4 h-4" /> High Priority</div>
                                <span className="bg-red-100 text-red-600 py-0.5 px-2 rounded font-bold text-xs">12</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('restricted')}
                                className={clsx("w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                    activeTab === 'restricted' ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                <UserX className="w-4 h-4" /> Restricted Users
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Filters</h4>
                        <div className="space-y-1">
                            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                <MailWarning className="w-4 h-4" /> Spam Reports
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                <UserCheck className="w-4 h-4" /> Hate Speech
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                <ShieldCheck className="w-4 h-4" /> AI Flagged
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-600 rounded-xl p-4 text-white mt-8">
                        <h4 className="font-semibold text-sm mb-1">Queue Status</h4>
                        <p className="text-blue-100 text-sm mb-3">You've cleared 84% of your daily target.</p>
                        <div className="w-full bg-blue-800 rounded-full h-1.5">
                            <div className="bg-white h-1.5 rounded-full" style={{ width: '84%' }}></div>
                        </div>
                    </div>
                </div>

                {/* Main List Area */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
                                    <th className="px-6 py-4">Report Info</th>
                                    <th className="px-6 py-4">Content Preview</th>
                                    <th className="px-6 py-4">Risk Score</th>
                                    <th className="px-6 py-4">Reporter</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {MOCK_QUEUE.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900">#{item.id}</span>
                                                <span className="text-xs text-gray-500">{item.time}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col items-start gap-1.5">
                                                <p className="text-sm text-gray-900 truncate max-w-[200px] lg:max-w-xs">{item.content}</p>
                                                <Badge variant={item.badgeVariant}>{item.badgeText}</Badge>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={
                                                    item.riskLevel === 'High' ? 'danger' :
                                                        item.riskLevel === 'Medium' ? 'warning' : 'success'
                                                } className="font-bold flex items-center gap-1">
                                                    {item.riskLevel === 'High' && <AlertCircle className="w-3 h-3" />}
                                                    {item.riskLevel}
                                                </Badge>
                                                <span className="text-sm text-gray-500 font-medium">{item.riskScore}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${item.isAutoMod ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                                                    {item.isAutoMod ? <Bot className="w-3.5 h-3.5" /> : item.reporter[0]}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{item.reporter}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded transition-colors hover:bg-blue-700 ml-1">
                                                    Review
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500 bg-gray-50/50 rounded-b-xl">
                        <span>Showing <span className="font-medium text-gray-900">1</span> to <span className="font-medium text-gray-900">10</span> of <span className="font-medium text-gray-900">248</span> reports</span>
                        <div className="flex items-center gap-1">
                            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50" disabled>&lt;</button>
                            <button className="w-8 h-8 flex items-center justify-center rounded border border-blue-600 bg-blue-600 text-white font-medium">1</button>
                            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700">2</button>
                            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700">3</button>
                            <span className="px-2">...</span>
                            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700">25</button>
                            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50">&gt;</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
