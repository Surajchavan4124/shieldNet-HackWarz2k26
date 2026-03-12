import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, currentView, setCurrentView }) {
    return (
        <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">
            <Header />
            <div className="flex flex-1 overflow-hidden w-full">
                <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
                <main className="flex-1 overflow-y-auto p-8 relative">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
