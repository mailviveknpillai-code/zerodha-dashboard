import React, { useState } from 'react';

const mockFavorites = [
  { symbol: 'TATACAP', status: 'Active' },
  { symbol: 'INFY', status: 'Paused' },
  { symbol: 'RELIANCE', status: 'Active' },
  { symbol: 'SBIN', status: 'Active' },
  { symbol: 'HDFCBANK', status: 'Active' },
];

export default function FavoritesSidebar({ selected, onSelect }) {
  return (
    <aside className="bg-white border-r border-gray-200 p-4 w-48 flex-shrink-0">
      <h2 className="font-semibold mb-4">Favorites</h2>
      <ul className="space-y-2">
        {mockFavorites.map(fav => (
          <li
            key={fav.symbol}
            onClick={() => onSelect(fav.symbol)}
            className={`flex justify-between items-center cursor-pointer rounded px-2 py-1 text-sm ${
              selected === fav.symbol
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'hover:bg-gray-100'
            }`}
          >
            <span>{fav.symbol}</span>
            <span className={`text-xs ${
              fav.status === 'Active' ? 'text-green-600' : 'text-gray-400'
            }`}>
              {fav.status}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <h3 className="font-semibold text-sm mb-2">ATM</h3>
        <div className="space-y-1 text-xs text-slate-700">
          <p>• TATACAP Active</p>
          <p>• SBIN Active</p>
          <p>• HDFCBANK Active</p>
        </div>
      </div>
    </aside>
  );
}
