import React from 'react';
import { useSnapshots } from '../api/useApi';

export default function TickerList() {
  const { data, isLoading, isError } = useSnapshots();
  if (isLoading) return <div>Loading snapshots...</div>;
  if (isError) return <div className="text-red-600">Error fetching data</div>;

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="font-medium mb-2">Recent Snapshots</h2>
      <div className="space-y-2">
        {Array.isArray(data) && data.length ? data.slice(0, 10).map((s, i) => (
          <div key={i} className="text-sm border rounded p-2">
            <div className="font-semibold">{s.tradingsymbol || s.underlying || s.token}</div>
            <div className="text-xs text-slate-500">lastPrice: {s.lastPrice ?? '—'}</div>
          </div>
        )) : <div className="text-slate-500">No snapshots available</div>}
      </div>
    </div>
  );
}
