import React, { useEffect, useRef } from 'react';
import { getPriceTrackingClass } from '../hooks/usePriceTracking';

export default function OptionsTable({ 
  title, 
  data, 
  blinkEnabled, 
  animateEnabled, 
  dailyStrikePrice,
  collapsible = false,
  collapsed = false,
  onToggle,
  headerExtras = null
}) {
  // Track starting values for price movement monitoring
  const startingValuesRef = useRef(new Map());

  const extractPairValue = (value, partIndex) => {
    if (!value || value === '-' || value === '—') return '-';
    const parts = String(value).split('/');
    if (parts.length <= partIndex) return String(value);
    const part = parts[partIndex].trim();
    return part !== '' ? part : '-';
  };

  // Track starting values for each cell independently
  useEffect(() => {
    if (collapsed) return;
    if (data && data.length > 0) {
      data.forEach((row, index) => {
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
            const numValue = Number(extractPairValue(row.bid, 0));
            if (!isNaN(numValue)) startingValuesRef.current.set(bidKey, numValue);
          }
        }
        
        // Track Ask
        if (row.ask && row.ask !== '-' && row.ask !== '—') {
          const askKey = `${baseKey}-ask`;
          if (!startingValuesRef.current.has(askKey)) {
            const numValue = Number(extractPairValue(row.ask, 1));
            if (!isNaN(numValue)) startingValuesRef.current.set(askKey, numValue);
          }
        }
        
        // Track Bid Qty
        if (row.bidQty && row.bidQty !== '-' && row.bidQty !== '—') {
          const bidQtyKey = `${baseKey}-bidQty`;
          if (!startingValuesRef.current.has(bidQtyKey)) {
            const numValue = Number(extractPairValue(row.bidQty, 0).replace(/,/g, ''));
            if (!isNaN(numValue)) startingValuesRef.current.set(bidQtyKey, numValue);
          }
        }
        
        // Track Ask Qty
        if (row.askQty && row.askQty !== '-' && row.askQty !== '—') {
          const askQtyKey = `${baseKey}-askQty`;
          if (!startingValuesRef.current.has(askQtyKey)) {
            const numValue = Number(extractPairValue(row.askQty, 1).replace(/,/g, ''));
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
    }
  }, [data, collapsed]);
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

  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-lg text-gray-900">{title}</h3>
          <div className="flex items-center gap-3">
            {headerExtras}
            {collapsible && (
              <button
                type="button"
                onClick={onToggle}
                className="w-8 h-8 flex items-center justify-center text-xl font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
                aria-label={collapsed ? 'Expand table' : 'Collapse table'}
              >
                {collapsed ? '+' : '−'}
              </button>
            )}
          </div>
        </div>
      </div>
      {!collapsed && (hasData ? (
        <div>
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-56" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-20" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-24" />
          </colgroup>
          <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Segment</th>
              <th className="px-4 py-3 text-right">LTP</th>
              <th className="px-4 py-3 text-right">Δ Price</th>
              <th className="px-4 py-3 text-right">%Δ</th>
              <th className="px-4 py-3 text-right">OI</th>
              <th className="px-4 py-3 text-right">Vol</th>
              <th className="px-4 py-3 text-right">Bid</th>
              <th className="px-4 py-3 text-right">Ask</th>
              <th className="px-4 py-3 text-right">Bid Qty</th>
              <th className="px-4 py-3 text-right">Ask Qty</th>
            </tr>
          </thead>
            <tbody>
              {data.map((row, i) => {
                const baseKey = row.instrumentToken || `${row.tradingsymbol || row.segment}-${i}`;
                const numericCellBase = 'py-3 px-4 text-right tabular-nums font-mono data-cell';
                
                return (
                <tr 
                  key={i} 
                  className={`border-b last:border-0 hover:bg-blue-50 ${
                    row.isHeader ? 'section-header' : 
                    row.isSubHeader ? 'section-subheader' : 
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
                    <td className={`${numericCellBase} ${
                      getPriceTrackingClass(row.ltp, startingValuesRef.current.get(`${baseKey}-ltp`), row.isHeader || row.isSubHeader)
                    } ${getLTPColor(row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                      {row.ltp}
                    </td>
                    <td className={`${numericCellBase} ${
                      getPriceTrackingClass(row.change ? Number(row.change) : 0, startingValuesRef.current.get(`${baseKey}-change`), row.isHeader || row.isSubHeader)
                    } ${row.isHeader || row.isSubHeader ? 'text-gray-500' :
                      Number(row.change) > 0 ? 'price-up' : 
                      Number(row.change) < 0 ? 'price-down' : 'price-neutral'
                    } ${animateEnabled && !row.isHeader && !row.isSubHeader ? 
                      (Number(row.change) > 0 ? 'delta-animate-up' : 
                       Number(row.change) < 0 ? 'delta-animate-down' : '') : ''}`}>
                      {row.change}
                    </td>
                    <td className={`${numericCellBase} ${
                      getPriceTrackingClass(row.changePercent ? Number(row.changePercent) : 0, startingValuesRef.current.get(`${baseKey}-changePercent`), row.isHeader || row.isSubHeader)
                    } ${row.isHeader || row.isSubHeader ? 'text-gray-500' :
                      Number(row.changePercent) > 0 ? 'price-up' : 
                      Number(row.changePercent) < 0 ? 'price-down' : 'price-neutral'
                    }`}>
                      {row.changePercent ? `${row.changePercent}%` : '—'}
                    </td>
                    <td className={`${numericCellBase} ${
                      getPriceTrackingClass(row.oi ? Number(row.oi.replace(/,/g, '')) : 0, startingValuesRef.current.get(`${baseKey}-oi`), row.isHeader || row.isSubHeader)
                    } ${getOIColor(row.oi, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                      {row.oi}
                    </td>
                    <td className={`${numericCellBase} ${
                      getPriceTrackingClass(row.vol ? Number(row.vol.replace(/,/g, '')) : 0, startingValuesRef.current.get(`${baseKey}-vol`), row.isHeader || row.isSubHeader)
                    } ${getVolumeColor(row.vol, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                      {row.vol}
                    </td>
                    <td className={`${numericCellBase} ${
                      getPriceTrackingClass(row.bid ? Number(extractPairValue(row.bid, 0)) : 0, startingValuesRef.current.get(`${baseKey}-bid`), row.isHeader || row.isSubHeader)
                    } ${getBidColor(extractPairValue(row.bid, 0), row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                      {extractPairValue(row.bid, 0)}
                    </td>
                    <td className={`${numericCellBase} ${
                      getPriceTrackingClass(row.ask ? Number(extractPairValue(row.ask, 1)) : 0, startingValuesRef.current.get(`${baseKey}-ask`), row.isHeader || row.isSubHeader)
                    } ${getAskColor(extractPairValue(row.ask, 1), row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                      {extractPairValue(row.ask, 1)}
                    </td>
                    <td className={`${numericCellBase} ${
                      getPriceTrackingClass(row.bidQty ? Number(extractPairValue(row.bidQty, 0).replace(/,/g, '')) : 0, startingValuesRef.current.get(`${baseKey}-bidQty`), row.isHeader || row.isSubHeader)
                    } ${getBidQtyColor(extractPairValue(row.bidQty, 0), row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                      {extractPairValue(row.bidQty, 0)}
                    </td>
                    <td className={`${numericCellBase} ${
                      getPriceTrackingClass(row.askQty ? Number(extractPairValue(row.askQty, 1).replace(/,/g, '')) : 0, startingValuesRef.current.get(`${baseKey}-askQty`), row.isHeader || row.isSubHeader)
                    } ${getAskQtyColor(extractPairValue(row.askQty, 1), row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                      {extractPairValue(row.askQty, 1)}
                    </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-4 text-sm text-gray-500">No data available</div>
      ))}
    </div>
  );
}
