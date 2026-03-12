import { Download, Play } from 'lucide-react';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { BarChart3, AlertTriangle, MessageSquareWarning, ShieldCheck, Filter } from 'lucide-react';

const MOCK_STATS = [
    {
        title: "Total Posts Analyzed",
        value: "1,284,930",
        trend: "up",
        trendValue: "12.5%",
        subtitle: "Updated 2m ago",
        icon: BarChart3,
        iconBgColor: "bg-blue-50",
        iconColor: "text-blue-600"
    },
    {
        title: "Flagged Misinformation",
        value: "45,218",
        trend: "up",
        trendValue: "5.2%",
        subtitle: "High severity alert",
        icon: AlertTriangle,
        iconBgColor: "bg-orange-50",
        iconColor: "text-orange-500"
    },
    {
        title: "Reports Submitted",
        value: "12,842",
        trend: "down",
        trendValue: "2.1%",
        subtitle: "Pending review: 156",
        icon: MessageSquareWarning,
        iconBgColor: "bg-red-50",
        iconColor: "text-red-600"
    },
    {
        title: "Moderation Actions",
        value: "8,401",
        trend: "up",
        trendValue: "8.4%",
        subtitle: "Success rate: 99.4%",
        icon: ShieldCheck,
        iconBgColor: "bg-emerald-50",
        iconColor: "text-emerald-500"
    }
];

const MOCK_RECENT_POSTS = [
    {
        id: "1",
        content: "Official election results are being mani...",
        platform: "Twitter",
        platformIcon: "bg-blue-100 text-blue-500",
        fakeScore: 88,
        aiConfidence: 92,
        reports: 142,
        timestamp: "2h ago"
    },
    {
        id: "2",
        content: "New miracle cure discovered for all se...",
        platform: "Reddit",
        platformIcon: "bg-red-100 text-red-500",
        fakeScore: 95,
        aiConfidence: 98,
        reports: 89,
        timestamp: "4h ago"
    }
];

export default function DashboardOverview() {
    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                    <p className="text-gray-500 mt-1">Real-time monitoring and threat intelligence platform.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm">
                        <Play className="w-4 h-4" />
                        Run Manual Scan
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {MOCK_STATS.map((stat, i) => (
                    <StatCard key={i} {...stat} />
                ))}
            </div>

            {/* Recent Flagged Posts */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Recent Flagged Posts</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Posts with high probability of misinformation</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
                                <th className="px-6 py-4 w-1/3">Post Content</th>
                                <th className="px-6 py-4">Platform</th>
                                <th className="px-6 py-4 text-center">Fake Score</th>
                                <th className="px-6 py-4">AI Confidence</th>
                                <th className="px-6 py-4 text-center">Reports</th>
                                <th className="px-6 py-4 text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {MOCK_RECENT_POSTS.map((post) => (
                                <tr key={post.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-medium text-gray-900 font-medium truncate max-w-xs">{post.content}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className={`w-8 h-8 rounded flex items-center justify-center ${post.platformIcon}`}>
                                            {/* Placeholder for platform icon */}
                                            <span className="text-xs font-bold">{post.platform[0]}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <Badge variant="danger" className="text-sm px-3 py-1 bg-red-50 text-red-600 border border-red-100 font-bold">
                                                {post.fakeScore}%
                                            </Badge>
                                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Match</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <ProgressBar progress={post.aiConfidence} className="w-24" />
                                            <span className="text-sm font-semibold text-gray-700">{post.aiConfidence}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="text-sm text-gray-600 font-medium">{post.reports}</span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <span className="text-sm text-gray-500">{post.timestamp}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
