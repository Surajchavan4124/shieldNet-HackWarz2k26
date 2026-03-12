import { ChevronRight, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Trash2, CheckCircle, BrainCircuit } from 'lucide-react';
import Badge from '../ui/Badge';
import DoughnutChart from '../ui/DoughnutChart';

export default function PostAnalysis() {
    const doughnutData = {
        labels: ['Fake Probability', 'Safe'],
        datasets: [
            {
                data: [84, 16],
                backgroundColor: [
                    '#2563EB', // blue-600
                    '#E5E7EB', // gray-200
                ],
                borderWidth: 0,
                circumference: 280, // Make it a partial arc like the design
                rotation: 220,
                cutout: '80%', // Thin ring
            },
        ],
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        },
    };

    return (
        <div className="flex flex-col space-y-6">
            {/* Breadcrumb & Header */}
            <div>
                <div className="flex items-center text-sm text-gray-500 mb-2 gap-2 font-medium">
                    <span className="cursor-pointer hover:text-gray-900">Incidents</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-gray-900">Post #84921</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-gray-900">Post Analysis: #84921</h2>
                            <Badge variant="warning" className="font-bold uppercase text-[10px] tracking-wider px-2 py-0.5">Flagged</Badge>
                        </div>
                        <p className="text-gray-500 mt-1 max-w-2xl">Detailed AI assessment of suspected misinformation or bot-generated content.</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            Mark as Safe
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm">
                            <Trash2 className="w-4 h-4" />
                            Remove Content
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Content Provider & Explanation */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Post Content Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex flex-col items-center justify-center overflow-hidden border border-gray-200">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=ffdfbf" alt="avatar" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">@identity_99</h3>
                                <p className="text-xs text-gray-500">Twitter/X • Posted Oct 24, 2023 at 14:22</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-6 font-medium text-gray-800 text-lg leading-relaxed italic">
                            "Breaking news about the recent policy changes that no one is talking about. Sources say they are planning to increase surveillance without public consent starting next month. Why is the mainstream media silent on this? #WakeUp #PolicyAlert"
                        </div>

                        <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100 h-64 w-full relative">
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <div className="w-32 h-32 bg-gray-200 rounded animate-pulse mb-4"></div>
                                <span className="text-sm font-medium">Image payload analyzed (Document scan)</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Explanation Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <BrainCircuit className="w-5 h-5 text-blue-600" />
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">AI Generated Explanation</h3>
                        </div>

                        <p className="text-gray-600 leading-relaxed text-sm mb-6">
                            The analysis indicates a high likelihood of coordinated inauthentic behavior. The language uses "fear-mongering" tropes and vague references to "sources" without corroboration. The model identified that this specific phrasing has appeared in over 1,200 unique accounts within a 30-minute window, suggesting a scripted bot deployment. The attached image contains tampered metadata and appears to be a composite of two different 2018 policy drafts.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Detection Model</p>
                                <p className="text-sm font-semibold text-gray-900">BERT-Sentiment-Analyzer v4.2</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Inference Time</p>
                                <p className="text-sm font-semibold text-gray-900">142ms</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Scoring & Sources */}
                <div className="space-y-6">

                    {/* Probability Score Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col items-center">
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6 self-start w-full text-center">Fake Probability Score</h3>

                        <div className="w-64 h-64 mb-4">
                            <DoughnutChart
                                data={doughnutData}
                                options={doughnutOptions}
                                centerText="84%"
                                centerSubText="CRITICAL RISK"
                            />
                        </div>

                        <div className="w-full mt-4">
                            <div className="w-full bg-blue-100 h-1.5 rounded-full mb-2">
                                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Certainty Level</p>
                        </div>
                    </div>

                    {/* Verified Sources */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Verified Source Checks</h3>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700">Gov.Policy.Archive</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700">Reuters Fact Check</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700">Propaganda Watch List</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Model Status block (Dark) */}
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-sm text-white">
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Model Confidence</h3>
                        <p className="text-sm text-slate-300 leading-relaxed mb-4">
                            The Sentinel-AI Core has processed this post with high confidence based on textual linguistic fingerprints.
                        </p>
                        <a href="#" className="font-semibold text-sm underline underline-offset-2 hover:text-blue-300 transition-colors">
                            View Technical Logs
                        </a>
                    </div>

                </div>
            </div>
        </div>
    );
}
