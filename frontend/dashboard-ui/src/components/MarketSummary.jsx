import React from 'react';

export default function MarketSummary({ symbol, data }) {
  return (
    <div className="p-3 bg-white rounded border mb-4">
      <h2 className="font-semibold text-lg">{symbol} — Equity</h2>
      <p className="text-sm text-gray-600">
        Underlying: {symbol} | Spot LTP: ₹{data?.spotLtp ?? '—'} |
        Lot size: {data?.lotSize ?? 300} | Expiry: {data?.expiry ?? '30-Oct-2025'} |
        Refresh: 2s
      </p>
    </div>
  );
}
