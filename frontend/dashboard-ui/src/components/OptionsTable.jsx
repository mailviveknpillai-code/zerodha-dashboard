import React, { useEffect, useRef } from 'react';
import { getPriceTrackingClass } from '../hooks/usePriceTracking';

export default function OptionsTable({ 
  title, 
  data, 
  blinkEnabled, 
  animateEnabled, 
  dailyStrikePrice 
}) {
  // Track starting values for price movement monitoring
  const startingValuesRef = useRef(new Map());

  // Track starting values for each cell independently
  useEffect(() => {
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
            const numValue = Number(row.bid.split('/')[0]);
            if (!isNaN(numValue)) startingValuesRef.current.set(bidKey, numValue);
          }
        }
        
        // Track Ask
        if (row.ask && row.ask !== '-' && row.ask !== '—') {
          const askKey = `${baseKey}-ask`;
          if (!startingValuesRef.current.has(askKey)) {
            const numValue = Number(row.ask.split('/')[1]);
            if (!isNaN(numValue)) startingValuesRef.current.set(askKey, numValue);
          }
        }
        
        // Track Bid Qty
        if (row.bidQty && row.bidQty !== '-' && row.bidQty !== '—') {
          const bidQtyKey = `${baseKey}-bidQty`;
          if (!startingValuesRef.current.has(bidQtyKey)) {
            const numValue = Number(row.bidQty.split('/')[0]);
            if (!isNaN(numValue)) startingValuesRef.current.set(bidQtyKey, numValue);
          }
        }
        
        // Track Ask Qty
        if (row.askQty && row.askQty !== '-' && row.askQty !== '—') {
          const askQtyKey = `${baseKey}-askQty`;
          if (!startingValuesRef.current.has(askQtyKey)) {
            const numValue = Number(row.askQty.split('/')[1]);
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
  }, [data]);
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

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <h3 className="font-bold text-lg text-gray-900">{title}</h3>
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
            {data.map((row, i) => {
              const baseKey = row.instrumentToken || `${row.tradingsymbol || row.segment}-${i}`;
              
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
                    getPriceTrackingClass(row.bid ? Number(row.bid.split('/')[0]) : 0, startingValuesRef.current.get(`${baseKey}-bid`), row.isHeader || row.isSubHeader)
                  } ${getBidColor(row.bid, row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                    {row.bid ? row.bid.split('/')[0] : '-'}
                  </td>
                  <td className={`py-3 px-4 data-cell ${
                    getPriceTrackingClass(row.ask ? Number(row.ask.split('/')[1]) : 0, startingValuesRef.current.get(`${baseKey}-ask`), row.isHeader || row.isSubHeader)
                  } ${getAskColor(row.ask, row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                    {row.ask ? row.ask.split('/')[1] : '-'}
                  </td>
                  <td className={`py-3 px-4 data-cell ${
                    getPriceTrackingClass(row.bidQty ? Number(row.bidQty.split('/')[0]) : 0, startingValuesRef.current.get(`${baseKey}-bidQty`), row.isHeader || row.isSubHeader)
                  } ${getBidQtyColor(row.bidQty, row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                    {row.bidQty ? row.bidQty.split('/')[0] : '-'}
                  </td>
                  <td className={`py-3 px-4 data-cell ${
                    getPriceTrackingClass(row.askQty ? Number(row.askQty.split('/')[1]) : 0, startingValuesRef.current.get(`${baseKey}-askQty`), row.isHeader || row.isSubHeader)
                  } ${getAskQtyColor(row.askQty, row.ltp, row.isHeader, row.isSubHeader)} ${row.isHeader || row.isSubHeader ? '' : 'font-semibold'}`}>
                    {row.askQty ? row.askQty.split('/')[1] : '-'}
                  </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
