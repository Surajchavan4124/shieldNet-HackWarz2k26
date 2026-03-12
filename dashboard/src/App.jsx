import Layout from './components/layout/Layout';

export default function App() {
  return (
    <Layout>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
        <h2 className="text-2xl font-semibold mb-2 text-gray-800">Dashboard Layout Ready</h2>
        <p>The core application layout is fully set up with Tailwind CSS.</p>
      </div>
    </Layout>
  );
}