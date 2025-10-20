import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FavoritesSidebar from './FavoritesSidebar';
import MarketSummary from './MarketSummary';
import FuturesTable from './FuturesTable';
import QuickAlignmentPanel from './QuickAlignmentPanel';

export default function DashboardLayout() {
  const [selected, setSelected] = useState('TATACAP');
  const mockData = { spotLtp: 432.5, lotSize: 300, expiry: '30-Oct-2025' };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <FavoritesSidebar selected={selected} onSelect={setSelected} />
      <main className="flex-1 p-4 space-y-3">
        <Link to="/alpha-demo" className="text-blue-500 hover:underline">Alpha Vantage Demo</Link>
        <MarketSummary symbol={selected} data={mockData} />
        <FuturesTable />
      </main>
      <aside className="p-4">
        <QuickAlignmentPanel />
      </aside>
    </div>
  );
}
