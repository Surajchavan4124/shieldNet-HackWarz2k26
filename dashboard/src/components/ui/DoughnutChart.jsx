import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DoughnutChart({ data, options, centerText, centerSubText }) {
    // A custom plugin to draw text in the center of the doughnut chart
    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: function (chart) {
            if (!centerText) return;

            const width = chart.width;
            const height = chart.height;
            const ctx = chart.ctx;

            ctx.restore();

            // Main text (e.g., "84%")
            ctx.font = "bold 48px sans-serif";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#111827"; // gray-900

            const text = centerText;
            const textX = Math.round((width - ctx.measureText(text).width) / 2);
            // Adjust Y slightly up to make room for subtext
            const textY = height / 2 - (centerSubText ? 10 : 0);

            ctx.fillText(text, textX, textY);

            // Subtext (e.g., "CRITICAL RISK")
            if (centerSubText) {
                ctx.font = "bold 11px sans-serif";
                ctx.fillStyle = "#4B5563"; // gray-600

                const subTextX = Math.round((width - ctx.measureText(centerSubText).width) / 2);
                ctx.fillText(centerSubText, subTextX, textY + 30);
            }

            ctx.save();
        }
    };

    return (
        <div className="relative w-full h-full flex justify-center items-center">
            <Doughnut
                data={data}
                options={options}
                plugins={[centerTextPlugin]}
            />
        </div>
    );
}
