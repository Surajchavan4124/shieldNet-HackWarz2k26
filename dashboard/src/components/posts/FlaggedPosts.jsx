import { useState } from 'react';
import { Filter, Calendar, BarChart2, CheckCircle, XCircle, Eye, AlertCircle, ChevronDown, Download, Search } from 'lucide-react';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import clsx from 'clsx';

const MOCK_DATA = [
    {
        id: "1",
        content: "Official election results are being manipulated in the southern districts...",
        platform: "Twitter",
        platformColor: "bg-blue-100 text-blue-600",
        fakeScore: 88,
        aiConfidence: 92,
        reports: 142,
        timestamp: "2h ago",
        status: "Flagged",
        statusVariant: "danger"
    },
    {
        id: "2",
        content: "New miracle cure discovered that pharmaceutical companies are hiding...",
        platform: "Reddit",
        platformColor: "bg-orange-100 text-orange-600",
        fakeScore: 95,
        aiConfidence: 98,
        reports: 89,
        timestamp: "4h ago",
        status: "Under Review",
        statusVariant: "warning"
    },
    {
        id: "3",
        content: "Viral video shows unprovoked attack in downtown area last night...",
        platform: "Facebook",
        platformColor: "bg-blue-100 text-blue-800",
        fakeScore: 42,
        aiConfidence: 85,
        reports: 12,
        timestamp: "1d ago",
        status: "Cleared",
        statusVariant: "success"
    },
    {
        id: "4",
        content: "Stock market set to crash tomorrow according to leaked internal memos...",
        platform: "LinkedIn",
        platformColor: "bg-sky-100 text-sky-700",
        fakeScore: 76,
        aiConfidence: 81,
        reports: 56,
        timestamp: "2d ago",
        status: "Flagged",
        statusVariant: "danger"
    },
    {
        id: "5",
        content: "Urgent request for donations to help victims of recent natural disaster...",
        platform: "Instagram",
        platformColor: "bg-pink-100 text-pink-600",
        fakeScore: 91,
        aiConfidence: 94,
        reports: 210,
        timestamp: "3d ago",
        status: "Under Review",
        statusVariant: "warning"
    }
];

export default function FlaggedPosts() {
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Flagged Misinformation</h2>
                    <p className="text-gray-500 mt-1">Review and manage content identified by AI or reported by users.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                        <Download className="w-4 h-4" />
                        Export Data
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">

                {/* Filters Top Bar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative max-w-md w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search post content..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <Filter className="w-4 h-4 text-gray-400" />
                                Platform Filter
                                <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
                            </button>
                        </div>

                        <div className="relative">
                            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <BarChart2 className="w-4 h-4 text-gray-400" />
                                Fake Score: &gt; 80%
                                <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
                            </button>
                        </div>

                        <div className="relative">
                            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                Last 7 Days
                                <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Status Legends */}
                <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-6 bg-white">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Tracking</span>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> Flagged
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Under Review
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Cleared
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
                                <th className="px-6 py-4 w-1/3">Post Content</th>
                                <th className="px-6 py-4">Platform</th>
                                <th className="px-6 py-4 text-center">Fake Score</th>
                                <th className="px-6 py-4">AI Confidence</th>
                                <th className="px-6 py-4 text-center">Reports</th>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {MOCK_DATA.map((post) => (
                                <tr key={post.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{post.content}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={clsx("w-6 h-6 rounded flex items-center justify-center text-xs font-bold", post.platformColor)}>
                                                {post.platform[0]}
                                            </div>
                                            <span className="text-sm text-gray-600 font-medium">{post.platform}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={clsx("text-sm font-bold px-2 py-1 rounded-md",
                                            post.fakeScore > 80 ? 'bg-red-50 text-red-600' :
                                                post.fakeScore > 50 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'
                                        )}>
                                            {post.fakeScore}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 min-w-[100px]">
                                            <ProgressBar progress={post.aiConfidence} className="w-full" color={post.aiConfidence > 90 ? 'bg-blue-600' : 'bg-blue-400'} />
                                            <span className="text-xs font-semibold text-gray-700 w-8">{post.aiConfidence}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm text-gray-600 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{post.reports}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-500">{post.timestamp}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant={post.statusVariant} className="font-bold">
                                            {post.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-colors tooltip-trigger" title="View Analysis">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 hover:bg-green-50 rounded text-gray-500 hover:text-green-600 transition-colors tooltip-trigger" title="Mark Safe">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600 transition-colors tooltip-trigger" title="Remove Content">
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-between items-center text-sm">
                    <span className="text-gray-500">Showing 1 to 5 of 84 flagged posts</span>
                    <div className="flex gap-1">
                        <button className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 border border-blue-600 rounded bg-blue-600 text-white font-medium">1</button>
                        <button className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50">2</button>
                        <button className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50">Next</button>
                    </div>
                </div>

            </div>
        </div>
    );
}
