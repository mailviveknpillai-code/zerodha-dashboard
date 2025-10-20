import React from 'react';

export default function OptionsTable({ 
  title, 
  data, 
  blinkEnabled, 
  animateEnabled, 
  dailyStrikePrice 
}) {
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
              <th className="px-4 py-3">Bid/Ask</th>
              <th className="px-4 py-3">Bid Qty/Ask Qty</th>
              <th className="text-center px-4 py-3">Indicator</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
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
    </div>
  );
}
