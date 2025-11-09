import React, { useEffect, useState } from 'react';
import DataCell from './common/DataCell';
import { TrendIcon } from './MarketSummary';

export default function FuturesTable({
  spot,
  baseSymbol,
  selectedContract,
  organizedData,
  summaryStats = [],
  fullscreenSections = [],
  connectionWarning = null,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [spotTrend, setSpotTrend] = useState('flat');
  const [volumeTrend, setVolumeTrend] = useState('flat');
  const previousSpotRef = React.useRef(null);
  const previousVolumeRef = React.useRef(null);

  const numericCellBase = 'py-4 sm:py-5 px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis';

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
  };

  const renderRow = (row, key) => {
    const isOptionRow = row.sectionType === 'calls' || row.sectionType === 'puts';
    const isInfoRow = row.isInfoRow;
    const segmentCellClass = `py-4 sm:py-5 px-3 sm:px-4 text-left text-xs sm:text-sm leading-tight border-r border-slate-200/60 dark:border-slate-700/50 last:border-r-0 ${
      row.isHeader ? 'text-sm font-semibold text-gray-600 uppercase tracking-wide' :
      row.isSubHeader ? 'text-sm font-semibold text-gray-500' :
      isInfoRow ? 'text-sm text-gray-500' :
      'pl-6 sm:pl-8 text-gray-900'
    }`;
    const isStaticRow = row.isHeader || row.isSubHeader || isInfoRow;
    const contractId = row.contractKey;
    const shouldColor = !isStaticRow && contractId;

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
        key={key}
        className={rowClassName}
      >
        <td className={segmentCellClass}>
          {isStaticRow ? (
            <span className="truncate block max-w-[200px]">{row.segment}</span>
          ) : isOptionRow ? (
            <div className="flex items-center gap-2">
              {row.badgeLabel && (
                <span className={`segment-badge ${row.sectionType === 'calls' ? 'segment-badge-call' : row.sectionType === 'puts' ? 'segment-badge-put' : 'segment-badge-neutral'}`}>
                  {row.badgeLabel}
                </span>
              )}
              <span className="truncate block max-w-[200px]">{row.segment}</span>
            </div>
          ) : (
            <span className="truncate block max-w-[200px]">{row.segment}</span>
          )}
        </td>
        <DataCell
          value={isStaticRow ? null : (row.ltpRaw ?? null)}
          className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
          displayValue={row.ltp}
          coloringMeta={makeColorMeta('ltp')}
        />
        <DataCell
          value={isStaticRow ? null : (row.changeRaw ?? null)}
          className={numericCellBase}
          displayValue={row.change}
          coloringMeta={makeColorMeta('change')}
        />
        <DataCell
          value={isStaticRow ? null : (row.changePercentRaw ?? null)}
          className={numericCellBase}
          displayValue={row.changePercent}
          coloringMeta={makeColorMeta('changePercent')}
        />
        <DataCell
          value={isStaticRow ? null : (row.oiRaw ?? null)}
          className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
          displayValue={row.oi}
          coloringMeta={makeColorMeta('oi')}
        />
        <DataCell
          value={isStaticRow ? null : (row.volRaw ?? null)}
          className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
          displayValue={row.vol}
          coloringMeta={makeColorMeta('vol')}
        />
        <DataCell
          value={isStaticRow ? null : (row.bidRaw ?? null)}
          className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
          displayValue={row.bid}
          coloringMeta={makeColorMeta('bid')}
        />
        <DataCell
          value={isStaticRow ? null : (row.askRaw ?? null)}
          className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
          displayValue={row.ask}
          coloringMeta={makeColorMeta('ask')}
        />
        <DataCell
          value={isStaticRow ? null : (row.bidQtyRaw ?? null)}
          className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
          displayValue={row.bidQty}
          coloringMeta={makeColorMeta('bidQty')}
        />
        <DataCell
          value={isStaticRow ? null : (row.askQtyRaw ?? null)}
          className={`${numericCellBase} ${isStaticRow ? '' : 'font-semibold'}`}
          displayValue={row.askQty}
          coloringMeta={makeColorMeta('askQty')}
        />
      </tr>
    );
  };

  useEffect(() => {
    if (spot != null) {
      const previousSpot = previousSpotRef.current;
      if (previousSpot !== null && Number.isFinite(previousSpot)) {
        if (spot > previousSpot) setSpotTrend('up');
        else if (spot < previousSpot) setSpotTrend('down');
        else setSpotTrend('flat');
      }
      previousSpotRef.current = spot;
    }
  }, [spot]);

  useEffect(() => {
    if (summaryStats?.length) {
      const volStat = summaryStats.find(stat => stat.key === 'futuresVol');
      if (volStat && Number.isFinite(volStat.value)) {
        const previousVol = previousVolumeRef.current;
        if (previousVol !== null && Number.isFinite(previousVol)) {
          if (volStat.value > previousVol) setVolumeTrend('up');
          else if (volStat.value < previousVol) setVolumeTrend('down');
          else setVolumeTrend('flat');
        }
        previousVolumeRef.current = volStat.value;
      }
    }
  }, [summaryStats]);

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

  const organizedRows = organizedData && organizedData.length > 0
    ? organizedData
    : [{ segment: 'No data available', ltp: '-', change: '-', oi: '-', vol: '-', bid: '-', bidQty: '-', ask: '-', askQty: '-' }];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-white px-4 sm:px-6 py-4 border-b border-gray-200">
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
          {summaryStats.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-900 dark:text-gray-100">
              {summaryStats.map(stat => {
                if (stat.value === null || stat.value === undefined || stat.value === '') {
                  return null;
                }
                const displayValue = stat.format ? stat.format(stat.value) : formatNumber(stat.value);
                return (
                  <div key={stat.key} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stat.color || 'bg-gray-400'}`}></span>
                    <span className="font-semibold">{stat.label}: {displayValue}</span>
                  </div>
                );
              })}
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
          {organizedRows.map((row, i) => renderRow(row, `main-${i}`))}
          {fullscreenSections.map((section, sectionIndex) => (
            isFullscreen && (
              <React.Fragment key={`section-${sectionIndex}`}>
                <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60">
                  <td colSpan={10} className="px-8 py-4 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 flex flex-col gap-2">
                    <span>{section.title}</span>
                    {section.headerSlot && (
                      <div className="text-left text-[11px] sm:text-xs font-normal text-gray-500">
                        {section.headerSlot}
                      </div>
                    )}
                  </td>
                </tr>
                {section.rows.map((row, rowIndex) => renderRow(row, `section-${sectionIndex}-${rowIndex}`))}
              </React.Fragment>
            )
          ))}
        </tbody>
      </table>
      </div>
      
      {/* Professional Edge-to-Edge Fullscreen Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
          {/* Professional Header - Edge to Edge */}
          <div className={`bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-lg p-6 ${isFullscreen ? 'mt-0 relative' : 'mt-4'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
              <div>
                <div className="flex items-center gap-3">
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
                  <div className="flex items-center space-x-4 bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold">
                    <span className="flex items-center gap-2 text-green-300">
                      <TrendIcon direction={spotTrend} />
                      Spot: ₹{spot ?? '—'}
                    </span>
                    {summaryStats?.length > 0 && (
                      <span className="flex items-center gap-2 text-indigo-200">
                        <TrendIcon direction={volumeTrend} />
                        Vol: {formatNumber(summaryStats.find(stat => stat.key === 'futuresVol')?.value)}
                      </span>
                    )}
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
            {isFullscreen && connectionWarning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-3 px-4 py-2 bg-red-600/95 text-white rounded-full shadow-lg animate-pulse">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm font-semibold uppercase tracking-wide">Live feed interrupted</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Professional Table - Edge to Edge */}
          <div className="flex-1 overflow-hidden px-6 pb-8 pt-6">
            <table className="w-full text-base table-fixed">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold">
                <tr>
                  <th className="text-left px-6 py-4 border-r border-slate-200 dark:border-slate-600">Segment</th>
                  <th className="px-6 py-4 text-right border-r border-slate-200 dark:border-slate-600">LTP</th>
                  <th className="px-6 py-4 text-right border-r border-slate-200 dark:border-slate-600">Δ Price</th>
                  <th className="px-6 py-4 text-right border-r border-slate-200 dark:border-slate-600">%Δ</th>
                  <th className="px-6 py-4 text-right border-r border-slate-200 dark:border-slate-600">OI</th>
                  <th className="px-6 py-4 text-right border-r border-slate-200 dark:border-slate-600">Vol</th>
                  <th className="px-6 py-4 text-right border-r border-slate-200 dark:border-slate-600">Bid</th>
                  <th className="px-6 py-4 text-right border-r border-slate-200 dark:border-slate-600">Ask</th>
                  <th className="px-6 py-4 text-right border-r border-slate-200 dark:border-slate-600">Bid Qty</th>
                  <th className="px-6 py-4 text-right">Ask Qty</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900">
                {organizedRows.map((row, i) => renderRow(row, `fullscreen-main-${i}`))}
                {fullscreenSections.map((section, sectionIndex) => (
                  <React.Fragment key={`fullscreen-section-${sectionIndex}`}>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-700">
                      <td colSpan={10} className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col gap-2">
                          <span>{section.title}</span>
                          {section.headerSlot && (
                            <div className="text-left text-[11px] sm:text-xs font-normal text-slate-500 dark:text-slate-400">
                              {section.headerSlot}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {section.rows.map((row, rowIndex) => renderRow(row, `fullscreen-section-${sectionIndex}-${rowIndex}`))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
