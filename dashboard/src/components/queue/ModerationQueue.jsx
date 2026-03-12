import { useState } from 'react';
import { ShieldCheck, Trash2, AlertOctagon, Filter, Eye } from 'lucide-react';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';

const MOCK_QUEUE = [
    {
        id: "Q-84920",
        user: "@patriot_eagle99",
        userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Patriot&backgroundColor=b6e3f4",
        platform: "Twitter",
        platformColor: "text-blue-500",
        content: "The WHO is secretly planning to deploy micro-drones in the water supply by 2025. Don't drink tap water! #Truth #Awake",
        fakeScore: 94,
        confidence: 96,
        reports: 342,
        time: "12m ago"
    },
    {
        id: "Q-84921",
        user: "ConcernedCitizen",
        userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Concerned&backgroundColor=c0aede",
        platform: "Facebook",
        platformColor: "text-blue-700",
        content: "Just saw five military helicopters flying low over the downtown bank. Something major is going down today.",
        fakeScore: 68,
        confidence: 72,
        reports: 45,
        time: "28m ago"
    },
    {
        id: "Q-84922",
        user: "u/market_watcher",
        userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Market&backgroundColor=ffdfbf",
        platform: "Reddit",
        platformColor: "text-orange-600",
        content: "Insider info: MegaCorp is filing for bankruptcy tomorrow morning. Sell everything now before it's public.",
        fakeScore: 82,
        confidence: 88,
        reports: 112,
        time: "45m ago"
    },
    {
        id: "Q-84923",
        user: "health_guru_2024",
        userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Health&backgroundColor=ffd5dc",
        platform: "Instagram",
        platformColor: "text-pink-600",
        content: "My grandmother cured her arthritis completely using just baking soda and lemon juice daily. No doctors needed!",
        fakeScore: 45,
        confidence: 60,
        reports: 18,
        time: "1h ago"
    }
];

export default function ModerationQueue() {
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
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                        <Filter className="w-4 h-4" /> Filter Queue
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {MOCK_QUEUE.map((item) => {
                    const riskDetails = getRiskDetails(item.fakeScore);

                    return (
                        <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col lg:flex-row gap-6">

                                {/* Left: User & Post Content */}
                                <div className="flex-1 flex gap-4 pr-6 lg:border-r border-gray-100">
                                    <img src={item.userAvatar} alt={item.user} className="w-12 h-12 rounded-full border border-gray-200 shrink-0" />
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-900 text-sm">{item.user}</span>
                                            <span className="text-gray-400 text-xs">•</span>
                                            <span className={`text-xs font-semibold ${item.platformColor}`}>{item.platform}</span>
                                            <span className="text-gray-400 text-xs">•</span>
                                            <span className="text-gray-500 text-xs">{item.time}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 leading-relaxed max-w-2xl font-medium italic">
                                            "{item.content}"
                                        </p>
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
                                            <span className="text-gray-600">Conf ({item.confidence}%)</span>
                                        </div>
                                        <ProgressBar progress={item.fakeScore} color={item.fakeScore > 80 ? 'bg-red-500' : item.fakeScore >= 50 ? 'bg-amber-500' : 'bg-green-500'} />
                                    </div>

                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mt-1">
                                        <AlertOctagon className="w-3.5 h-3.5 text-orange-400" />
                                        {item.reports} User Reports
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="w-full lg:w-48 shrink-0 flex flex-col sm:flex-row lg:flex-col justify-center gap-2">
                                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-semibold transition-colors">
                                        <ShieldCheck className="w-4 h-4" />
                                        Approve (Safe)
                                    </button>
                                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-semibold transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                        Remove Post
                                    </button>
                                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold transition-colors">
                                        <Eye className="w-4 h-4 text-blue-600" />
                                        Escalate
                                    </button>
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
