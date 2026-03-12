import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

export default function BarChart({ labels, data }) {
    const chartData = {
        labels: labels,
        datasets: [
            {
                data: data,
                backgroundColor: '#3b82f6', // blue-500
                borderRadius: 4,
                borderSkipped: false,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            x: {
                grid: { display: false, drawBorder: false },
                ticks: { color: '#9CA3AF', font: { size: 10 } }
            },
            y: {
                display: false, // hide y axis completely for cleaner look
            }
        }
    };

    return (
        <div className="w-full h-full min-h-[200px]">
            <Bar data={chartData} options={options} />
        </div>
    );
}
