import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSpotLtpInterval } from '../contexts/SpotLtpIntervalContext';
import { formatPrice } from '../utils/formatters';
import { useDirectionFlow } from '../hooks/useDirectionFlow';
import { useContractColoring } from '../contexts/ContractColorContext';

/**
 * Component to display LTP cell for a contract (simplified version for panel)
 */
function PanelLTPCell({ contract, label, isDarkMode }) {
  const ltpValue = contract?.lastPrice;
  const numericValue = ltpValue != null ? Number(ltpValue) : null;
  const { direction, confidence, intensity } = useDirectionFlow(numericValue, 0.01);
  const confidenceInt = Math.round(confidence);
  const coloringMeta = contract?.instrumentToken ? {
    contractId: contract.instrumentToken,
    fieldKey: 'ltp',
    dayHigh: contract.high ?? null,
    dayLow: contract.low ?? null,
  } : null;
  const { backgroundClass } = useContractColoring(coloringMeta, numericValue);
  
  // Get eaten delta value - preserve for window duration (stable like column value)
  const eatenDeltaRef = useRef(null);
  const currentEatenDelta = contract?.eatenDelta;
  
  // Update ref only when we have a valid value (including 0, as 0 is a valid value)
  // This preserves the value for the window duration, matching column behavior
  if (currentEatenDelta != null) {
    eatenDeltaRef.current = currentEatenDelta;
  }
  
  const eatenDelta = eatenDeltaRef.current;
  const hasEatenDelta = eatenDelta != null && eatenDelta !== 0;
  
  let arrowSymbol = '→';
  if (direction === 'UP') {
    arrowSymbol = intensity === 'HIGH' ? '↑↑' : '↑';
  } else if (direction === 'DOWN') {
    arrowSymbol = intensity === 'HIGH' ? '↓↓' : '↓';
  }
  
  const bubbleBgColor = direction === 'NEUTRAL'
    ? isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'
    : direction === 'UP'
    ? isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
    : isDarkMode ? 'bg-red-500/20' : 'bg-red-100';
  
  const bubbleTextColor = direction === 'NEUTRAL'
    ? isDarkMode ? 'text-slate-400' : 'text-gray-600'
    : direction === 'UP'
    ? isDarkMode ? 'text-green-400' : 'text-green-700'
    : isDarkMode ? 'text-red-400' : 'text-red-700';
  
  // Eaten delta styling
  const eatenDeltaBgColor = hasEatenDelta
    ? eatenDelta > 0
      ? isDarkMode ? 'bg-emerald-500/15' : 'bg-emerald-50'
      : isDarkMode ? 'bg-rose-500/15' : 'bg-rose-50'
    : isDarkMode ? 'bg-slate-700/30' : 'bg-gray-100/50';
  
  const eatenDeltaTextColor = hasEatenDelta
    ? eatenDelta > 0
      ? isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
      : isDarkMode ? 'text-rose-400' : 'text-rose-700'
    : isDarkMode ? 'text-slate-500' : 'text-gray-500';
  
  if (!contract || ltpValue == null) {
    return null;
  }
  
  return (
    <div className={`flex items-center gap-2 p-2 rounded ${backgroundClass || ''}`}>
      {/* Label */}
      <span className="text-xs font-medium opacity-75 whitespace-nowrap flex-shrink-0">{label}:</span>
      
      {/* Eaten Delta Pill - Centered in row */}
      <div className={`flex items-center justify-center rounded-md px-2 py-1 ${eatenDeltaBgColor} ${eatenDeltaTextColor} transition-colors flex-shrink-0 mx-auto`}>
        <span className="text-[10px] font-semibold font-mono tracking-tight">
          {hasEatenDelta ? (
            <>
              <span className="opacity-70">Δ</span>
              <span className="ml-0.5">{eatenDelta > 0 ? '+' : ''}{eatenDelta.toLocaleString()}</span>
            </>
          ) : (
            <span className="opacity-50">—</span>
          )}
        </span>
      </div>
      
      {/* LTP Data with Direction Indicator */}
      <div className="flex items-center gap-1.5 flex-1 justify-end ml-auto">
        {/* Direction Bubble */}
        <div className={`flex items-center justify-center rounded-full px-2 py-0.5 ${bubbleBgColor} ${bubbleTextColor} flex-shrink-0`} style={{ minWidth: '2.5rem', height: '1.5rem', borderRadius: '9999px' }}>
          <span className="text-xs font-bold leading-none flex items-center gap-0.5">
            <span>{arrowSymbol}</span>
            {confidenceInt > 0 ? <span className="opacity-90">{confidenceInt}%</span> : direction === 'NEUTRAL' ? <span className="opacity-70">—</span> : null}
          </span>
        </div>
        {/* LTP Value */}
        <span className="text-sm font-semibold font-mono whitespace-nowrap">{formatPrice(ltpValue)}</span>
      </div>
    </div>
  );
}

