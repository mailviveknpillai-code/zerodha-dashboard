import React, { useEffect, useState } from 'react';
import { useSnapshots } from '../api/useApi';

export default function ChainView(){
  const { data } = useSnapshots();
  const [symbol, setSymbol] = useState('');

  useEffect(()=> {
    if (!symbol && Array.isArray(data) && data.length) {
      setSymbol(data[0].underlying || data[0].tradingsymbol || '');
    }
  }, [data, symbol]);

  return (
    <div className="bg-white p-4 rounded shadow min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">Chain View</h2>
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="Filter by symbol"
          value={symbol}
          onChange={e=>setSymbol(e.target.value)}
        />
      </div>
      <div className="text-sm text-slate-700">
        {Array.isArray(data) && data.length ? (
          <div className="grid grid-cols-1 gap-2">
            {data.filter(s => !symbol || (s.underlying||s.tradingsymbol||'').includes(symbol)).map((s, i) =>
              <div key={i} className="border rounded p-2">
                <div className="flex justify-between">
                  <div>{s.tradingsymbol || s.underlying}</div>
                  <div className="text-slate-500">{s.instrumentType || s.type}</div>
                </div>
                <div className="text-xs">LTP: {s.lastPrice ?? '—'}</div>
              </div>
            )}
          </div>
        ) : <div className="text-slate-500">No chain data</div>}
      </div>
    </div>
  );
}
