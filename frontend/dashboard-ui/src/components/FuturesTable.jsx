import React, { useMemo, useEffect, useState, useRef } from 'react';
import { fetchDerivatives } from '../api/client';
import { getPriceTrackingClass } from '../hooks/usePriceTracking';

export default function FuturesTable({ spot, baseSymbol, selectedContract, blinkEnabled, animateEnabled, organizedData }) {
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Track starting values for each row to enable price movement tracking
  const startingValuesRef = useRef(new Map());

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

  // Track starting values for each cell independently for price movement monitoring
  useEffect(() => {
    organizedRows.forEach((row, index) => {
      if (row.isHeader || row.isSubHeader) return;
      
      const baseKey = row.instrumentToken || `${row.tradingsymbol || row.segment}-${index}`;
      
      // Track LTP
      if (row.ltp && row.ltp !== '-' && row.ltp !== '—') {
        const ltpKey = `${baseKey}-ltp`;
        if (!startingValuesRef.current.has(ltpKey)) {
          const numValue = Number(row.ltp);
          if (!isNaN(numValue)) startingValuesRef.current.set(ltpKey, numValue);
        }
      }
      
      // Track OI
      if (row.oi && row.oi !== '-' && row.oi !== '—') {
        const oiKey = `${baseKey}-oi`;
        if (!startingValuesRef.current.has(oiKey)) {
          const numValue = Number(row.oi.replace(/,/g, ''));
          if (!isNaN(numValue)) startingValuesRef.current.set(oiKey, numValue);
        }
      }
      
      // Track Volume
      if (row.vol && row.vol !== '-' && row.vol !== '—') {
        const volKey = `${baseKey}-vol`;
        if (!startingValuesRef.current.has(volKey)) {
          const numValue = Number(row.vol.replace(/,/g, ''));
          if (!isNaN(numValue)) startingValuesRef.current.set(volKey, numValue);
        }
      }
      
      // Track Bid
      if (row.bid && row.bid !== '-' && row.bid !== '—') {
        const bidKey = `${baseKey}-bid`;
        if (!startingValuesRef.current.has(bidKey)) {
          const numValue = Number(row.bid);
          if (!isNaN(numValue)) startingValuesRef.current.set(bidKey, numValue);
        }
      }
      
      // Track Ask
      if (row.ask && row.ask !== '-' && row.ask !== '—') {
        const askKey = `${baseKey}-ask`;
        if (!startingValuesRef.current.has(askKey)) {
          const numValue = Number(row.ask);
          if (!isNaN(numValue)) startingValuesRef.current.set(askKey, numValue);
        }
      }
      
      // Track Bid Qty
      if (row.bidQty && row.bidQty !== '-' && row.bidQty !== '—') {
        const bidQtyKey = `${baseKey}-bidQty`;
        if (!startingValuesRef.current.has(bidQtyKey)) {
          const numValue = Number(row.bidQty);
          if (!isNaN(numValue)) startingValuesRef.current.set(bidQtyKey, numValue);
        }
      }
      
      // Track Ask Qty
      if (row.askQty && row.askQty !== '-' && row.askQty !== '—') {
        const askQtyKey = `${baseKey}-askQty`;
        if (!startingValuesRef.current.has(askQtyKey)) {
          const numValue = Number(row.askQty);
          if (!isNaN(numValue)) startingValuesRef.current.set(askQtyKey, numValue);
        }
      }
      
      // Track Change (Delta)
      if (row.change && row.change !== '-' && row.change !== '—') {
        const changeKey = `${baseKey}-change`;
        if (!startingValuesRef.current.has(changeKey)) {
          const numValue = Number(row.change);
          if (!isNaN(numValue)) startingValuesRef.current.set(changeKey, numValue);
        }
      }
      
      // Track Change Percent
      if (row.changePercent && row.changePercent !== '-' && row.changePercent !== '—') {
        const changePercentKey = `${baseKey}-changePercent`;
        if (!startingValuesRef.current.has(changePercentKey)) {
          const numValue = Number(row.changePercent);
          if (!isNaN(numValue)) startingValuesRef.current.set(changePercentKey, numValue);
        }
      }
    });
  }, [organizedRows]);

  // Helper function to get color coding for LTP based on value
  const getLTPColor = (ltp, isHeader, isSubHeader) => {
    if (isHeader || isSubHeader) return 'text-gray-500';
    if (!ltp || ltp === '-' || ltp === '—') return 'text-gray-400';
    
    const value = Number(ltp);
    if (value > 0) return 'price-up';
    return 'price-neutral';
  };

  // Helper function to get color coding for OI based on value
  const getOIColor = (oi, isHeader, isSubHeader) => {
    if (isHeader || isSubHeader) return 'text-gray-500';
    if (!oi || oi === '-' || oi === '—') return 'text-gray-400';
    
    const value = Number(oi.replace(/,/g, ''));
    if (value > 10000) return 'price-up'; // High OI
    if (value > 5000) return 'price-neutral';
    return 'price-down'; // Low OI
  };

  // Helper function to get color coding for Volume based on value
  const getVolumeColor = (vol, isHeader, isSubHeader) => {
    if (isHeader || isSubHeader) return 'text-gray-500';
    if (!vol || vol === '-' || vol === '—') return 'text-gray-400';
    
    const value = Number(vol.replace(/,/g, ''));
    if (value > 1000) return 'price-up'; // High volume
    if (value > 100) return 'price-neutral';
    return 'price-down'; // Low volume
  };

  // Helper function to get color coding for Bid based on LTP movement
  const getBidColor = (bid, ltp, isHeader, isSubHeader) => {
    if (isHeader || isSubHeader) return 'text-gray-500';
    if (!bid || bid === '-' || bid === '—') return 'text-gray-400';
    
    const bidValue = Number(bid);
    const ltpValue = Number(ltp);
    
    if (ltpValue > bidValue) return 'price-up'; // LTP above bid (bullish)
    if (ltpValue < bidValue) return 'price-down'; // LTP below bid (bearish)
    return 'price-neutral'; // LTP at bid
  };

  // Helper function to get color coding for Ask based on LTP movement
  const getAskColor = (ask, ltp, isHeader, isSubHeader) => {
    if (isHeader || isSubHeader) return 'text-gray-500';
    if (!ask || ask === '-' || ask === '—') return 'text-gray-400';
    
    const askValue = Number(ask);
    const ltpValue = Number(ltp);
    
    if (ltpValue > askValue) return 'price-up'; // LTP above ask (very bullish)
    if (ltpValue < askValue) return 'price-down'; // LTP below ask (bearish)
    return 'price-neutral'; // LTP at ask
  };

  // Helper function to get color coding for Bid Qty based on LTP movement
  const getBidQtyColor = (bidQty, ltp, isHeader, isSubHeader) => {
    if (isHeader || isSubHeader) return 'text-gray-500';
    if (!bidQty || bidQty === '-' || bidQty === '—') return 'text-gray-400';
    
    const bidQtyValue = Number(bidQty.replace(/,/g, ''));
    const ltpValue = Number(ltp);
    
    // High bid qty when LTP is above bid (bullish pressure)
    if (ltpValue > 0 && bidQtyValue > 1000) return 'price-up';
    if (bidQtyValue > 100) return 'price-neutral';
    return 'price-down'; // Low bid qty
  };

  // Helper function to get color coding for Ask Qty based on LTP movement
  const getAskQtyColor = (askQty, ltp, isHeader, isSubHeader) => {
    if (isHeader || isSubHeader) return 'text-gray-500';
    if (!askQty || askQty === '-' || askQty === '—') return 'text-gray-400';
    
    const askQtyValue = Number(askQty.replace(/,/g, ''));
    const ltpValue = Number(ltp);
    
    // High ask qty when LTP is below ask (bearish pressure)
    if (ltpValue > 0 && askQtyValue > 1000) return 'price-up';
    if (askQtyValue > 100) return 'price-neutral';
    return 'price-down'; // Low ask qty
  };

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
          {spot && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="font-semibold text-gray-700">Spot: ₹{spot}</span>
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
            <th className="px-4 py-3">Bid</th>
            <th className="px-4 py-3">Ask</th>
            <th className="px-4 py-3">Bid Qty</th>
            <th className="px-4 py-3">Ask Qty</th>
          </tr>
        </thead>
        <tbody>
          {organizedRows.map((row, i) => {
            const baseKey = row.instrumentToken || `${row.tradingsymbol || row.segment}-${i}`;
            
            return (
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
              <td className={`py-3 px-4 data-cell ${
                getPriceTrackingClass(row.ltp, startingValuesRef.current.get(`${baseKey}-ltp`), row.isHeader || row.isSubHeader)
              } ${getLTPColor(row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                {row.ltp}
              </td>
                <td className={`py-3 px-4 data-cell ${
                  getPriceTrackingClass(row.change ? Number(row.change) : 0, startingValuesRef.current.get(`${baseKey}-change`), row.isHeader || row.isSubHeader)
                } ${row.isHeader || row.isSubHeader ? 'text-gray-500' :
                  Number(row.change) > 0 ? 'price-up' : 
                  Number(row.change) < 0 ? 'price-down' : 'price-neutral'
                } ${animateEnabled && !row.isHeader && !row.isSubHeader ? 
                  (Number(row.change) > 0 ? 'delta-animate-up' : 
                   Number(row.change) < 0 ? 'delta-animate-down' : '') : ''}`}>
                  {row.change}
                </td>
                <td className={`py-3 px-4 data-cell ${
                  getPriceTrackingClass(row.changePercent ? Number(row.changePercent) : 0, startingValuesRef.current.get(`${baseKey}-changePercent`), row.isHeader || row.isSubHeader)
                } ${row.isHeader || row.isSubHeader ? 'text-gray-500' :
                  Number(row.changePercent) > 0 ? 'price-up' : 
                  Number(row.changePercent) < 0 ? 'price-down' : 'price-neutral'
                }`}>
                  {row.changePercent ? `${row.changePercent}%` : '—'}
                </td>
              <td className={`py-3 px-4 data-cell ${
                getPriceTrackingClass(row.oi ? Number(row.oi.replace(/,/g, '')) : 0, startingValuesRef.current.get(`${baseKey}-oi`), row.isHeader || row.isSubHeader)
              } ${getOIColor(row.oi, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                {row.oi}
              </td>
              <td className={`py-3 px-4 data-cell ${
                getPriceTrackingClass(row.vol ? Number(row.vol.replace(/,/g, '')) : 0, startingValuesRef.current.get(`${baseKey}-vol`), row.isHeader || row.isSubHeader)
              } ${getVolumeColor(row.vol, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                {row.vol}
              </td>
              <td className={`py-3 px-4 data-cell ${
                getPriceTrackingClass(row.bid ? Number(row.bid) : 0, startingValuesRef.current.get(`${baseKey}-bid`), row.isHeader || row.isSubHeader)
              } ${getBidColor(row.bid, row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                {row.bid}
              </td>
              <td className={`py-3 px-4 data-cell ${
                getPriceTrackingClass(row.ask ? Number(row.ask) : 0, startingValuesRef.current.get(`${baseKey}-ask`), row.isHeader || row.isSubHeader)
              } ${getAskColor(row.ask, row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                {row.ask}
              </td>
              <td className={`py-3 px-4 data-cell ${
                getPriceTrackingClass(row.bidQty ? Number(row.bidQty) : 0, startingValuesRef.current.get(`${baseKey}-bidQty`), row.isHeader || row.isSubHeader)
              } ${getBidQtyColor(row.bidQty, row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                {row.bidQty || '-'}
              </td>
              <td className={`py-3 px-4 data-cell ${
                getPriceTrackingClass(row.askQty ? Number(row.askQty) : 0, startingValuesRef.current.get(`${baseKey}-askQty`), row.isHeader || row.isSubHeader)
              } ${getAskQtyColor(row.askQty, row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                {row.askQty || '-'}
              </td>
            </tr>
            );
          })}
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
                {spot && (
                  <div className="flex items-center space-x-8 text-lg">
                    <div className="flex items-center space-x-3 bg-slate-700 px-4 py-2 rounded-lg">
                      <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                      <span className="font-semibold text-white">Spot: ₹{spot}</span>
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
