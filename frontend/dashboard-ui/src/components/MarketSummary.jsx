import React, { useEffect, useState } from 'react';
import { fetchDerivatives } from '../api/client';

export default function MarketSummary({ symbol }) {
  const [spot, setSpot] = useState(null);
  const [lotSize, setLotSize] = useState(null);
  const [expiry, setExpiry] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // Use Breeze API derivatives data
        const derivativesData = await fetchDerivatives(symbol);
        if (mounted && derivativesData) {
          if (derivativesData.spotPrice) {
            setSpot(Number(derivativesData.spotPrice));
          }
          if (derivativesData.lotSize) {
            setLotSize(derivativesData.lotSize);
          }
          if (derivativesData.futures && derivativesData.futures.length > 0) {
            // Get the earliest expiry date
            const earliestFuture = derivativesData.futures.reduce((earliest, current) => {
              return new Date(current.expiryDate) < new Date(earliest.expiryDate) ? current : earliest;
            });
            setExpiry(new Date(earliestFuture.expiryDate).toLocaleDateString('en-GB'));
          }
        }
      } catch (error) {
        console.error('Error loading spot price:', error);
      }
    };
    load();
    const id = setInterval(load, 2000);
    return () => { mounted = false; clearInterval(id); };
  }, [symbol]);

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl text-gray-900 mb-2">{symbol} — Equity</h2>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Underlying: <span className="font-semibold text-gray-900">{symbol}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Spot LTP: <span className="font-semibold text-gray-900">₹{spot ?? '—'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Lot size: <span className="font-semibold text-gray-900">{lotSize ?? '—'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Expiry: <span className="font-semibold text-gray-900">{expiry ?? '—'}</span>
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Auto Refresh</div>
          <div className="text-sm font-semibold text-blue-600">2s</div>
        </div>
      </div>
    </div>
  );
}
