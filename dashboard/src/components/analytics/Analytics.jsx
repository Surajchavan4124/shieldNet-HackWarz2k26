import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartDataLabels
);

export default function Analytics() {
    // 1. Line Chart Data (Misinformation Detections Over Time)
    const lineChartData = {
        labels: ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '11 PM'],
        datasets: [
            {
                label: 'Flagged Posts',
                data: [120, 85, 310, 580, 420, 650, 240],
                borderColor: '#3b82f6', // blue-500
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4, // Smooths the line
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointRadius: 4,
            },
        ],
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
        },
    };

    // 2. Donut Chart Data (Platform Distribution)
    const donutChartData = {
        labels: ['Twitter', 'Facebook', 'Instagram', 'Reddit'],
        datasets: [
            {
                label: 'Flagged Content',
                data: [450, 250, 200, 100], // Absolute values (posts)
                backgroundColor: [
                    '#1da1f2', // Twitter Blue
                    '#1877f2', // Facebook Blue
                    '#e1306c', // Instagram Pink
                    '#ff4500', // Reddit Orange
                ],
                borderWidth: 0,
                hoverOffset: 4,
            },
        ],
    };

    const donutChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
            legend: {
                position: 'right',
                labels: { usePointStyle: true, padding: 20 },
            },
            datalabels: {
                color: '#ffffff',
                font: {
                    weight: 'bold',
                    size: 14,
                },
                formatter: (value, context) => {
                    const dataset = context.chart.data.datasets[0];
                    const total = dataset.data.reduce((acc, current) => acc + current, 0);
                    const percentage = Math.round((value / total) * 100);
                    return percentage + '%';
                },
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const dataset = context.chart.data.datasets[0];
                        const total = dataset.data.reduce((acc, current) => acc + current, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${value} posts (${percentage}%)`;
                    }
                }
            }
        },
    };

    // 3. Bar Chart Data (Fake Score Distribution)
    const barChartData = {
        labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
        datasets: [
            {
                label: 'Number of Posts',
                data: [1250, 850, 2100, 3400, 5200], // Shows more posts are found in the higher risk brackets
                backgroundColor: [
                    '#22c55e', // green-500
                    '#84cc16', // lime-500
                    '#eab308', // yellow-500
                    '#f97316', // orange-500
                    '#ef4444', // red-500
                ],
                borderRadius: 4,
            },
        ],
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
        },
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Enterprise Analytics</h2>
                <p className="text-gray-500 mt-1">Global detection metrics and system performance.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Full-width Line Chart Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2 flex flex-col min-h-[350px]">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Misinformation Detections (24h)</h3>
                        <p className="text-sm text-gray-500">Volume of content flagged as potentially misleading over time.</p>
                    </div>
                    <div className="flex-1 w-full relative">
                        <Line data={lineChartData} options={lineChartOptions} />
                    </div>
                </div>

                {/* Half-width Donut Chart Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col min-h-[350px]">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Platform Distribution</h3>
                        <p className="text-sm text-gray-500">Breakdown of flagged content source origins.</p>
                    </div>
                    <div className="flex-1 w-full relative -ml-4 flex justify-center">
                        <div className="w-full max-w-[400px]">
                            <Doughnut data={donutChartData} options={donutChartOptions} />
                        </div>
                    </div>
                </div>

                {/* Half-width Bar Chart Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col min-h-[350px]">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Risk Severity Distribution</h3>
                        <p className="text-sm text-gray-500">Frequency of posts categorized by AI Fake Score.</p>
                    </div>
                    <div className="flex-1 w-full relative">
                        <Bar data={barChartData} options={barChartOptions} />
                    </div>
                </div>
            </div>
        </div>
    );
}
