import React from 'react';
import DataCell from './common/DataCell';
import { useTheme } from '../contexts/ThemeContext';
import { useContractColoringContext } from '../contexts/ContractColorContext';

export default function OptionsTable({
  title,
  data,
  dailyStrikePrice,
  collapsible = false,
  collapsed = false,
  onToggle,
  headerExtras = null,
  enableColoring = false,
  headerSlot = null,
}) {
  const hasData = Array.isArray(data) && data.length > 0;
  const { isDarkMode } = useTheme();
  const colorContext = useContractColoringContext();
  
  // Helper to get delta OI using separate OI cache
  const getDeltaOi = (contractKey, currentOi) => {
    if (!colorContext || !contractKey || currentOi === null || currentOi === undefined) {
      return null;
    }
    // Update OI cache (only updates if OI changed) and get delta
    return colorContext.updateOiCache(contractKey, currentOi);
  };
  
  const formatInteger = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.round(numeric).toLocaleString() : String(value);
  };

  const containerClasses = [
    'rounded-xl border shadow-sm overflow-hidden mb-6',
    isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-gray-200 text-gray-900',
  ].join(' ');

  const headerClasses = [
    'px-4 sm:px-6 border-b',
    isDarkMode ? 'bg-slate-800/70 border-slate-600' : 'bg-white border-gray-200',
    hasData && collapsed ? 'py-2' : 'py-4',
  ].join(' ');

  const titleColor = isDarkMode ? 'text-slate-100' : 'text-gray-900';
  const subtitleColor = isDarkMode ? 'text-slate-300' : 'text-gray-500';
  const actionButton = isDarkMode
    ? 'text-slate-200 hover:text-slate-100 hover:bg-slate-700'
    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200';

  const tableHeaderClasses = isDarkMode
    ? 'bg-slate-700/50 text-slate-200'
    : 'bg-gray-50 text-gray-600';

  const hoverRow = isDarkMode ? 'hover:bg-slate-700/40' : 'hover:bg-blue-50';

  return (
    <div 
      className={`${containerClasses} ${!isDarkMode ? 'table-halo-border' : ''}`}
      onDoubleClick={collapsible ? onToggle : undefined}
      style={collapsible ? { cursor: 'pointer' } : {}}
    >
      <div 
        className={headerClasses}
        onDoubleClick={collapsible ? onToggle : undefined}
        style={collapsible ? { cursor: 'pointer' } : {}}
      >
        <div className={`flex flex-col ${collapsed ? 'gap-2' : 'gap-3'} sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex flex-col gap-1">
            <h3 className={`font-semibold text-base ${isDarkMode ? 'text-slate-300' : 'bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent'} tracking-wide`}>{title}</h3>
            {dailyStrikePrice != null && (
              <span className={`text-xs ${subtitleColor}`}>Daily Strike: {dailyStrikePrice}</span>
            )}
            {headerSlot && (
              <div className="mt-1">{headerSlot}</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {headerExtras}
            {collapsible && (
              <button
                type="button"
                onClick={onToggle}
                className={`w-8 h-8 flex items-center justify-center text-xl font-bold rounded-full transition-colors ${actionButton} ${
                  collapsed ? 'text-base' : ''
                }`}
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
          <table className="w-full text-xs sm:text-sm table-fixed">
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead className={`${tableHeaderClasses} text-xs font-semibold uppercase tracking-wide`}>
              <tr>
                <th className="text-left px-3 sm:px-4 py-3">Segment</th>
                <th className="px-3 sm:px-4 py-3 text-right">LTP</th>
                <th className="px-3 sm:px-4 py-3 text-right">OI</th>
                <th className="px-3 sm:px-4 py-3 text-right">Δ OI</th>
                <th className="px-3 sm:px-4 py-3 text-right">Vol</th>
                <th className="px-3 sm:px-4 py-3 text-right">Bid</th>
                <th className="px-3 sm:px-4 py-3 text-right">Ask</th>
                <th className="px-3 sm:px-4 py-3 text-right">Bid Qty</th>
                <th className="px-3 sm:px-4 py-3 text-right">ΔB/A QTY</th>
                <th className="px-3 sm:px-4 py-3 text-right">Ask Qty</th>
                <th className="px-3 sm:px-4 py-3 text-right">Δ Price</th>
              </tr>
            </thead>
            <tbody>
              {data
                .filter(row => !row.isHeader) // Remove "Strike: <value>" header rows
                .map((row, index) => {
                const numericCellBase = 'py-2 sm:py-3 px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis';
                const borderClass = isDarkMode ? 'border-slate-600/60' : 'border-slate-200/60';
                const segmentCellClass = `py-2 sm:py-3 px-3 sm:px-4 text-left text-xs sm:text-sm leading-tight border-r ${borderClass} last:border-r-0 ${
                  row.isHeader
                    ? `text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-600'} uppercase tracking-wide`
                    : row.isSubHeader
                    ? `text-sm font-semibold ${subtitleColor}`
                    : row.isInfoRow
                    ? `text-sm ${subtitleColor}`
                    : `pl-6 sm:pl-8 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`
                }`;
                const isStaticRow = row.isHeader || row.isSubHeader || row.isInfoRow;
                const contractId = row.contractKey;
                const shouldColor = enableColoring && !isStaticRow && contractId;

                const badgeToneClassMap = {
                  call: 'segment-badge-call',
                  put: 'segment-badge-put',
                  'call-itm': 'segment-badge-call-itm',
                  'call-atm': 'segment-badge-call-atm',
                  'call-otm': 'segment-badge-call-otm',
                  'put-itm': 'segment-badge-put-itm',
                  'put-atm': 'segment-badge-put-atm',
                  'put-otm': 'segment-badge-put-otm',
                };

                const badgeToneClass = badgeToneClassMap[row.badgeTone] || 'segment-badge-neutral';

                // Show pills on main page with appropriate format
                const badgeNode = row.badgeLabel ? (
                  <span className={`segment-badge ${badgeToneClass}`}>
                    {row.badgeLabel}
                  </span>
                ) : null;

                const hasStrikePrice = row.strikePrice != null && !row.isHeader && !row.isSubHeader && !row.isInfoRow;
                const strikeDisplay = hasStrikePrice ? `@ ${Number(row.strikePrice).toLocaleString()}` : null;

                const renderSegmentContent = () => {
                  if (row.isHeader) {
                    return (
                      <div className="flex items-center gap-2">
                        {badgeNode}
                        {row.segment && <span className="truncate block max-w-[220px]">{row.segment}</span>}
                      </div>
                    );
                  }
                  if (row.isSubHeader) {
                    return (
                      <div className="flex items-center gap-2 text-gray-500">
                        {badgeNode}
                        {row.segment && <span className="truncate block max-w-[220px]">{row.segment}</span>}
                      </div>
                    );
                  }
                  if (row.isInfoRow) {
                    return <span className="truncate block max-w-[220px]">{row.segment}</span>;
                  }
                  // For contract rows with strike price and badge: show pill @ strike price format
                  if (hasStrikePrice && badgeNode) {
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {badgeNode}
                          {strikeDisplay && <span className="text-xs sm:text-sm">{strikeDisplay}</span>}
                        </div>
                        <div className="truncate text-xs sm:text-sm opacity-80">
                          {row.tradingsymbol || row.segment || '-'}
                        </div>
                      </div>
                    );
                  }
                  // Fallback for rows without strike price
                  return (
                    <div className="flex items-center gap-2">
                      {badgeNode}
                      <span className="truncate block max-w-[220px]">{row.segment}</span>
                    </div>
                  );
                };

                const makeColorMeta = (fieldKey) => {
                  if (!shouldColor) return null;
                  return {
                    contractId,
                    fieldKey,
                    dayHigh: row.highs?.[fieldKey] ?? null,
                    dayLow: row.lows?.[fieldKey] ?? null,
                  };
                };

                const isHeaderRow = row.isHeader;
                const rowBorderClass = isHeaderRow
                  ? 'border-b border-transparent'
                  : `border-b ${isDarkMode ? 'border-slate-700/60' : 'border-slate-200/70'}`;
                const rowClassName = `${rowBorderClass} last:border-0 ${hoverRow} transition-colors`;

                return (
                  <tr
                    key={index}
                    className={rowClassName}
                  >
                    <td className={segmentCellClass}>
                      {renderSegmentContent()}
                    </td>
                    <DataCell
                      value={isStaticRow ? null : row.ltpRaw}
                      className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
                      displayValue={row.ltp}
                      coloringMeta={makeColorMeta('ltp')}
                    />
                    <DataCell
                      value={isStaticRow ? null : row.oiRaw}
                      className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
                      displayValue={row.oi}
                      coloringMeta={makeColorMeta('oi')}
                    />
                    {(() => {
                      // Get delta OI for this row (evaluates OI and retrieves stored delta)
                      const hasContract = !isStaticRow && row.contractKey;
                      const hasOiValue = row.oiRaw !== null && row.oiRaw !== undefined;
                      
                      let deltaOi = null;
                      if (hasContract && hasOiValue) {
                        deltaOi = getDeltaOi(row.contractKey, row.oiRaw);
                      }
                      
                      // Show delta value if available, otherwise empty string (no placeholder)
                      const deltaOiDisplay = deltaOi !== null && deltaOi !== undefined
                        ? (deltaOi > 0 ? `+${formatInteger(deltaOi)}` : formatInteger(deltaOi))
                        : '';
                      
                      return (
                        <DataCell
                          value={isStaticRow ? null : (row.oiRaw ?? null)}
                          className={numericCellBase}
                          displayValue={deltaOiDisplay}
                          coloringMeta={!isStaticRow && row.contractKey ? makeColorMeta('oi') : null}
                        />
                      );
                    })()}
                    <DataCell
                      value={isStaticRow ? null : (row.volRaw ?? null)}
                      className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
                      displayValue={row.vol}
                      coloringMeta={makeColorMeta('vol')}
                      title={!isStaticRow && row.originalVol != null ? `API Volume: ${Number(row.originalVol).toLocaleString()}` : null}
                    />
                    <DataCell
                      value={isStaticRow ? null : row.bidRaw}
                      className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
                      displayValue={row.bid}
                      coloringMeta={makeColorMeta('bid')}
                    />
                    <DataCell
                      value={isStaticRow ? null : row.askRaw}
                      className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
                      displayValue={row.ask}
                      coloringMeta={makeColorMeta('ask')}
                    />
                    <DataCell
                      value={isStaticRow ? null : row.bidQtyRaw}
                      className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
                      displayValue={row.bidQty}
                      coloringMeta={makeColorMeta('bidQty')}
                    />
                    {(() => {
                      // Calculate ΔB/A QTY = bidQty - askQty
                      const bidQty = isStaticRow ? null : (row.bidQtyRaw ?? null);
                      const askQty = isStaticRow ? null : (row.askQtyRaw ?? null);
                      const deltaBA = bidQty !== null && askQty !== null && Number.isFinite(bidQty) && Number.isFinite(askQty)
                        ? bidQty - askQty
                        : null;
                      
                      const deltaBADisplay = deltaBA !== null && deltaBA !== undefined
                        ? (deltaBA > 0 ? `+${formatInteger(deltaBA)}` : formatInteger(deltaBA))
                        : '';
                      
                      return (
                        <DataCell
                          value={isStaticRow ? null : deltaBA}
                          className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
                          displayValue={deltaBADisplay}
                          coloringMeta={makeColorMeta('deltaBA')}
                        />
                      );
                    })()}
                    <DataCell
                      value={isStaticRow ? null : row.askQtyRaw}
                      className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
                      displayValue={row.askQty}
                      coloringMeta={makeColorMeta('askQty')}
                    />
                    <DataCell
                      value={isStaticRow ? null : row.changeRaw}
                      className={numericCellBase}
                      displayValue={row.change}
                      coloringMeta={makeColorMeta('change')}
                    />
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

