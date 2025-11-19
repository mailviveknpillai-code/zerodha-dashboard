import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useRefreshInterval } from '../contexts/RefreshIntervalContext';

export const TrendIcon = ({ direction }) => {
  if (direction === 'up') {
    return (
      <svg className="w-3 h-3 text-green-500 transition-transform duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="1 7 4.5 3.5 7 6 11 2" />
      </svg>
    );
  }
  if (direction === 'down') {
    return (
      <svg className="w-3 h-3 text-red-500 transition-transform duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="1 5 4.5 8.5 7 6 11 10" />
      </svg>
    );
  }
  return <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />;
};

export default function MarketSummary({ symbol, derivativesData }) {
  const [spot, setSpot] = useState(null);
  const [lotSize, setLotSize] = useState(null);
  const [expiry, setExpiry] = useState(null);
  const [volume, setVolume] = useState(null);
  const { isDarkMode } = useTheme();
  const { intervalMs } = useRefreshInterval();

  // Extract data from derivativesData prop (no independent polling)
  useEffect(() => {
    if (!derivativesData) return;

    if (derivativesData.spotPrice) {
      const nextSpot = Number(derivativesData.spotPrice);
      setSpot(nextSpot);
    }

    if (derivativesData.lotSize) {
      setLotSize(derivativesData.lotSize);
    }

    if (Array.isArray(derivativesData.futures) && derivativesData.futures.length > 0) {
      const earliestFuture = derivativesData.futures.reduce((earliest, current) =>
        new Date(current.expiryDate) < new Date(earliest.expiryDate) ? current : earliest
      );
      setExpiry(new Date(earliestFuture.expiryDate).toLocaleDateString('en-GB'));
      const parsedVolume = Number(earliestFuture.volume);
      if (Number.isFinite(parsedVolume)) {
        setVolume(parsedVolume);
      }
    }
  }, [derivativesData]);

  const seconds = intervalMs / 1000;
  const refreshLabel = seconds % 1 === 0 ? `${seconds}` : `${seconds.toFixed(2)}`;

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center justify-between">
        <div>
        <h2 className={`font-semibold text-base ${isDarkMode ? 'text-slate-300' : 'bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent'} tracking-wide mb-2`}>NIFTY • Equity</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-slate-700/50 text-slate-300 border border-slate-600/50' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
            Underlying: <span className="font-semibold">{symbol}</span>
          </span>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-slate-700/50 text-slate-300 border border-slate-600/50' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
            Spot LTP: <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>₹{spot ?? '—'}</span>
          </span>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-slate-700/50 text-slate-300 border border-slate-600/50' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
            Lot size: <span className="font-semibold">{lotSize ?? '—'}</span>
          </span>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-slate-700/50 text-slate-300 border border-slate-600/50' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
            Expiry: <span className="font-semibold">{expiry ?? '—'}</span>
          </span>
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-slate-700/50 text-slate-300 border border-slate-600/50' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
              Vol: <span className="font-semibold">{volume != null ? volume.toLocaleString() : '—'}</span>
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Refresh Rate</div>
          <div className="text-sm font-semibold text-blue-600">{refreshLabel}</div>
        </div>
      </div>
    </div>
  );
}
