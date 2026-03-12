import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Trash2, AlertOctagon, Filter, Eye, RefreshCw } from 'lucide-react';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { getFlaggedPosts, moderatePost } from '../../api';

export default function ModerationQueue() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getFlaggedPosts();
            setPosts(data.filter(p => !p.status || p.status === 'pending'));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadPosts(); }, [loadPosts]);

    const handleAction = async (postId, action) => {
        setActionLoading(postId);
        try {
            await moderatePost(postId, action);
            setPosts(prev => prev.filter(p => p._id !== postId));
        } catch (err) {
            alert(`Action failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const getRiskDetails = (score) => {
        if (score > 80) return { label: 'High Risk', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' };
        if (score >= 50) return { label: 'Medium Risk', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
        return { label: 'Low Risk', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' };
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Moderation Queue</h2>
                    <p className="text-gray-500 mt-1">Review flagged items pending moderator decisions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadPosts} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                        <Filter className="w-4 h-4" /> Filter Queue
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium">
                    ⚠️ API Error: {error}
                </div>
            )}

            <div className="space-y-4">
                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">Loading flagged posts...</div>
                ) : posts.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">Queue is empty!</div>
                ) : posts.map((item) => {
                    const riskDetails = getRiskDetails(item.fakeScore);
                    const isActioning = actionLoading === item._id;
                    const platformColor = item.platform === 'twitter' ? 'text-blue-500' : item.platform === 'reddit' ? 'text-orange-500' : 'text-blue-700';

                    return (
                        <div key={item._id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col lg:flex-row gap-6">

                                {/* Left: User & Post Content */}
                                <div className="flex-1 flex gap-4 pr-6 lg:border-r border-gray-100">
                                    <div className="w-12 h-12 rounded-full border border-gray-200 shrink-0 bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                                        {(item.platform || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-900 text-sm capitalize">{item.platform}</span>
                                            <span className="text-gray-400 text-xs">•</span>
                                            <span className="text-gray-500 text-xs">{new Date(item.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 leading-relaxed max-w-2xl font-medium italic">
                                            "{item.text}"
                                        </p>
                                        {item.explanation && (
                                            <p className="text-xs text-gray-500 mt-2">{item.explanation}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Middle: AI Scores */}
                                <div className="w-full lg:w-72 shrink-0 flex flex-col justify-center gap-3 px-4 lg:border-r border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Priority</span>
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold ${riskDetails.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${riskDetails.dot}`}></span>
                                            {riskDetails.label}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs font-semibold mb-1">
                                            <span className="text-gray-600">Fake Score ({item.fakeScore}%)</span>
                                            <span className="text-gray-600">Conf ({item.confidence})</span>
                                        </div>
                                        <ProgressBar progress={item.fakeScore} color={item.fakeScore > 80 ? 'bg-red-500' : item.fakeScore >= 50 ? 'bg-amber-500' : 'bg-green-500'} />
                                    </div>

                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mt-1">
                                        <AlertOctagon className="w-3.5 h-3.5 text-orange-400" />
                                        {item.reportCount || 0} User Reports
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="w-full lg:w-48 shrink-0 flex flex-col sm:flex-row lg:flex-col justify-center gap-2">
                                    {isActioning ? (
                                        <div className="text-center text-sm text-gray-400 italic py-4">Updating...</div>
                                    ) : (
                                        <>
                                            <button onClick={() => handleAction(item._id, 'mark_safe')} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-semibold transition-colors">
                                                <ShieldCheck className="w-4 h-4" /> Approve (Safe)
                                            </button>
                                            <button onClick={() => handleAction(item._id, 'remove_content')} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-semibold transition-colors">
                                                <Trash2 className="w-4 h-4" /> Remove Post
                                            </button>
                                            <button onClick={() => handleAction(item._id, 'ignore_flag')} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold transition-colors">
                                                <Eye className="w-4 h-4 text-blue-600" /> Ignore & Hide
                                            </button>
                                        </>
                                    )}
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
