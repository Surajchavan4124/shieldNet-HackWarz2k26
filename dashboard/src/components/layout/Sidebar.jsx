import { LayoutDashboard, Flag, Inbox, BarChart2, Settings } from 'lucide-react';

export default function Sidebar() {
    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, active: true },
        { name: 'Flagged Posts', icon: Flag, active: false },
        { name: 'Moderation Queue', icon: Inbox, active: false },
        { name: 'Analytics', icon: BarChart2, active: false },
        { name: 'Settings', icon: Settings, active: false },
    ];

    return (
        <aside className="w-64 bg-slate-900 h-full flex flex-col border-r border-slate-800 flex-shrink-0">
            <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <a
                            key={item.name}
                            href="#"
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${item.active
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span>{item.name}</span>
                        </a>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>System Status</span>
                    <div className="flex items-center gap-1.5 text-green-400">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        Online
                    </div>
                </div>
            </div>
        </aside>
    );
}
