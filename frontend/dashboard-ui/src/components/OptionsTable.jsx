import React from 'react';
import DataCell from './common/DataCell';

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <div className={`bg-white px-4 sm:px-6 ${collapsed ? 'py-2' : 'py-4'} border-b border-gray-200`}>
        <div className={`flex flex-col ${collapsed ? 'gap-2' : 'gap-3'} sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-lg text-gray-900">{title}</h3>
            {dailyStrikePrice != null && (
              <span className="text-xs text-gray-500">Daily Strike: {dailyStrikePrice}</span>
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
                className={`w-8 h-8 flex items-center justify-center text-xl font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors ${collapsed ? 'text-base' : ''}`}
                aria-label={collapsed ? 'Expand table' : 'Collapse table'}
              >
                {collapsed ? '+' : '−'}
              </button>
            )}
          </div>
        </div>
      </div>

      {!collapsed && (hasData ? (
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-xs sm:text-sm table-auto md:table-fixed">
            <colgroup>
              <col className="md:w-56" />
              <col className="md:w-24" />
              <col className="md:w-24" />
              <col className="md:w-20" />
              <col className="md:w-24" />
              <col className="md:w-24" />
              <col className="md:w-24" />
              <col className="md:w-24" />
              <col className="md:w-24" />
              <col className="md:w-24" />
            </colgroup>
            <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 sm:px-4 py-3">Segment</th>
                <th className="px-3 sm:px-4 py-3 text-right">LTP</th>
                <th className="px-3 sm:px-4 py-3 text-right">Δ Price</th>
                <th className="px-3 sm:px-4 py-3 text-right">%Δ</th>
                <th className="px-3 sm:px-4 py-3 text-right">OI</th>
                <th className="px-3 sm:px-4 py-3 text-right">Vol</th>
                <th className="px-3 sm:px-4 py-3 text-right">Bid</th>
                <th className="px-3 sm:px-4 py-3 text-right">Ask</th>
                <th className="px-3 sm:px-4 py-3 text-right">Bid Qty</th>
                <th className="px-3 sm:px-4 py-3 text-right">Ask Qty</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => {
                const numericCellBase = 'py-2 sm:py-3 px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis';
                const segmentCellClass = `py-2 sm:py-3 px-3 sm:px-4 text-left text-xs sm:text-sm leading-tight border-r border-slate-200/60 dark:border-slate-700/50 last:border-r-0 ${
                  row.isHeader ? 'text-sm font-semibold text-gray-600 uppercase tracking-wide' :
                  row.isSubHeader ? 'text-sm font-semibold text-gray-500' :
                  row.isInfoRow ? 'text-sm text-gray-500' :
                  'pl-6 sm:pl-8 text-gray-900'
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

                const badgeNode = row.badgeLabel ? (
                  <span className={`segment-badge ${badgeToneClass}`}>
                    {row.badgeLabel}
                  </span>
                ) : null;

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
                const rowBorderClass = isHeaderRow ? 'border-b border-transparent' : 'border-b border-slate-200/70';
                const rowClassName = `${rowBorderClass} last:border-0 hover:bg-blue-50 transition-colors`;

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
                      value={isStaticRow ? null : row.changeRaw}
                      className={numericCellBase}
                      displayValue={row.change}
                      coloringMeta={makeColorMeta('change')}
                    />
                    <DataCell
                      value={isStaticRow ? null : row.changePercentRaw}
                      className={numericCellBase}
                      displayValue={row.changePercent}
                      coloringMeta={makeColorMeta('changePercent')}
                    />
                    <DataCell
                      value={isStaticRow ? null : row.oiRaw}
                      className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
                      displayValue={row.oi}
                      coloringMeta={makeColorMeta('oi')}
                    />
                    <DataCell
                      value={isStaticRow ? null : row.volRaw}
                      className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
                      displayValue={row.vol}
                      coloringMeta={makeColorMeta('vol')}
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
                    <DataCell
                      value={isStaticRow ? null : row.askQtyRaw}
                      className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
                      displayValue={row.askQty}
                      coloringMeta={makeColorMeta('askQty')}
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

