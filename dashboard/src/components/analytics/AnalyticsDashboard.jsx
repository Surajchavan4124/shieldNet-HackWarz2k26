import { RefreshCw, Filter, ShieldAlert } from 'lucide-react';
import StatCard from '../ui/StatCard';
import BarChart from '../ui/BarChart';
import DoughnutChart from '../ui/DoughnutChart';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';

export default function AnalyticsDashboard() {
    const trendLabels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"];
    const trendData = [35, 42, 30, 65, 85, 48, 55];

    const categoryDoughnutData = {
        labels: ['Political', 'Medical', 'Financial', 'Other'],
        datasets: [{
            data: [45, 25, 15, 15],
            backgroundColor: ['#2563EB', '#60A5FA', '#34D399', '#E5E7EB'],
            borderWidth: 0,
        }]
    };

    const highRiskDetections = [
        { id: '#DET-94021', category: 'Political', platform: 'Twitter', confidence: '98.4%', status: 'FLAGGED' },
        { id: '#DET-93882', category: 'Medical', platform: 'Instagram', confidence: '99.1%', status: 'REVIEWING', warning: true },
        { id: '#DET-93551', category: 'Financial', platform: 'Reddit', confidence: '92.0%', status: 'FLAGGED' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Misinformation Overview</h2>
                    <p className="text-gray-500 mt-1">Global detection metrics across integrated platforms.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                        <Filter className="w-4 h-4" /> Filter Views
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm">
                        <RefreshCw className="w-4 h-4" /> Refresh Data
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Total Detections</h3>
                        <Badge variant="success" className="bg-green-50 text-green-600">+12.5%</Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-bold text-gray-900">128,432</h2>
                        <span className="text-xs text-gray-400 font-medium">this month</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Accuracy Rate</h3>
                        <Badge variant="success" className="bg-green-50 text-green-600">+0.4%</Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-bold text-gray-900">99.2%</h2>
                        <span className="text-xs text-gray-400 font-medium">AI confidence</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Avg Response Time</h3>
                        <Badge variant="danger" className="bg-red-50 text-red-600">-5.2%</Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-bold text-gray-900">450ms</h2>
                        <span className="text-xs text-gray-400 font-medium">per scan</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Detection Trends */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-6">
                        <TrendingChartIcon /> Detection Trends (24h)
                    </h3>
                    <div className="flex-1">
                        <BarChart labels={trendLabels} data={trendData} />
                    </div>
                </div>

                {/* Content by Platform */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-6">
                        <BarChartIcon /> Content by Platform
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm font-medium mb-1.5"><span className="text-gray-700">Twitter / X</span><span className="text-gray-900">42,102</span></div>
                            <ProgressBar progress={80} color="bg-sky-400" />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm font-medium mb-1.5"><span className="text-gray-700">Facebook</span><span className="text-gray-900">31,450</span></div>
                            <ProgressBar progress={65} color="bg-blue-600" />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm font-medium mb-1.5"><span className="text-gray-700">Instagram</span><span className="text-gray-900">22,109</span></div>
                            <ProgressBar progress={45} color="bg-pink-500" />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm font-medium mb-1.5"><span className="text-gray-700">Reddit</span><span className="text-gray-900">14,821</span></div>
                            <ProgressBar progress={30} color="bg-orange-500" />
                        </div>
                    </div>
                </div>

                {/* Categories Donut Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-6">
                        <PieChartIcon /> Misinformation Categories
                    </h3>
                    <div className="flex items-center">
                        <div className="w-48 h-48 mx-auto -ml-4">
                            <DoughnutChart data={categoryDoughnutData} options={{ ...categoryDoughnutData.options, plugins: { legend: { display: false } }, cutout: '75%' }} centerText="5" centerSubText="MAIN SECTORS" />
                        </div>
                        <div className="space-y-3 flex-1 ml-4">
                            <div className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span><span className="text-gray-600">Political (45%)</span></div>
                            <div className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span><span className="text-gray-600">Medical (25%)</span></div>
                            <div className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span><span className="text-gray-600">Financial (15%)</span></div>
                            <div className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-gray-200"></span><span className="text-gray-600">Other (15%)</span></div>
                        </div>
                    </div>
                </div>

                {/* High-Risk Table */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <TableIcon /> Recent High-Risk Detections
                        </h3>
                        <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
                    </div>

                    <table className="w-full text-left text-sm flex-1">
                        <thead>
                            <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                <th className="pb-3 font-semibold">Content ID</th>
                                <th className="pb-3 font-semibold">Category</th>
                                <th className="pb-3 font-semibold">Source</th>
                                <th className="pb-3 font-semibold">Confidence</th>
                                <th className="pb-3 text-right font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {highRiskDetections.map((row) => (
                                <tr key={row.id}>
                                    <td className="py-3 font-medium text-gray-800">{row.id}</td>
                                    <td className="py-3 text-gray-600">{row.category}</td>
                                    <td className="py-3 text-gray-600">{row.platform}</td>
                                    <td className="py-3 font-semibold text-gray-900">{row.confidence}</td>
                                    <td className="py-3 text-right">
                                        {row.warning ? (
                                            <Badge variant="warning" className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 border border-amber-200">{row.status}</Badge>
                                        ) : (
                                            <Badge variant="danger" className="text-red-500 bg-red-50 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 border border-red-100">{row.status}</Badge>
                                        )}
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

// Simple icons to match design
function TrendingChartIcon() { return <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>; }
function BarChartIcon() { return <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>; }
function PieChartIcon() { return <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>; }
function TableIcon() { return <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>; }
