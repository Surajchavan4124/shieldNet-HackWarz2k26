import clsx from 'clsx';

export default function Badge({ children, variant = "default", className }) {
    const variants = {
        default: "bg-gray-100 text-gray-800",
        danger: "bg-red-100 text-red-700",
        warning: "bg-amber-100 text-amber-700",
        success: "bg-green-100 text-green-700",
        info: "bg-blue-100 text-blue-700",
    };

    return (
        <span className={clsx(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
            variants[variant],
            className
        )}>
            {children}
        </span>
    );
}
