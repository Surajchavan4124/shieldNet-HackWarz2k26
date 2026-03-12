import { useState } from 'react';
import Layout from './components/layout/Layout';
import DashboardOverview from './components/dashboard/DashboardOverview';
import ModerationQueue from './components/queue/ModerationQueue';
import PostAnalysis from './components/analysis/PostAnalysis';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'flagged':
        // Simulating clicking a flagged post to see its analysis
        return <PostAnalysis />;
      case 'queue':
        return <ModerationQueue />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'settings':
        return <div className="p-8 text-center text-gray-500 text-xl font-medium">Settings View Coming Soon</div>;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {renderView()}
    </Layout>
  );
}