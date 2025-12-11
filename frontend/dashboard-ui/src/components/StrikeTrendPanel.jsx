import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function StrikeTrendPanel({ derivativesData, isOpen, onToggle }) {
  const { isDarkMode } = useTheme();
  const previousTrendRef = React.useRef({ classification: 'Neutral', score: 0 });
  
  // Read trend from backend (calculated from API polled values with discrete window intervals)
  // Trend is updated in UI at frontend refresh rate, but calculation happens at window boundaries
  // IMPORTANT: Preserve previous value if current is null/undefined to prevent reset to 0 during refresh
  const currentTrend = derivativesData?.trendClassification && derivativesData?.trendScore != null
    ? {
        classification: derivativesData.trendClassification,
        score: Number(derivativesData.trendScore)
      }
    : null;
  
  // Update ref when we have a valid value (including 0, as 0 is a valid score)
  if (currentTrend !== null) {
    previousTrendRef.current = currentTrend;
  }
  
  // Use current trend if available, otherwise preserve previous (prevents reset to 0 during refresh)
  const marketTrend = currentTrend || previousTrendRef.current;

  const containerClasses = [
    'transition-all duration-300 ease-in-out border-l',
    isOpen ? 'w-64' : 'w-12',
    isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-gray-200 text-gray-900',
  ].join(' ');

  const headerButtonClasses = [
    'p-2 rounded-lg transition-colors',
    isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-600',
  ].join(' ');

  const sectionDivider = isDarkMode ? 'border-slate-600' : 'border-gray-200';

  if (!marketTrend) {
    return null;
  }

  const trendColor = marketTrend.classification === 'Bullish'
    ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30'
    : marketTrend.classification === 'Bearish'
    ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
    : 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30';

  const trendDot = marketTrend.classification === 'Bullish'
    ? 'bg-green-500'
    : marketTrend.classification === 'Bearish'
    ? 'bg-red-500'
    : 'bg-gray-500';

  return (
    <div className={containerClasses}>
      <div className={`flex items-center justify-between p-2 border-b ${sectionDivider}`}>
        <button
          onClick={onToggle}
          className={headerButtonClasses}
          title={isOpen ? 'Collapse panel' : 'Expand panel'}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {isOpen && <h3 className="text-sm font-medium">Market Trend</h3>}
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          <div className={`rounded-lg border p-4 ${trendColor}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-block w-3 h-3 rounded-full ${trendDot}`}></span>
              <span className="text-lg font-semibold">{marketTrend.classification}</span>
            </div>
            {marketTrend.score !== null && marketTrend.score !== undefined && (
              <div className="text-xs opacity-75 mt-1">
                Score: {marketTrend.score > 0 ? '+' : ''}{marketTrend.score.toFixed(2)}
              </div>
            )}
          </div>

          <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} border-t ${sectionDivider} pt-4`}>
            <p className="mb-2 font-medium">Main Table Strike</p>
            <p className="text-[10px] leading-relaxed">
              Trend indicator for the current refresh cycle based on futures, calls, and puts data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}








