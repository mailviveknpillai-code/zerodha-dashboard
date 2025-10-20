import React, { useMemo, useEffect, useState } from 'react';
import { fetchDerivatives } from '../api/client';

export default function FuturesTable({ spot, baseSymbol, selectedContract, blinkEnabled, animateEnabled, derivativesData, organizedData }) {
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (error) {
      console.error('Error entering fullscreen:', error);
      // Fallback to modal if fullscreen API fails
      setIsFullscreen(true);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
    setIsFullscreen(false);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      if (!isCurrentlyFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const organizedRows = useMemo(() => {
    console.log('🔄 FuturesTable: organizedRows useMemo called with organizedData:', organizedData);
    if (loading) return [{ segment: 'Loading...', ltp: '-', change: '-', oi: '-', vol: '-', bid: '-', bidQty: '-', indicator: 'loading' }];
    if (!organizedData || organizedData.length === 0) return [{ segment: 'No data available', ltp: '-', change: '-', oi: '-', vol: '-', bid: '-', bidQty: '-', indicator: 'error' }];
    
    return organizedData;
  }, [organizedData, loading]);

      const getIndicatorIcon = (indicator, isBlinking) => {
        if (indicator === 'header' || indicator === 'subheader') return '';
        if (indicator === 'loading') return '⏳';
        if (indicator === 'error') return '❌';
        
        const icon = indicator === 'up' ? '▲' : indicator === 'down' ? '▼' : '●';
        const color = indicator === 'up' ? 'text-green-500' : indicator === 'down' ? 'text-red-500' : 'text-gray-400';
        const blinkClass = (isBlinking && blinkEnabled) ? 'strike-alert indicator-pulse' : '';
        
        return (
          <span className={`${color} ${blinkClass} font-bold text-lg`} title={isBlinking && blinkEnabled ? 'Price below strike - Alert!' : ''}>
            {icon}
          </span>
        );
      };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-gray-900">
              NIFTY DERIVATIVES
              {selectedContract && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  - {selectedContract.tradingsymbol || selectedContract.instrumentToken}
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-4">
            {derivativesData?.dailyStrikePrice && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="font-semibold text-gray-700">Daily Strike: ₹{derivativesData.dailyStrikePrice}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="font-semibold text-gray-700">Spot: ₹{derivativesData.spotPrice}</span>
                </div>
              </div>
            )}
            <button
              onClick={enterFullscreen}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              title="View fullscreen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-xs font-semibold">
          <tr>
            <th className="text-left px-4 py-3">Segment</th>
            <th className="px-4 py-3">LTP</th>
            <th className="px-4 py-3">Δ Price</th>
            <th className="px-4 py-3">%Δ</th>
            <th className="px-4 py-3">OI</th>
            <th className="px-4 py-3">Vol</th>
            <th className="px-4 py-3">Bid/Ask</th>
            <th className="px-4 py-3">Bid Qty/Ask Qty</th>
            <th className="text-center px-4 py-3">Indicator</th>
          </tr>
        </thead>
        <tbody>
          {organizedRows.map((row, i) => (
            <tr 
              key={i} 
              className={`border-b last:border-0 hover:bg-blue-50 ${
                row.isHeader ? 'section-header' : 
                row.isSubHeader ? 'section-subheader' : 
                row.sectionType === 'futures' ? 'futures-section' :
                row.sectionType === 'calls' ? 'calls-section' :
                row.sectionType === 'puts' ? 'puts-section' : ''
              }`}
            >
              <td className={`py-3 px-4 whitespace-nowrap ${
                row.isHeader ? 'text-lg font-bold text-white' : 
                row.isSubHeader ? 'text-sm pl-6 font-semibold text-white' : 
                'pl-8'
              }`}>
                {row.segment}
              </td>
              <td className={`py-3 px-4 data-cell ${row.isHeader || row.isSubHeader ? 'text-gray-500' : 'font-semibold'}`}>
                {row.ltp}
              </td>
                <td className={`py-3 px-4 data-cell ${
                  row.isHeader || row.isSubHeader ? 'text-gray-500' :
                  Number(row.change) > 0 ? 'price-up' : 
                  Number(row.change) < 0 ? 'price-down' : 'price-neutral'
                } ${animateEnabled && !row.isHeader && !row.isSubHeader ? 
                  (Number(row.change) > 0 ? 'delta-animate-up' : 
                   Number(row.change) < 0 ? 'delta-animate-down' : '') : ''}`}>
                  {row.change}
                </td>
                <td className={`py-3 px-4 data-cell ${
                  row.isHeader || row.isSubHeader ? 'text-gray-500' :
                  Number(row.changePercent) > 0 ? 'price-up' : 
                  Number(row.changePercent) < 0 ? 'price-down' : 'price-neutral'
                }`}>
                  {row.changePercent ? `${row.changePercent}%` : '—'}
                </td>
              <td className={`py-3 px-4 data-cell ${row.isHeader || row.isSubHeader ? 'text-gray-500' : 'font-semibold'}`}>
                {row.oi}
              </td>
              <td className={`py-3 px-4 data-cell ${row.isHeader || row.isSubHeader ? 'text-gray-500' : 'font-semibold'}`}>
                {row.vol}
              </td>
              <td className={`py-3 px-4 data-cell ${row.isHeader || row.isSubHeader ? 'text-gray-500' : 'font-semibold'}`}>
                {row.bid}
              </td>
              <td className={`py-3 px-4 data-cell ${row.isHeader || row.isSubHeader ? 'text-gray-500' : 'font-semibold'}`}>
                {row.bidQty || '-'}
              </td>
              <td className="py-3 px-4 text-center">
                {getIndicatorIcon(row.indicator, row.isBlinking)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      
      {/* Professional Edge-to-Edge Fullscreen Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
          {/* Professional Header - Edge to Edge */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black px-8 py-6 shadow-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-6">
                <div>
                  <h1 className="font-bold text-3xl text-white">
                    NIFTY DERIVATIVES
                  </h1>
                  {selectedContract && (
                    <p className="text-lg text-slate-300 mt-1">
                      {selectedContract.tradingsymbol || selectedContract.instrumentToken}
                    </p>
                  )}
                </div>
                {derivativesData?.dailyStrikePrice && (
                  <div className="flex items-center space-x-8 text-lg">
                    <div className="flex items-center space-x-3 bg-slate-700 px-4 py-2 rounded-lg">
                      <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                      <span className="font-semibold text-white">Daily Strike: ₹{derivativesData.dailyStrikePrice}</span>
                    </div>
                    <div className="flex items-center space-x-3 bg-slate-700 px-4 py-2 rounded-lg">
                      <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                      <span className="font-semibold text-white">Spot: ₹{derivativesData.spotPrice}</span>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={exitFullscreen}
                className="p-4 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200 group"
                title="Exit fullscreen (Press ESC)"
              >
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Professional Table - Edge to Edge */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-auto">
              <table className="w-full text-lg">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold sticky top-0 shadow-sm">
                  <tr>
                    <th className="text-left px-8 py-6 border-r border-slate-200 dark:border-slate-600">Segment</th>
                    <th className="px-8 py-6 border-r border-slate-200 dark:border-slate-600">LTP</th>
                    <th className="px-8 py-6 border-r border-slate-200 dark:border-slate-600">Δ Price</th>
                    <th className="px-8 py-6 border-r border-slate-200 dark:border-slate-600">%Δ</th>
                    <th className="px-8 py-6 border-r border-slate-200 dark:border-slate-600">OI</th>
                    <th className="px-8 py-6 border-r border-slate-200 dark:border-slate-600">Vol</th>
                    <th className="px-8 py-6 border-r border-slate-200 dark:border-slate-600">Bid/Ask</th>
                    <th className="px-8 py-6 border-r border-slate-200 dark:border-slate-600">Bid Qty/Ask Qty</th>
                    <th className="text-center px-8 py-6">Indicator</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900">
                  {organizedRows.map((row, i) => (
                    <tr 
                      key={i} 
                      className={`border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                        row.isHeader ? 'section-header' : 
                        row.isSubHeader ? 'section-subheader' :
                        row.sectionType === 'futures' ? 'futures-section' :
                        row.sectionType === 'calls' ? 'calls-section' :
                        row.sectionType === 'puts' ? 'puts-section' : ''
                      }`}
                    >
                      <td className={`py-6 px-8 font-bold text-lg border-r border-slate-200 dark:border-slate-700 ${
                        row.isHeader || row.isSubHeader ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {row.segment}
                      </td>
                      <td className={`py-6 px-8 data-cell text-lg font-semibold border-r border-slate-200 dark:border-slate-700 ${
                        row.isHeader || row.isSubHeader ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {row.ltp}
                      </td>
                      <td className={`py-6 px-8 data-cell text-lg font-bold border-r border-slate-200 dark:border-slate-700 ${
                        row.isHeader || row.isSubHeader ? 'text-white' : 
                        Number(row.change) > 0 ? 'price-up' : 
                        Number(row.change) < 0 ? 'price-down' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                {row.change}
              </td>
                      <td className={`py-6 px-8 data-cell text-lg font-bold border-r border-slate-200 dark:border-slate-700 ${
                        row.isHeader || row.isSubHeader ? 'text-white' : 
                        Number(row.changePercent) > 0 ? 'price-up' : 
                        Number(row.changePercent) < 0 ? 'price-down' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {row.changePercent ? `${row.changePercent}%` : '—'}
                      </td>
                      <td className={`py-6 px-8 data-cell text-lg font-semibold border-r border-slate-200 dark:border-slate-700 ${
                        row.isHeader || row.isSubHeader ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {row.oi}
                      </td>
                      <td className={`py-6 px-8 data-cell text-lg font-semibold border-r border-slate-200 dark:border-slate-700 ${
                        row.isHeader || row.isSubHeader ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {row.vol}
                      </td>
                      <td className={`py-6 px-8 data-cell text-lg font-semibold border-r border-slate-200 dark:border-slate-700 ${
                        row.isHeader || row.isSubHeader ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {row.bid}
                      </td>
                      <td className={`py-6 px-8 data-cell text-lg font-semibold border-r border-slate-200 dark:border-slate-700 ${
                        row.isHeader || row.isSubHeader ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {row.bidQty || '-'}
                      </td>
                      <td className="py-6 px-8 text-center">
                        <span className="text-3xl">
                          {getIndicatorIcon(row.indicator, row.isBlinking)}
                        </span>
                      </td>
            </tr>
          ))}
        </tbody>
      </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
