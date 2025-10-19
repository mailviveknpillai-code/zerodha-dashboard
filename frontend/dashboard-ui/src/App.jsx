import React from 'react';
import TickerList from './components/TickerList';
import ChainView from './components/ChainView';

export default function App() {
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Zerodha Dashboard (Demo)</h1>
        <p className="text-sm text-slate-600">Backend-ready frontend (mock/adapter until credentials arrive)</p>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="md:col-span-1">
          <TickerList />
        </section>
        <section className="md:col-span-2">
          <ChainView />
        </section>
      </main>
    </div>
  );
}
