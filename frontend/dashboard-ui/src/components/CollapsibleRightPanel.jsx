import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSpotLtpInterval } from '../contexts/SpotLtpIntervalContext';

export default function CollapsibleRightPanel({ derivativesData }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isDarkMode } = useTheme();
  const { intervalSeconds: spotLtpInterval } = useSpotLtpInterval();
  
  // Read trend from backend (calculated from API polled values with FIFO window)
  // Trend is updated in UI at frontend refresh rate, but calculation is based on API polling
  const marketTrend = derivativesData?.trendClassification && derivativesData?.trendScore != null
    ? {
        classification: derivativesData.trendClassification,
        score: Number(derivativesData.trendScore)
      }
    : { classification: 'Neutral', score: 0 };
  
  // Read spot LTP trend from backend (average movement over configured window)
  const spotLtpTrend = {
    direction: derivativesData?.spotLtpTrendDirection || 'FLAT',
    percent: derivativesData?.spotLtpTrendPercent ?? 0
  };

  const containerClasses = [
    'transition-all duration-300 ease-in-out border-l',
    isCollapsed ? 'w-12' : 'w-80',
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

  // Spot LTP Trend colors
  const spotLtpColor = spotLtpTrend.direction === 'UP'
    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    : spotLtpTrend.direction === 'DOWN'
    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
    : 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30';

  const spotLtpArrow = spotLtpTrend.direction === 'UP' ? '↑' : spotLtpTrend.direction === 'DOWN' ? '↓' : '→';

  return (
    <div className={containerClasses}>
      <div className={`flex items-center justify-between p-2 border-b ${sectionDivider}`}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={headerButtonClasses}
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {!isCollapsed && <h3 className="text-sm font-medium">Market Trend</h3>}
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Market Trend Indicator */}
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

          {/* Spot LTP Trend Indicator */}
          <div className={`rounded-lg border p-4 ${spotLtpColor}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Spot LTP Trend</span>
              <span className="text-xs opacity-75">{spotLtpInterval}s window</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{spotLtpArrow}</span>
              <div>
                <span className="text-lg font-semibold">
                  {spotLtpTrend.percent > 0 ? '+' : ''}{spotLtpTrend.percent.toFixed(2)}%
                </span>
                <div className="text-xs opacity-75">
                  {spotLtpTrend.direction === 'UP' ? 'Moving Up' : spotLtpTrend.direction === 'DOWN' ? 'Moving Down' : 'Flat'}
                </div>
              </div>
            </div>
          </div>

          <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} border-t ${sectionDivider} pt-4`}>
            <p className="mb-2 font-medium">Trend Indicators</p>
            <p className="text-[10px] leading-relaxed mb-2">
              <strong>Market Trend:</strong> Based on futures, calls, and puts data with FIFO window.
            </p>
            <p className="text-[10px] leading-relaxed">
              <strong>Spot LTP Trend:</strong> Average movement of futures LTP over the last {spotLtpInterval} seconds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
