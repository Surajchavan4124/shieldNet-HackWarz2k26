import { Shield, Search, Bell } from 'lucide-react';

export default function Header() {
    return (
        <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-6 flex-shrink-0 z-10 w-full">
            <div className="flex items-center gap-12 w-full max-w-5xl">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-gray-900 font-bold text-xl tracking-tight">ShieldNet</h1>
                </div>

                <div className="hidden md:flex relative flex-1 max-w-2xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search for posts, platforms, or users..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm text-gray-800"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6 flex-shrink-0">
                <button className="relative text-gray-500 hover:text-gray-800 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-gray-200 cursor-pointer hover:opacity-80 transition-opacity">
                    <img
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        alt="Moderator avatar"
                        className="w-9 h-9 rounded-full object-cover border border-gray-200"
                    />
                </div>
            </div>
        </header>
    );
}
