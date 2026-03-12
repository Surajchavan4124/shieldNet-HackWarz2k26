import clsx from 'clsx';

export default function ProgressBar({ progress, color = "bg-blue-600", className }) {
    return (
        <div className={clsx("w-full bg-gray-200 rounded-full h-2", className)}>
            <div
                className={clsx("h-2 rounded-full transition-all duration-500", color)}
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    );
}