export default function CollapsibleRightPanel({ derivativesData, isCollapsed, onToggleCollapse, isFullscreen = false }) {
  const { isDarkMode } = useTheme();
  const { intervalSeconds: spotLtpInterval } = useSpotLtpInterval();
  const previousTrendRef = React.useRef({ classification: 'Neutral', score: 0 });
  const [windowElapsed, setWindowElapsed] = useState(0);
  const timerIntervalRef = useRef(null);
  const windowStartRef = useRef(null);
  const windowSecondsRef = useRef(null);
  
  // Spot LTP Trend timer state
  const [spotLtpWindowElapsed, setSpotLtpWindowElapsed] = useState(0);
  const spotLtpTimerIntervalRef = useRef(null);
  const spotLtpWindowStartRef = useRef(null);
  const spotLtpWindowSecondsRef = useRef(null);
  
  // Eaten Delta timer state
  const [eatenDeltaWindowElapsed, setEatenDeltaWindowElapsed] = useState(0);
  const eatenDeltaTimerIntervalRef = useRef(null);
  const eatenDeltaWindowStartRef = useRef(null);
  const eatenDeltaWindowSecondsRef = useRef(null);
  
  // LTP Movement timer state
  const [ltpMovementWindowElapsed, setLtpMovementWindowElapsed] = useState(0);
  const ltpMovementTimerIntervalRef = useRef(null);
  const ltpMovementWindowStartRef = useRef(null);
  const ltpMovementWindowSecondsRef = useRef(null);
  
  // Read trend from backend (calculated from API polled values with discrete window intervals)
  // Trend is updated in UI at frontend refresh rate, but calculation happens at window boundaries
  // IMPORTANT: Preserve previous value if current is null/undefined to prevent reset to 0 during refresh
  const currentTrend = derivativesData?.trendClassification && derivativesData?.trendScore != null
    ? {
        classification: derivativesData.trendClassification,
        score: Number(derivativesData.trendScore)
      }
    : null;
  
  // Update ref when we have a valid value (including 0, as 0 is a valid score)
  if (currentTrend !== null) {
    previousTrendRef.current = currentTrend;
  }
  
  // Use current trend if available, otherwise preserve previous (prevents reset to 0 during refresh)
  const marketTrend = currentTrend || previousTrendRef.current;
  
  // Read spot LTP trend from backend (average movement over configured window)
  const spotLtpTrend = {
    direction: derivativesData?.spotLtpTrendDirection || 'FLAT',
    percent: derivativesData?.spotLtpTrendPercent ?? 0
  };

  // Read segment trend scores from backend (futures, calls, puts)
  const segmentScores = {
    futures: derivativesData?.futuresTrendScore != null ? Number(derivativesData.futuresTrendScore) : null,
    calls: derivativesData?.callsTrendScore != null ? Number(derivativesData.callsTrendScore) : null,
    puts: derivativesData?.putsTrendScore != null ? Number(derivativesData.putsTrendScore) : null
  };

  // Panel is expanded only when explicitly opened (no hover behavior)
  const isExpanded = !isCollapsed;

  // Apply floating panel look in both fullscreen and normal mode - all corners rounded
  const containerClasses = isFullscreen
    ? [
        'fullscreen-right-panel',
        isExpanded ? 'expanded' : 'collapsed',
        'overflow-y-auto',
        'rounded-2xl', // All corners rounded for complete floating look
        'table-halo-border-strong', // Colorful blue-purple border like main table
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-800/95 via-slate-800/90 to-indigo-900/20 text-slate-200 backdrop-blur-xl' 
          : 'bg-gradient-to-br from-blue-50/95 via-purple-50/90 to-white/95 text-gray-900 backdrop-blur-xl',
      ].join(' ')
    : [
        'fixed right-1.5 top-20 bottom-1.5 z-30 transition-all duration-300 ease-in-out overflow-hidden',
        'rounded-2xl table-halo-border-strong backdrop-blur-xl', // All corners rounded
        isExpanded ? 'w-72' : 'w-14',
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-800/95 via-slate-800/90 to-indigo-900/20 text-slate-200' 
          : 'bg-gradient-to-br from-blue-50/95 via-purple-50/90 to-white/95 text-gray-900',
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

  // Timer logic for trend window - countdown timer that starts from windowSeconds and counts down to 0
  // Timer is always active and updates in real-time, regardless of trend score changes
  useEffect(() => {
    // Always set up timer if we have window seconds, even if windowStart is not yet available
    const windowSeconds = derivativesData?.trendWindowSeconds || 10;
    
    // If windowStart is available, use it; otherwise calculate from current time aligned to window boundaries
    let windowStart;
    if (derivativesData?.trendWindowStart) {
      windowStart = new Date(derivativesData.trendWindowStart).getTime();
    } else {
      // Calculate window start aligned to discrete boundaries (e.g., if window is 10s, align to 0s, 10s, 20s, etc.)
      const now = Date.now();
      const nowSeconds = Math.floor(now / 1000);
      const windowStartSeconds = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
      windowStart = windowStartSeconds * 1000;
    }
    
    // Check if window start has changed (new window started)
    if (windowStartRef.current !== windowStart) {
      windowStartRef.current = windowStart;
      windowSecondsRef.current = windowSeconds;
      // Reset timer to full window size when new window starts
      setWindowElapsed(windowSeconds);
    }

    // Update timer every 100ms - countdown from windowSeconds to 0
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - windowStart) / 1000);
      const remaining = Math.max(0, windowSeconds - elapsed); // Countdown: remaining time
      
      if (remaining > 0) {
        setWindowElapsed(remaining);
      } else {
        // Window expired, but keep timer running - it will reset when new window starts
        setWindowElapsed(0);
      }
    };

    // Initial update
    updateTimer();

    // Set up interval - always active
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(updateTimer, 100);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [derivativesData?.trendWindowStart, derivativesData?.trendWindowSeconds]);

  // Timer logic for spot LTP trend window - countdown timer that starts from windowSeconds and counts down to 0
  // Timer is always active and updates in real-time, regardless of spot LTP trend changes
  useEffect(() => {
    // Always set up timer if we have window seconds, even if windowStart is not yet available
    const windowSeconds = derivativesData?.spotLtpWindowSeconds || spotLtpInterval;
    
    // If windowStart is available, use it; otherwise calculate from current time aligned to window boundaries
    let windowStart;
    if (derivativesData?.spotLtpWindowStart) {
      windowStart = new Date(derivativesData.spotLtpWindowStart).getTime();
    } else {
      // Calculate window start aligned to discrete boundaries (e.g., if window is 10s, align to 0s, 10s, 20s, etc.)
      const now = Date.now();
      const nowSeconds = Math.floor(now / 1000);
      const windowStartSeconds = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
      windowStart = windowStartSeconds * 1000;
    }
    
    // Check if window start has changed (new window started)
    if (spotLtpWindowStartRef.current !== windowStart) {
      spotLtpWindowStartRef.current = windowStart;
      spotLtpWindowSecondsRef.current = windowSeconds;
      // Reset timer to full window size when new window starts
      setSpotLtpWindowElapsed(windowSeconds);
    }

    // Update timer every 100ms - countdown from windowSeconds to 0
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - windowStart) / 1000);
      const remaining = Math.max(0, windowSeconds - elapsed); // Countdown: remaining time
      
      if (remaining > 0) {
        setSpotLtpWindowElapsed(remaining);
      } else {
        // Window expired, but keep timer running - it will reset when new window starts
        setSpotLtpWindowElapsed(0);
      }
    };

    // Initial update
    updateTimer();

    // Set up interval - always active
    if (spotLtpTimerIntervalRef.current) {
      clearInterval(spotLtpTimerIntervalRef.current);
    }
    spotLtpTimerIntervalRef.current = setInterval(updateTimer, 100);

    return () => {
      if (spotLtpTimerIntervalRef.current) {
        clearInterval(spotLtpTimerIntervalRef.current);
        spotLtpTimerIntervalRef.current = null;
      }
    };
  }, [derivativesData?.spotLtpWindowStart, derivativesData?.spotLtpWindowSeconds, spotLtpInterval]);

  // Timer logic for Eaten Delta window - countdown timer synchronized with backend window boundaries
  useEffect(() => {
    const windowSeconds = derivativesData?.eatenDeltaWindowSeconds || 5;
    
    // Calculate current window start aligned to discrete boundaries (same as backend)
    // This matches EatenDeltaService's window calculation: floor(epochMillis / windowSizeMillis) * windowSizeMillis
    const now = Date.now();
    const windowSizeMillis = windowSeconds * 1000;
    const currentWindowId = Math.floor(now / windowSizeMillis);
    const calculatedWindowStart = currentWindowId * windowSizeMillis;
    
    // Use backend windowStart if available, otherwise use calculated
    // CRITICAL: Prefer backend value but recalculate if it's stale (more than 1 window old)
    let windowStart;
    if (derivativesData?.eatenDeltaWindowStart) {
      const backendWindowStart = new Date(derivativesData.eatenDeltaWindowStart).getTime();
      const backendWindowId = Math.floor(backendWindowStart / windowSizeMillis);
      
      // If backend window is more than 1 window behind, use calculated (backend might be stale)
      if (currentWindowId - backendWindowId <= 1) {
        windowStart = backendWindowStart;
      } else {
        windowStart = calculatedWindowStart;
      }
    } else {
      windowStart = calculatedWindowStart;
    }
    
    // CRITICAL: Reset timer when window changes (new window started)
    // This ensures timer is always synchronized with backend window boundaries
    const windowChanged = eatenDeltaWindowStartRef.current !== windowStart || 
                         eatenDeltaWindowSecondsRef.current !== windowSeconds;
    
    if (windowChanged) {
      eatenDeltaWindowStartRef.current = windowStart;
      eatenDeltaWindowSecondsRef.current = windowSeconds;
      // Calculate remaining time based on actual window start
      const currentTime = Date.now();
      const elapsed = Math.floor((currentTime - windowStart) / 1000);
      const remaining = Math.max(0, windowSeconds - elapsed);
      setEatenDeltaWindowElapsed(remaining);
    }

    const updateTimer = () => {
      // Always use current windowStart from ref (may have been updated by backend)
      const currentWindowStart = eatenDeltaWindowStartRef.current;
      const currentWindowSeconds = eatenDeltaWindowSecondsRef.current;
      
      if (!currentWindowStart || !currentWindowSeconds) {
        return;
      }
      
      const currentTime = Date.now();
      const windowSizeMs = currentWindowSeconds * 1000;
      
      // Recalculate current window to detect window changes
      const currentWindowId = Math.floor(currentTime / windowSizeMs);
      const expectedWindowStart = currentWindowId * windowSizeMs;
      
      // If we've moved to a new window, reset immediately
      if (expectedWindowStart !== currentWindowStart) {
        eatenDeltaWindowStartRef.current = expectedWindowStart;
        setEatenDeltaWindowElapsed(currentWindowSeconds);
        return;
      }
      
      // Calculate remaining time
      const elapsed = Math.floor((currentTime - currentWindowStart) / 1000);
      const remaining = Math.max(0, currentWindowSeconds - elapsed);
      setEatenDeltaWindowElapsed(remaining);
    };

    // Update immediately
    updateTimer();

    // Update every 100ms for smooth countdown
    if (eatenDeltaTimerIntervalRef.current) {
      clearInterval(eatenDeltaTimerIntervalRef.current);
    }
    eatenDeltaTimerIntervalRef.current = setInterval(updateTimer, 100);

    return () => {
      if (eatenDeltaTimerIntervalRef.current) {
        clearInterval(eatenDeltaTimerIntervalRef.current);
        eatenDeltaTimerIntervalRef.current = null;
      }
    };
  }, [derivativesData?.eatenDeltaWindowStart, derivativesData?.eatenDeltaWindowSeconds]);

  // Timer logic for LTP Movement window - countdown timer synchronized with backend window boundaries
  useEffect(() => {
    const windowSeconds = derivativesData?.ltpMovementWindowSeconds || 5;
    
    // Get window start time from backend (synchronized with WindowManager)
    // CRITICAL: Always use backend windowStart if available to ensure perfect synchronization
    let windowStart;
    if (derivativesData?.ltpMovementWindowStart) {
      // Use backend window start time (synchronized with actual window boundaries)
      // Convert ISO string to timestamp
      const backendWindowStart = new Date(derivativesData.ltpMovementWindowStart).getTime();
      windowStart = backendWindowStart;
    } else {
      // Fallback: Calculate window start aligned to discrete boundaries (same as backend)
      // This matches WindowManager's window calculation: floor(epochSecond / windowSeconds) * windowSeconds
      const now = Date.now();
      const nowSeconds = Math.floor(now / 1000);
      const windowStartSeconds = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
      windowStart = windowStartSeconds * 1000;
    }
    
    // CRITICAL: Reset timer when window changes (new window started)
    // This ensures timer is always synchronized with backend window boundaries
    const windowChanged = ltpMovementWindowStartRef.current !== windowStart || 
                         ltpMovementWindowSecondsRef.current !== windowSeconds;
    
    if (windowChanged) {
      ltpMovementWindowStartRef.current = windowStart;
      ltpMovementWindowSecondsRef.current = windowSeconds;
      // Calculate remaining time based on actual window start
      const now = Date.now();
      const elapsed = Math.floor((now - windowStart) / 1000);
      const remaining = Math.max(0, windowSeconds - elapsed);
      setLtpMovementWindowElapsed(remaining);
    }

    const updateTimer = () => {
      // Always use current windowStart from ref (may have been updated by backend)
      const currentWindowStart = ltpMovementWindowStartRef.current;
      const currentWindowSeconds = ltpMovementWindowSecondsRef.current;
      
      if (!currentWindowStart || !currentWindowSeconds) {
        return;
      }
      
      const now = Date.now();
      const elapsed = Math.floor((now - currentWindowStart) / 1000);
      const remaining = Math.max(0, currentWindowSeconds - elapsed);
      
      setLtpMovementWindowElapsed(remaining);
      
      // If window completed, timer will reset when backend sends new windowStart
      // The dependency array will trigger a re-run when windowStart changes
    };

    // Update immediately
    updateTimer();

    // Update every 100ms for smooth countdown
    if (ltpMovementTimerIntervalRef.current) {
      clearInterval(ltpMovementTimerIntervalRef.current);
    }
    ltpMovementTimerIntervalRef.current = setInterval(updateTimer, 100);

    return () => {
      if (ltpMovementTimerIntervalRef.current) {
        clearInterval(ltpMovementTimerIntervalRef.current);
        ltpMovementTimerIntervalRef.current = null;
      }
    };
  }, [derivativesData?.ltpMovementWindowStart, derivativesData?.ltpMovementWindowSeconds]);

  const renderCollapsedIcons = () => (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Market Trend Icon */}
      <div className={`p-2 rounded-lg ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} title="Market Trend">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      {/* Spot LTP Icon */}
      <div className={`p-2 rounded-lg ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} title="Spot LTP">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      {/* Info Icon */}
      <div className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`} title="Information">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  );

  // In fullscreen mode, don't render the panel if collapsed (button handles visibility)
  if (isFullscreen && isCollapsed) {
    return null;
  }

  return (
    <div 
      className={containerClasses}
      style={{
        borderRadius: '1rem', // All corners rounded
        boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.35), 0 0 0 1px rgba(168, 85, 247, 0.35), 0 0 8px rgba(59, 130, 246, 0.28), 0 0 12px rgba(168, 85, 247, 0.28)',
      }}
      onClick={!isFullscreen && isCollapsed ? onToggleCollapse : undefined}
    >
      <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} p-3 ${isFullscreen ? '' : `border-b ${sectionDivider}`}`}>
        {isExpanded && <h3 className={`text-sm font-semibold ${isFullscreen ? 'text-base' : ''}`}>Market Trend</h3>}
        {isExpanded && (
          <button
            onClick={(e) => {
              if (!isFullscreen) e.stopPropagation();
              onToggleCollapse();
            }}
            className={`${headerButtonClasses} ${isFullscreen ? 'hover:bg-red-500/20 hover:text-red-400' : ''}`}
            title="Close panel"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${isFullscreen ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={isFullscreen ? 2.5 : 2}
            >
              {isFullscreen ? (
                // Right-pointing arrow for fullscreen close
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              ) : (
                // Left-pointing arrow for normal mode
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              )}
            </svg>
          </button>
        )}
      </div>

      {isExpanded ? (
        <div className="p-4 space-y-4">
          {/* Market Trend Indicator */}
          <div className={`rounded-lg border p-4 ${trendColor}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className={`inline-block w-3 h-3 rounded-full ${trendDot}`}></span>
                <span className="text-lg font-semibold">{marketTrend.classification}</span>
              </div>
              {/* Timer display - countdown from windowSeconds to 0 */}
              {derivativesData?.trendWindowSeconds && (
                <div className={`text-xs font-mono px-2 py-1 rounded ${
                  windowElapsed > 0 
                    ? isDarkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-100 text-gray-700'
                    : isDarkMode ? 'bg-red-700/50 text-red-300' : 'bg-red-100 text-red-700'
                }`}>
                  {windowElapsed}s
                </div>
              )}
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
              {/* Timer display - countdown from windowSeconds to 0 */}
              {derivativesData?.spotLtpWindowSeconds && (
                <div className={`text-xs font-mono px-2 py-1 rounded ${
                  spotLtpWindowElapsed > 0 
                    ? isDarkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-100 text-gray-700'
                    : isDarkMode ? 'bg-red-700/50 text-red-300' : 'bg-red-100 text-red-700'
                }`}>
                  {spotLtpWindowElapsed}s
                </div>
              )}
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
            {derivativesData?.spotLtpWindowSeconds && (
              <div className="text-xs opacity-50 mt-2">
                Window: {derivativesData.spotLtpWindowSeconds}s
              </div>
            )}
          </div>

          {/* Main Table LTP Cells - Futures, Call, Put */}
          {derivativesData && (
            <div className={`rounded-lg p-0 overflow-hidden ${isDarkMode ? 'bg-slate-700/30' : 'bg-gray-50'}`} style={{
              boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.35), 0 0 0 1px rgba(168, 85, 247, 0.35), 0 0 8px rgba(59, 130, 246, 0.28), 0 0 12px rgba(168, 85, 247, 0.28)',
            }}>
              <div className={`flex items-center justify-between p-3 mb-0 ${isDarkMode ? 'bg-slate-800/50' : 'bg-blue-50/50'}`}>
                <span className="text-sm font-medium">ΔEaten | LTP</span>
                <div className="flex items-center gap-1.5">
                  {derivativesData?.eatenDeltaWindowSeconds && (
                    <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      eatenDeltaWindowElapsed > 0 
                        ? isDarkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-100 text-gray-700'
                        : isDarkMode ? 'bg-red-700/50 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      Δ{eatenDeltaWindowElapsed}s
                    </div>
                  )}
                  {derivativesData?.ltpMovementWindowSeconds && (
                    <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      ltpMovementWindowElapsed > 0 
                        ? isDarkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-100 text-gray-700'
                        : isDarkMode ? 'bg-red-700/50 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      LTP{ltpMovementWindowElapsed}s
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 pt-3 space-y-0">
                {/* Futures LTP */}
                {derivativesData?.futures && derivativesData.futures.length > 0 && (
                  <>
                    <PanelLTPCell 
                      contract={derivativesData.futures[0]} 
                      label="Fut" 
                      isDarkMode={isDarkMode}
                    />
                    <div className={`h-px my-2 ${isDarkMode ? 'bg-slate-600/50' : 'bg-gray-300/50'}`} />
                  </>
                )}
                
                {/* Call Option LTP (ATM) */}
                {derivativesData?.callOptions && derivativesData.callOptions.length > 0 && (() => {
                  const spotPrice = derivativesData.spotPrice || derivativesData.dailyStrikePrice;
                  if (!spotPrice) return null;
                  
                  const atmCall = derivativesData.callOptions
                    .filter(call => call.lastPrice != null)
                    .reduce((closest, call) => {
                      if (!closest) return call;
                      const closestDiff = Math.abs((closest.strikePrice || 0) - Number(spotPrice));
                      const currentDiff = Math.abs((call.strikePrice || 0) - Number(spotPrice));
                      return currentDiff < closestDiff ? call : closest;
                    }, null);
                  
                  if (!atmCall) return null;
                  
                  return (
                    <>
                      <PanelLTPCell key="call" contract={atmCall} label="Call" isDarkMode={isDarkMode} />
                      <div className={`h-px my-2 ${isDarkMode ? 'bg-slate-600/50' : 'bg-gray-300/50'}`} />
                    </>
                  );
                })()}
                
                {/* Put Option LTP (ATM) */}
                {derivativesData?.putOptions && derivativesData.putOptions.length > 0 && (() => {
                  const spotPrice = derivativesData.spotPrice || derivativesData.dailyStrikePrice;
                  if (!spotPrice) return null;
                  
                  const atmPut = derivativesData.putOptions
                    .filter(put => put.lastPrice != null)
                    .reduce((closest, put) => {
                      if (!closest) return put;
                      const closestDiff = Math.abs((closest.strikePrice || 0) - Number(spotPrice));
                      const currentDiff = Math.abs((put.strikePrice || 0) - Number(spotPrice));
                      return currentDiff < closestDiff ? put : closest;
                    }, null);
                  
                  if (!atmPut) return null;
                  
                  return <PanelLTPCell key="put" contract={atmPut} label="Put" isDarkMode={isDarkMode} />;
                })()}
              </div>
            </div>
          )}

          {/* Segment Trend Scores */}
          <div className={`rounded-lg border p-4 ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Segment Scores</span>
              <span className="text-xs opacity-75">Raw scores</span>
            </div>
            <div className="space-y-2">
              {/* Futures Score */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium opacity-75">Futures:</span>
                <span className={`text-sm font-semibold ${
                  segmentScores.futures != null
                    ? segmentScores.futures > 0
                      ? isDarkMode ? 'text-green-400' : 'text-green-600'
                      : segmentScores.futures < 0
                      ? isDarkMode ? 'text-red-400' : 'text-red-600'
                      : isDarkMode ? 'text-slate-400' : 'text-gray-600'
                    : isDarkMode ? 'text-slate-500' : 'text-gray-400'
                }`}>
                  {segmentScores.futures != null
                    ? (segmentScores.futures > 0 ? '+' : '') + segmentScores.futures.toFixed(2)
                    : '—'}
                </span>
              </div>
              {/* Calls Score */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium opacity-75">Calls:</span>
                <span className={`text-sm font-semibold ${
                  segmentScores.calls != null
                    ? segmentScores.calls > 0
                      ? isDarkMode ? 'text-green-400' : 'text-green-600'
                      : segmentScores.calls < 0
                      ? isDarkMode ? 'text-red-400' : 'text-red-600'
                      : isDarkMode ? 'text-slate-400' : 'text-gray-600'
                    : isDarkMode ? 'text-slate-500' : 'text-gray-400'
                }`}>
                  {segmentScores.calls != null
                    ? (segmentScores.calls > 0 ? '+' : '') + segmentScores.calls.toFixed(2)
                    : '—'}
                </span>
              </div>
              {/* Puts Score */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium opacity-75">Puts:</span>
                <span className={`text-sm font-semibold ${
                  segmentScores.puts != null
                    ? segmentScores.puts > 0
                      ? isDarkMode ? 'text-green-400' : 'text-green-600'
                      : segmentScores.puts < 0
                      ? isDarkMode ? 'text-red-400' : 'text-red-600'
                      : isDarkMode ? 'text-slate-400' : 'text-gray-600'
                    : isDarkMode ? 'text-slate-500' : 'text-gray-400'
                }`}>
                  {segmentScores.puts != null
                    ? (segmentScores.puts > 0 ? '+' : '') + segmentScores.puts.toFixed(2)
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          {renderCollapsedIcons()}
        </div>
      )}
    </div>
  );
}
