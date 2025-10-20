import React from 'react';

export default function QuickAlignmentPanel({ 
  blinkEnabled, 
  onBlinkToggle, 
  animateEnabled, 
  onAnimateToggle 
}) {
  return (
    <div className="bg-white border rounded p-3 w-60">
      <h3 className="font-semibold mb-3">Quick alignment</h3>

      <div className="flex flex-col gap-2 text-sm mb-4">
        <button className="border rounded px-2 py-1 hover:bg-gray-100">Mark selected strike</button>
        <button className="border rounded px-2 py-1 hover:bg-gray-100">Pin to top</button>
      </div>

      <div className="mt-4 text-sm flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={blinkEnabled}
            onChange={onBlinkToggle}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          /> 
          Blink if price below daily strike
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={animateEnabled}
            onChange={onAnimateToggle}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          /> 
          Animate deltas
        </label>
      </div>
    </div>
  );
}
