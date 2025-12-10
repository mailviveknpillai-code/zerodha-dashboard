import React, { useEffect, useState, useMemo } from 'react';
import DataCell from './common/DataCell';
import LTPCell from './common/LTPCell';
import DeltaBACell from './common/DeltaBACell';
import BidQtyCell from './common/BidQtyCell';
import AskQtyCell from './common/AskQtyCell';
import { TrendIcon } from './MarketSummary';
import { useTheme } from '../contexts/ThemeContext';
// Trend is now calculated in backend - removed useMarketTrend import
import { useContractColoringContext } from '../contexts/ContractColorContext';

export default function FuturesTable({
  spot,
  baseSymbol,
  selectedContract,
  organizedData,
  summaryStats = [],
  fullscreenSections = [],
  connectionWarning = null,
  derivativesData = null,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [spotTrend, setSpotTrend] = useState('flat');
  const [volumeTrend, setVolumeTrend] = useState('flat');
  const previousSpotRef = React.useRef(null);
  const previousVolumeRef = React.useRef(null);
  const { isDarkMode } = useTheme();
  
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

  // Base numeric cell padding - will be overridden for main table contract rows
  const getNumericCellBase = (key) => {
    const isMainTableRow = typeof key === 'string' && key.startsWith('main-');
    const isMainTableContractRow = isMainTableRow && key.includes('main-') && !key.includes('section');
    // Check if this is a contract row by checking the row data when rendering
    return 'px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis';
  };
  
  const numericCellBase =
    'py-4 sm:py-5 px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis';
  const cardBase = isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-gray-200 text-gray-900';
  const headerTitleColor = isDarkMode ? 'text-slate-200' : 'text-gray-900';
  const headerSubtitleColor = isDarkMode ? 'text-slate-300' : 'text-gray-600';
  const summaryTextColor = isDarkMode ? 'text-slate-100' : 'text-gray-900';
  const summarySubtleText = isDarkMode ? 'text-slate-400' : 'text-gray-500';
  const buttonClasses = isDarkMode
    ? 'p-2 text-slate-200 hover:text-slate-100 hover:bg-slate-700'
    : 'p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200';
  const hoverRow = isDarkMode ? 'hover:bg-slate-700/40' : 'hover:bg-blue-50';

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
  };

  const renderRow = (row, key) => {
    const isOptionRow = row.sectionType === 'calls' || row.sectionType === 'puts';
    const isInfoRow = row.isInfoRow;
    const isMainTableRow = typeof key === 'string' && (key.startsWith('main-') || key.startsWith('fullscreen-main-'));
    const isMainTableContractRow = isMainTableRow && !row.isHeader && !row.isSubHeader && !isInfoRow;
    
    // Increase row height by 40% for main table contract rows
    // py-4 = 16px, 40% more = 22.4px; py-5 = 20px, 40% more = 28px
    const mainTableRowPadding = isMainTableContractRow ? 'py-[22px] sm:py-[28px]' : 'py-4 sm:py-5';
    const mainTableNumericPadding = isMainTableContractRow ? 'py-[22px] sm:py-[28px]' : 'py-4 sm:py-5';
    
    const borderClass = isDarkMode ? 'border-slate-600/60' : 'border-slate-200/60';
    const segmentCellClass = `${mainTableRowPadding} px-3 sm:px-4 text-left text-xs sm:text-sm leading-tight border-r ${borderClass} last:border-r-0 ${
      row.isHeader
        ? `text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-600'} uppercase tracking-wide`
        : row.isSubHeader
        ? `text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`
        : isInfoRow
        ? `text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`
        : `pl-6 sm:pl-8 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`
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
    const isFuturesRow = row.sectionType === 'futures' || (isMainTableRow && !isOptionRow);
    const rowBorderClass = isHeaderRow
      ? 'border-b border-transparent'
      : `border-b ${isDarkMode ? 'border-slate-700/60' : 'border-slate-200/70'}`;
    const rowClassName = `${rowBorderClass} last:border-0 ${hoverRow} transition-colors`;

    return (
      <tr
        key={key}
        className={rowClassName}
        data-row-type={isFuturesRow ? 'futures' : undefined}
      >
        <td className={segmentCellClass}>
          {isHeaderRow && isFullscreen && !isMainTableRow && row.badgeLabel ? (
            // Header rows (strike price rows) in fullscreen mode for sections - show pills with ITM/ATM/OTM
            <div className="flex items-center gap-2">
              <span className={`segment-badge ${
                row.badgeTone === 'call-itm' ? 'segment-badge-call-itm' :
                row.badgeTone === 'call-atm' ? 'segment-badge-call-atm' :
                row.badgeTone === 'call-otm' ? 'segment-badge-call-otm' :
                row.badgeTone === 'put-itm' ? 'segment-badge-put-itm' :
                row.badgeTone === 'put-atm' ? 'segment-badge-put-atm' :
                row.badgeTone === 'put-otm' ? 'segment-badge-put-otm' :
                row.sectionType === 'calls' ? 'segment-badge-call' :
                row.sectionType === 'puts' ? 'segment-badge-put' :
                'segment-badge-neutral'
              }`}>
                {row.badgeLabel}
              </span>
              <span className="truncate block max-w-[200px]">{row.segment}</span>
            </div>
          ) : isStaticRow ? (
            <span className="truncate block max-w-[200px]">{row.segment}</span>
          ) : isOptionRow ? (
            <div className="flex flex-col gap-1">
              {/* Section rows (above spot, below spot, dynamic strike) */}
              {!isMainTableRow && row.badgeLabel && row.strikePrice != null ? (
                <>
                  {isFullscreen ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className={`segment-badge ${
                          row.badgeTone === 'call-itm' ? 'segment-badge-call-itm' :
                          row.badgeTone === 'call-atm' ? 'segment-badge-call-atm' :
                          row.badgeTone === 'call-otm' ? 'segment-badge-call-otm' :
                          row.badgeTone === 'put-itm' ? 'segment-badge-put-itm' :
                          row.badgeTone === 'put-atm' ? 'segment-badge-put-atm' :
                          row.badgeTone === 'put-otm' ? 'segment-badge-put-otm' :
                          row.sectionType === 'calls' ? 'segment-badge-call' :
                          row.sectionType === 'puts' ? 'segment-badge-put' :
                          'segment-badge-neutral'
                        }`}>
                          {row.badgeLabel}
                        </span>
                        <span className="text-xs sm:text-sm">
                          @ {Number(row.strikePrice).toLocaleString()}
                        </span>
                      </div>
                      <div className="truncate text-xs sm:text-sm opacity-80">
                        {row.tradingsymbol || row.segment || '-'}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Main page: pill(call/put itm/atm/otm) at beginning of row */}
                      <div className="flex items-center gap-2">
                        <span className={`segment-badge ${
                          row.badgeTone === 'call-itm' ? 'segment-badge-call-itm' :
                          row.badgeTone === 'call-atm' ? 'segment-badge-call-atm' :
                          row.badgeTone === 'call-otm' ? 'segment-badge-call-otm' :
                          row.badgeTone === 'put-itm' ? 'segment-badge-put-itm' :
                          row.badgeTone === 'put-atm' ? 'segment-badge-put-atm' :
                          row.badgeTone === 'put-otm' ? 'segment-badge-put-otm' :
                          row.sectionType === 'calls' ? 'segment-badge-call' :
                          row.sectionType === 'puts' ? 'segment-badge-put' :
                          'segment-badge-neutral'
                        }`}>
                          {row.badgeLabel}
                        </span>
                        <span className="text-xs sm:text-sm">
                          @ {Number(row.strikePrice).toLocaleString()}
                        </span>
                      </div>
                      <div className="truncate text-xs sm:text-sm opacity-80">
                        {row.tradingsymbol || row.segment || '-'}
                      </div>
                    </>
                  )}
                </>
              ) : isMainTableRow && row.strikePrice != null ? (
                <>
                  {/* Main table rows (NIFTY DERIVATIVES) */}
                  {isFullscreen ? (
                    <>
                      <div className="flex items-center gap-2">
                        {row.sectionType === 'calls' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
                            CALL
                          </span>
                        )}
                        {row.sectionType === 'puts' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 whitespace-nowrap">
                            PUT
                          </span>
                        )}
                        <span className="text-xs sm:text-sm">
                          @ {Number(row.strikePrice).toLocaleString()}
                        </span>
                      </div>
                      <div className="truncate text-xs sm:text-sm opacity-80">
                        {row.tradingsymbol || row.segment || '-'}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Main page: pill(call/put) @ strike price */}
                      <div className="flex items-center gap-2">
                        {row.sectionType === 'calls' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
                            CALL
                          </span>
                        )}
                        {row.sectionType === 'puts' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 whitespace-nowrap">
                            PUT
                          </span>
                        )}
                        <span className="text-xs sm:text-sm">
                          @ {Number(row.strikePrice).toLocaleString()}
                        </span>
                      </div>
                      <div className="truncate text-xs sm:text-sm opacity-80">
                        {row.tradingsymbol || row.segment || '-'}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Fallback for rows without strike price */}
                  {row.badgeLabel && (
                    <span className={`segment-badge ${row.sectionType === 'calls' ? 'segment-badge-call' : row.sectionType === 'puts' ? 'segment-badge-put' : 'segment-badge-neutral'}`}>
                      {row.badgeLabel}
                    </span>
                  )}
                  <span className="truncate block max-w-[200px]">{row.segment}</span>
                </>
              )}
            </div>
          ) : (
            <span className="truncate block max-w-[200px]">{row.segment}</span>
          )}
        </td>
        {isStaticRow ? (
          <DataCell
            value={null}
            className={`${mainTableNumericPadding} px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis`}
            displayValue={row.ltp}
            coloringMeta={null}
          />
        ) : (
          <LTPCell
            value={row.ltpRaw ?? null}
            className={`${mainTableNumericPadding} px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell text-xs sm:text-sm ${isStaticRow ? '' : 'font-semibold'}`}
            displayValue={row.ltp}
            coloringMeta={makeColorMeta('ltp')}
            ltpMovementDirection={row.ltpMovementDirection}
            ltpMovementConfidence={row.ltpMovementConfidence}
            ltpMovementIntensity={row.ltpMovementIntensity}
          />
        )}
        <DataCell
          value={isStaticRow ? null : (row.oiRaw ?? null)}
          className={`${mainTableNumericPadding} px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis ${isStaticRow ? '' : 'font-semibold'}`}
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
              className={`${mainTableNumericPadding} px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis`}
              displayValue={deltaOiDisplay}
              coloringMeta={!isStaticRow && row.contractKey ? makeColorMeta('oi') : null}
            />
          );
        })()}
        <DataCell
          value={isStaticRow ? null : (row.volRaw ?? null)}
          className={`${mainTableNumericPadding} px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis ${isStaticRow ? '' : 'font-semibold'}`}
          displayValue={row.vol}
          coloringMeta={makeColorMeta('vol')}
          title={!isStaticRow && row.originalVol != null ? `API Volume: ${Number(row.originalVol).toLocaleString()}` : null}
        />
        <DataCell
          value={isStaticRow ? null : (row.bidRaw ?? null)}
          className={`${mainTableNumericPadding} px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis ${isStaticRow ? '' : 'font-semibold'}`}
          displayValue={row.bid}
          coloringMeta={makeColorMeta('bid')}
        />
        <DataCell
          value={isStaticRow ? null : (row.askRaw ?? null)}
          className={`${mainTableNumericPadding} px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis ${isStaticRow ? '' : 'font-semibold'}`}
          displayValue={row.ask}
          coloringMeta={makeColorMeta('ask')}
        />
        <BidQtyCell
          bidQtyValue={isStaticRow ? null : (row.bidQtyRaw ?? null)}
          bidQtyDisplay={row.bidQty}
          bidEatenValue={isStaticRow ? null : (row.bidEatenRaw ?? null)}
          className={`${mainTableNumericPadding} px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis ${isStaticRow ? '' : 'font-semibold'}`}
          coloringMeta={makeColorMeta('bidQty')}
          title="Bid Quantity (updates at UI refresh rate). Bubble shows Bid Eaten (uses eaten delta window interval)"
        />
        {(() => {
          // Calculate ΔB/A QTY = bidQty - askQty
          // NOTE: This value updates at the UI refresh rate (frontend polls /latest endpoint)
          // The eaten delta window interval ONLY affects the bubble (eatenDeltaRaw)
          // API polling interval controls when backend fetches from Zerodha API
          const bidQty = isStaticRow ? null : (row.bidQtyRaw ?? null);
          const askQty = isStaticRow ? null : (row.askQtyRaw ?? null);
          const deltaBA = bidQty !== null && askQty !== null && Number.isFinite(bidQty) && Number.isFinite(askQty)
            ? bidQty - askQty
            : null;
          
          const deltaBADisplay = deltaBA !== null && deltaBA !== undefined
            ? (deltaBA > 0 ? `+${formatInteger(deltaBA)}` : formatInteger(deltaBA))
            : '';
          
          return (
            <DeltaBACell
              deltaBAValue={isStaticRow ? null : deltaBA}
              deltaBADisplay={deltaBADisplay}
              eatenDeltaValue={isStaticRow ? null : (row.eatenDeltaRaw ?? null)}
              className={`${mainTableNumericPadding} px-2 sm:px-4 whitespace-nowrap tabular-nums font-mono data-cell text-xs sm:text-sm ${isStaticRow ? '' : 'font-semibold'}`}
              coloringMeta={makeColorMeta('deltaBA')}
              title="ΔB/A QTY = Bid Qty - Ask Qty (updates at UI refresh rate). Bubble shows Eaten Δ (uses eaten delta window interval)"
            />
          );
        })()}
        <AskQtyCell
          askQtyValue={isStaticRow ? null : (row.askQtyRaw ?? null)}
          askQtyDisplay={row.askQty}
          askEatenValue={isStaticRow ? null : (row.askEatenRaw ?? null)}
          className={`${mainTableNumericPadding} px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis ${isStaticRow ? '' : 'font-semibold'}`}
          coloringMeta={makeColorMeta('askQty')}
          title="Ask Quantity (updates at UI refresh rate). Bubble shows Ask Eaten (uses eaten delta window interval)"
        />
        <DataCell
          value={isStaticRow ? null : (row.changeRaw ?? null)}
          className={`${mainTableNumericPadding} px-2 sm:px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm overflow-hidden text-ellipsis`}
          displayValue={row.change}
          coloringMeta={makeColorMeta('change')}
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
        // Maintain previous state if value is same
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
          // Maintain previous state if value is same
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

  // Listen for fullscreen changes and restore state on mount
  useEffect(() => {
    // Check if already in fullscreen on mount (e.g., after page reload)
    const checkFullscreenState = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      if (isCurrentlyFullscreen && !isFullscreen) {
        setIsFullscreen(true);
      }
    };

    // Check immediately
    checkFullscreenState();

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    // Also check on visibility change (when tab becomes visible again)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkFullscreenState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isFullscreen]);

  const organizedRows = organizedData && organizedData.length > 0
    ? organizedData
    : [{ segment: 'No data available', ltp: '-', change: '-', oi: '-', vol: '-', bid: '-', bidQty: '-', ask: '-', askQty: '-' }];

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${cardBase} ${
      !isFullscreen && !isDarkMode ? 'table-halo-border-strong' : ''
    }`}>
      <div
        className={`px-4 sm:px-6 py-4 border-b ${
          isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className={`font-semibold text-base tracking-wide flex items-center gap-3`}>
              <span className={isDarkMode ? 'text-slate-300' : 'bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent'}>
                NIFTY DERIVATIVES
                {selectedContract && (
                  <span className={`text-sm font-normal ml-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                    - {selectedContract.tradingsymbol || selectedContract.instrumentToken}
                  </span>
                )}
              </span>
              {marketTrend && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full transition-all duration-300 ${
                  marketTrend.classification === 'Bullish' 
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30' 
                    : marketTrend.classification === 'Bearish'
                    ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                    : 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30'
                }`}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${
                    marketTrend.classification === 'Bullish' 
                      ? 'bg-green-500' 
                      : marketTrend.classification === 'Bearish'
                      ? 'bg-red-500'
                      : 'bg-gray-500'
                  }`}></span>
                  {marketTrend.classification} {marketTrend.score != null ? `(${marketTrend.score > 0 ? '+' : ''}${marketTrend.score.toFixed(1)})` : ''}
                </span>
              )}
              {/* Spot LTP Trend Pill */}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full transition-all duration-300 ${
                spotLtpTrend.direction === 'UP'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : spotLtpTrend.direction === 'DOWN'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30'
              }`}>
                <span className="mr-1">
                  {spotLtpTrend.direction === 'UP' ? '↑' : spotLtpTrend.direction === 'DOWN' ? '↓' : '→'}
                </span>
                LTP {spotLtpTrend.percent > 0 ? '+' : ''}{spotLtpTrend.percent.toFixed(2)}%
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-4">
          {summaryStats.length > 0 && (
            <div className={`flex flex-wrap items-center gap-4 text-xs sm:text-sm ${summaryTextColor}`}>
              {summaryStats.map(stat => {
                if (stat.value === null || stat.value === undefined || stat.value === '') {
                  return null;
                }
                const displayValue = stat.format ? stat.format(stat.value) : formatNumber(stat.value);
                const showTrendIcon = stat.key === 'spot' || stat.key === 'futuresVol';
                const trendDirection = stat.key === 'spot' ? spotTrend : stat.key === 'futuresVol' ? volumeTrend : null;
                return (
                  <div key={stat.key} className="flex items-center gap-2">
                    {showTrendIcon ? (
                      <TrendIcon direction={trendDirection || 'flat'} />
                    ) : (
                      <span className={`w-2 h-2 rounded-full ${stat.color || 'bg-gray-400'}`}></span>
                    )}
                    <span className="font-semibold">{stat.label}: {displayValue}</span>
                  </div>
                );
              })}
            </div>
          )}
            <button
              onClick={enterFullscreen}
              className={`${buttonClasses} rounded-lg transition-colors`}
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
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '7%' }} />
        </colgroup>
        <thead
          className={`text-xs font-semibold uppercase tracking-wide ${
            isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-gray-50 text-gray-600'
          }`}
        >
          <tr>
            <th className="text-left px-3 sm:px-4 py-3">Segment</th>
            <th className="px-3 sm:px-4 py-3 text-right">LTP</th>
            <th className="px-3 sm:px-4 py-3 text-right">OI</th>
            <th className="px-3 sm:px-4 py-3 text-right">Δ OI</th>
            <th className="px-3 sm:px-4 py-3 text-right">Vol</th>
            <th className="px-3 sm:px-4 py-3 text-right">Bid</th>
            <th className="px-3 sm:px-4 py-3 text-right">Ask</th>
            <th className="px-3 sm:px-4 py-3 text-right">Bid Qty</th>
            <th 
              className="px-3 sm:px-4 py-3 text-right" 
              title="Bid Qty - Ask Qty. Bubble shows Eaten Δ (Ask Eaten - Bid Eaten over rolling window)"
            >
              ΔB/A QTY
            </th>
            <th className="px-3 sm:px-4 py-3 text-right">Ask Qty</th>
            <th className="px-3 sm:px-4 py-3 text-right">Δ Price</th>
          </tr>
        </thead>
        <tbody>
          {organizedRows.map((row, i) => renderRow(row, `main-${i}`))}
          {fullscreenSections.map(
            (section, sectionIndex) =>
              isFullscreen && (
                <React.Fragment key={`section-${sectionIndex}`}>
                  <tr
                    className={`border-t ${
                      isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-100/70'
                    }`}
                  >
                    <td
                      colSpan={10}
                      className={`px-8 py-4 text-xs font-semibold uppercase tracking-wide flex flex-col gap-2 ${
                        isDarkMode ? 'text-slate-300' : 'text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {section.sectionType === 'calls' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
                            CALL
                          </span>
                        )}
                        {section.sectionType === 'puts' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            PUT
                          </span>
                        )}
                        <span>{section.title}</span>
                      </div>
                      {section.headerSlot && (
                        <div
                          className={`text-left text-[11px] sm:text-xs font-normal ${
                            isDarkMode ? 'text-slate-400' : 'text-gray-500'
                          }`}
                        >
                          {section.headerSlot}
                        </div>
                      )}
                    </td>
                  </tr>
                  {section.rows
                    .filter(row => !row.isHeader) // Remove "Strike: <value>" header rows from main page
                    .map((row, rowIndex) => renderRow(row, `section-${sectionIndex}-${rowIndex}`))}
                </React.Fragment>
              )
          )}
        </tbody>
      </table>
      </div>
      
      {/* Professional Edge-to-Edge Fullscreen Overlay */}
      {isFullscreen && (
        <div
          className={`fullscreen-container fixed inset-0 z-50 flex flex-col w-screen ${
            isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-gray-900'
          }`}
          style={{ height: 'var(--real-vh, 100vh)', width: '100vw', maxHeight: 'var(--real-vh, 100vh)', maxWidth: '100vw' }}
        >
          {/* Professional Header - Edge to Edge */}
          <div className={`flex-shrink-0 ${
            isDarkMode 
              ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white' 
              : 'bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 text-gray-900 border-b border-gray-200'
          } shadow-lg`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
              <div className="flex items-center gap-3">
                <h1 className={`font-bold ${
                  isDarkMode 
                    ? 'text-white' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'
                }`}>
                  NIFTY DERIVATIVES
                </h1>
                {selectedContract && (
                  <p className={`text-lg ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    {selectedContract.tradingsymbol || selectedContract.instrumentToken}
                  </p>
                )}
                {marketTrend && (
                  <span className={`text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-300 ${
                    marketTrend.classification === 'Bullish' 
                      ? isDarkMode
                        ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                        : 'bg-green-500/10 text-green-600 border border-green-500/30'
                      : marketTrend.classification === 'Bearish'
                      ? isDarkMode
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-red-500/10 text-red-600 border border-red-500/30'
                      : isDarkMode
                      ? 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
                      : 'bg-gray-500/10 text-gray-600 border border-gray-500/30'
                  }`}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${
                      marketTrend.classification === 'Bullish' 
                        ? 'bg-green-400' 
                        : marketTrend.classification === 'Bearish'
                        ? 'bg-red-400'
                        : 'bg-gray-400'
                    }`}></span>
                    {marketTrend.classification} {marketTrend.score != null ? `(${marketTrend.score > 0 ? '+' : ''}${marketTrend.score.toFixed(1)})` : ''}
                  </span>
                )}
                {/* Spot LTP Trend Pill - Fullscreen */}
                <span className={`text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-300 ${
                  spotLtpTrend.direction === 'UP'
                    ? isDarkMode
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                    : spotLtpTrend.direction === 'DOWN'
                    ? isDarkMode
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                    : isDarkMode
                    ? 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                    : 'bg-slate-500/10 text-slate-600 border border-slate-500/30'
                }`}>
                  <span className="mr-1.5">
                    {spotLtpTrend.direction === 'UP' ? '↑' : spotLtpTrend.direction === 'DOWN' ? '↓' : '→'}
                  </span>
                  LTP {spotLtpTrend.percent > 0 ? '+' : ''}{spotLtpTrend.percent.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                {spot && (
                  <>
                    <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                      isDarkMode ? 'text-green-300' : 'text-gray-700'
                    }`}>
                      <TrendIcon direction={spotTrend} />
                      Spot: ₹{spot ?? '—'}
                    </span>
                    {summaryStats?.length > 0 && (
                      <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                        isDarkMode ? 'text-indigo-200' : 'text-gray-700'
                      }`}>
                        <TrendIcon direction={volumeTrend} />
                        Vol: {formatNumber(summaryStats.find(stat => stat.key === 'futuresVol')?.value)}
                      </span>
                    )}
                  </>
                )}
                <button
                  onClick={exitFullscreen}
                  className={`p-4 rounded-lg transition-all duration-200 group ${
                    isDarkMode
                      ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                  title="Exit fullscreen (Press ESC)"
                >
                  <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
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
          <div className="table-wrapper">
            <table className="fullscreen-table w-full table-fixed">
              <colgroup>
                <col style={{ width: '12%' }} />
                <col style={{ width: '9.25%' }} />
                <col style={{ width: '9.25%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '9.25%' }} />
                <col style={{ width: '9.25%' }} />
                <col style={{ width: '9.25%' }} />
                <col style={{ width: '9.25%' }} />
                <col style={{ width: '9.25%' }} />
                <col style={{ width: '9.25%' }} />
                <col style={{ width: '9.25%' }} />
              </colgroup>
              <thead
                className={`font-semibold ${
                  isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <tr>
                  <th className={`text-left border-r ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>Segment</th>
                  <th className={`text-right border-r ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>LTP</th>
                  <th className={`text-right border-r ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>OI</th>
                  <th className={`text-right border-r ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>Δ OI</th>
                  <th className={`text-right border-r ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>Vol</th>
                  <th className={`text-right border-r ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>Bid</th>
                  <th className={`text-right border-r ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>Ask</th>
                  <th className={`text-right border-r ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>Bid Qty</th>
                  <th 
                    className={`text-right border-r ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}
                    title="Bid Qty - Ask Qty. Bubble shows Eaten Δ (Ask Eaten - Bid Eaten over rolling window)"
                  >
                    ΔB/A QTY
                  </th>
                  <th className={`text-right border-r ${isDarkMode ? 'border-slate-600' : 'border-slate-200'}`}>Ask Qty</th>
                  <th className="text-right">Δ Price</th>
                </tr>
              </thead>
              <tbody className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>
                {organizedRows.map((row, i) => renderRow(row, `fullscreen-main-${i}`))}
                {fullscreenSections.map((section, sectionIndex) => (
                  <React.Fragment key={`fullscreen-section-${sectionIndex}`}>
                    <tr
                      className={`border-t ${
                        isDarkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-100/80'
                      }`}
                    >
                      <td
                        colSpan={11}
                        className={`font-semibold uppercase tracking-wide ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-center gap-2">
                            <span>{section.title}</span>
                          </div>
                          {section.headerSlot && (
                            <div
                              className={`text-left text-[11px] sm:text-xs font-normal ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-500'
                              }`}
                            >
                              {section.headerSlot}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {section.rows
                      .filter(row => !row.isHeader) // Remove "Strike: <value>" header rows in fullscreen mode
                      .map((row, rowIndex) => renderRow(row, `fullscreen-section-${sectionIndex}-${rowIndex}`))}
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
