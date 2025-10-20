import React from 'react';

export default function QuickAlignmentPanel() {
  return (
    <div className="bg-white border rounded p-3 w-60">
      <h3 className="font-semibold mb-3">Quick alignment</h3>
      <ul className="text-sm mb-4 space-y-1">
        <li>Bullish: <span className="font-semibold">2</span></li>
        <li>Bearish: <span className="font-semibold">2</span></li>
        <li>Neutral: <span className="font-semibold">1</span></li>
      </ul>

      <div className="flex flex-col gap-2 text-sm">
        <button className="border rounded px-2 py-1 hover:bg-gray-100">Mark selected strike</button>
        <button className="border rounded px-2 py-1 hover:bg-gray-100">Pin to top</button>
      </div>

      <div className="mt-4 text-sm flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" /> Blink
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" /> Animate deltas
        </label>
      </div>
    </div>
  );
}
