import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({
    title,
    value,
    trend,
    trendValue,
    subtitle,
    icon: Icon,
    iconBgColor = "bg-blue-100",
    iconColor = "text-blue-600"
}) {
    const isPositive = trend === 'up';

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className={clsx("p-2 rounded-lg", iconBgColor)}>
                    {Icon && <Icon className={clsx("w-5 h-5", iconColor)} />}
                </div>

                {trend && (
                    <div className={clsx(
                        "flex items-center gap-1 text-sm font-medium",
                        isPositive ? "text-green-600" : "text-red-600"
                    )}>
                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {trendValue}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
                <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
                <p className="text-xs text-gray-400 font-medium italic">{subtitle}</p>
            </div>
        </div>
    );
}
