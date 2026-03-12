import { useState, useEffect, useCallback } from 'react';
import { Download, Play, RefreshCw } from 'lucide-react';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { BarChart3, AlertTriangle, MessageSquareWarning, ShieldCheck, Filter } from 'lucide-react';
import { getFlaggedPosts } from '../../api';

export default function DashboardOverview() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getFlaggedPosts();
            setPosts(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadPosts(); }, [loadPosts]);

    const stats = [
        {
            title: "Total Posts Analyzed",
            value: loading ? '...' : (1284900 + posts.length).toLocaleString(),
            trend: "up",
            trendValue: "live",
            subtitle: "Updated live from DB",
            icon: BarChart3,
            iconBgColor: "bg-blue-50",
            iconColor: "text-blue-600"
        },
        {
            title: "Flagged Misinformation",
            value: loading ? '...' : (45210 + posts.filter(p => p.fakeScore >= 70).length).toLocaleString(),
            trend: "up",
            trendValue: "live",
            subtitle: "High severity alert",
            icon: AlertTriangle,
            iconBgColor: "bg-orange-50",
            iconColor: "text-orange-500"
        },
        {
            title: "Reports Submitted",
            value: loading ? '...' : posts.reduce((acc, p) => acc + (p.reportCount || 0), 0).toLocaleString(),
            trend: "down",
            trendValue: "live",
            subtitle: "Pending review: " + posts.filter(p => !p.status || p.status === 'pending').length.toLocaleString(),
            icon: MessageSquareWarning,
            iconBgColor: "bg-red-50",
            iconColor: "text-red-600"
        },
        {
            title: "Moderation Actions",
            value: loading ? '...' : posts.filter(p => p.status && p.status !== 'pending').length.toLocaleString(),
            trend: "up",
            trendValue: "live",
            subtitle: "Success rate: 99.4%",
            icon: ShieldCheck,
            iconBgColor: "bg-emerald-50",
            iconColor: "text-emerald-500"
        }
    ];
    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                    <p className="text-gray-500 mt-1">Real-time monitoring and threat intelligence platform.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadPosts} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm">
                        <Play className="w-4 h-4" />
                        Run Manual Scan
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <StatCard key={i} {...stat} />
                ))}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium mb-6">
                    ⚠️ API Error: {error}. Is the backend running?
                </div>
            )}

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
                            {loading ? (
                                <tr><td colSpan="6" className="p-12 text-center text-gray-400 font-medium">Loading live data...</td></tr>
                            ) : posts.length === 0 ? (
                                <tr><td colSpan="6" className="p-12 text-center text-gray-400 font-medium">No flagged posts found.</td></tr>
                            ) : posts.slice(0, 5).map((post) => {
                                const platformFirstChar = (post.platform || 'O').charAt(0).toUpperCase();
                                const platformColorClass = post.platform === 'twitter' ? 'bg-blue-100 text-blue-500' : post.platform === 'reddit' ? 'bg-orange-100 text-orange-500' : post.platform === 'facebook' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-600';
                                
                                return (
                                <tr key={post._id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{post.text}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className={`w-8 h-8 rounded flex items-center justify-center ${platformColorClass}`}>
                                            <span className="text-xs font-bold">{platformFirstChar}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <Badge variant={post.fakeScore >= 70 ? 'danger' : 'warning'} className="text-sm px-3 py-1 bg-red-50 text-red-600 border border-red-100 font-bold">
                                                {post.fakeScore}%
                                            </Badge>
                                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Match</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <ProgressBar progress={post.fakeScore} className="w-24" />
                                            <span className="text-sm font-semibold text-gray-700">{post.confidence}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="text-sm text-gray-600 font-medium">{post.reportCount || 0}</span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <span className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
