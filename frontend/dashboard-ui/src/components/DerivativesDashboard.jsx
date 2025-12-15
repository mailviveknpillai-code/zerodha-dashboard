import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FuturesTable from './FuturesTable';
import OptionsTable from './OptionsTable';
import { ContractColorProvider, useContractColoringContext } from '../contexts/ContractColorContext';
import { useRefreshInterval } from '../contexts/RefreshIntervalContext';
import { useVolumeWindow } from '../contexts/VolumeWindowContext';
import useLatestDerivativesFeed from '../hooks/useLatestDerivativesFeed';
import useMetricsFeed from '../hooks/useMetricsFeed';
import { fetchDerivatives, getApiPollingStatus } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { useTrendAveraging } from '../contexts/TrendAveragingContext';
import { useEatenDeltaWindow } from '../contexts/EatenDeltaWindowContext';
import { useLtpMovementCacheSize } from '../contexts/LtpMovementCacheSizeContext';
import { useLtpMovementWindow } from '../contexts/LtpMovementWindowContext';
import { useSpotLtpInterval } from '../contexts/SpotLtpIntervalContext';
import logger from '../utils/logger';
import { useIncrementalVolumeMap } from '../hooks/useIncrementalVolume';
import useEatenValuesCache from '../hooks/useEatenValuesCache';
import { useOrganizedData } from '../hooks/useOrganizedData';
import { formatPrice, formatInteger, formatStrikeValue, formatChange, formatChangePercent } from '../utils/formatters';

function DerivativesDashboard({ 
  selectedContract,
  onConnectionStatusChange = () => {},
  connectionWarning = null,
  onDataUpdate = () => {},
}) {
  const { isDarkMode } = useTheme();
  const { intervalMs } = useRefreshInterval();
  const { volumeWindowMs } = useVolumeWindow();
  const [minusStrikeCollapsed, setMinusStrikeCollapsed] = useState(false);
  const [plusStrikeCollapsed, setPlusStrikeCollapsed] = useState(false);
  const [dynamicStrikeIndex, setDynamicStrikeIndex] = useState(null);
  const [isStrikeLocked, setIsStrikeLocked] = useState(false); // Track if strike is manually locked
  const [lockedStrikeValue, setLockedStrikeValue] = useState(null); // Store the actual strike value when locked
  const [dynamicTableCollapsed, setDynamicTableCollapsed] = useState(false);
  const [pollingWarning, setPollingWarning] = useState(null);
  const navigate = useNavigate();
  const initialFetchDoneRef = useRef(false);
  
  // Track incremental volume changes over configurable rolling windows
  const { updateVolume: updateIncrementalVolume } = useIncrementalVolumeMap(volumeWindowMs);
  
  // Cache eaten values independently of UI refresh rate
  // This ensures bubbles don't reset to 0 on every refresh
  const { updateEatenValues, getEatenValues } = useEatenValuesCache();
  
  // Do one initial full fetch to populate cache (runs in background)
  useEffect(() => {
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      // Trigger initial full fetch to populate cache
      // This runs in parallel with /latest polling
      fetchDerivatives('NIFTY')
        .then(data => {
          logger.debug('Initial cache population completed:', data?.totalContracts || 0, 'contracts');
        })
        .catch(err => {
          logger.error('Initial fetch failed (will retry via polling):', err);
        });
    }
  }, []);

  // Lightweight polling of backend API polling status for a subtle warning banner
  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const status = await getApiPollingStatus();
        if (cancelled || !status) return;

        const failures = typeof status.consecutiveFailures === 'number'
          ? status.consecutiveFailures
          : 0;

        let message = null;
        if (failures >= 3 || status.hasWarning) {
          const rawError = (status.lastError || '').toString();
          const errLower = rawError.toLowerCase();
          const isRateLimit =
            errLower.includes('rate limit') ||
            errLower.includes('429') ||
            errLower.includes('too many requests');

          if (isRateLimit) {
            message = 'Backend API polling is unstable (likely rate limited). Please increase the API polling interval in Settings to reduce load.';
          } else {
            message = `Backend API polling is unstable (${failures} recent failures). Data may update less frequently until the connection recovers.`;
          }
        }

        setPollingWarning(message);
      } catch (e) {
        // Do not spam logs or override UI if status endpoint fails occasionally
      }
    };

    // Initial check and interval
    // Status check uses 500ms interval - this is intentional to ensure backend timer-based
    // features update values immediately in the UI
    checkStatus();
    const id = setInterval(checkStatus, 500);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  
  // Get metric interval settings from contexts
  const { averagingWindowSeconds: trendWindowSeconds } = useTrendAveraging();
  const { windowSeconds: eatenDeltaWindowSeconds } = useEatenDeltaWindow();
  const { windowSeconds: ltpMovementWindowSeconds } = useLtpMovementWindow();
  const { intervalSeconds: spotLtpWindowSeconds } = useSpotLtpInterval();
  
  // Fetch basic values at UI refresh rate (8 columns: LTP, Bid Qty, Ask Qty, Delta, Bid Price, Ask Price, Volume, OI)
  const { data: basicData, loading: basicLoading } = useLatestDerivativesFeed({
    symbol: 'NIFTY',
    intervalMs, // UI refresh rate
    onConnectionStatusChange,
    onAuthFailure: () => navigate('/', { replace: true }),
    fallbackToFullFetch: false,
  });
  
  // Fetch chain-level metrics at UI refresh rate
  // CRITICAL: Feature calculations are INDEPENDENT of API polling rate
  // - API polling rate only controls how often raw data is collected from Zerodha
  // - Feature calculations happen based on their CONFIGURED WINDOW INTERVALS (trendWindowSeconds)
  // - Windows are epoch-aligned (e.g., 0-3s, 3-6s, 6-9s for 3s window)
  // - Final values are calculated and stored when windows complete (at epoch boundaries)
  // - UI refresh rate controls how often we poll backend to fetch these calculated values
  // - Polling at UI refresh rate ensures we catch window completions promptly
  const trendIntervalMs = intervalMs; // Use UI refresh interval from settings
  const { metrics: trendMetrics } = useMetricsFeed({
    symbol: 'NIFTY',
    intervalMs: trendIntervalMs,
    features: ['trendScore'], // Only trend score
    onConnectionStatusChange: () => {}, // Metrics errors don't affect connection status
  });
  
  // Spot LTP Trend: Use UI refresh interval
  // CRITICAL: Feature calculations are INDEPENDENT of API polling rate
  // - API polling rate only controls how often raw data is collected from Zerodha
  // - Feature calculations happen based on their CONFIGURED WINDOW INTERVALS (spotLtpWindowSeconds)
  // - Windows are epoch-aligned (e.g., 0-10s, 10-20s, 20-30s for 10s window)
  // - Final values are calculated and stored when windows complete (at epoch boundaries)
  // - UI refresh rate controls how often we poll backend to fetch these calculated values
  // - Polling at UI refresh rate ensures we catch window completions promptly
  const spotLtpIntervalMs = intervalMs; // Use UI refresh interval from settings
  const { metrics: spotLtpMetrics } = useMetricsFeed({
    symbol: 'NIFTY',
    intervalMs: spotLtpIntervalMs,
    features: ['spotLtpMovement'], // Only spot LTP movement
    onConnectionStatusChange: () => {}, // Metrics errors don't affect connection status
  });
  
  // Contract-level metrics (eatenDelta, ltpMovementDirection) are in basicData
  // BasicValuesCacheService copies all necessary values, so no enrichedData fetch needed
  
  // Merge basic values with chain-level metrics
  const derivativesData = useMemo(() => {
    if (!basicData) return null;
    
    // Start with basic values (8 columns)
    const merged = { ...basicData };
    
    // Add chain-level metrics from MetricsCacheService (each fetched independently)
    
    // Trend Score (fetched at trend window interval)
    if (trendMetrics?.trendScore) {
      const trend = trendMetrics.trendScore;
      merged.trendScore = trend.value;
      merged.trendClassification = trend.classification;
      merged.futuresTrendScore = trend.futuresScore;
      merged.callsTrendScore = trend.callsScore;
      merged.putsTrendScore = trend.putsScore;
      merged.trendWindowStart = trend.windowStart;
      merged.trendWindowEnd = trend.windowEnd;
      merged.trendWindowSeconds = trendWindowSeconds;
    }
    
    // Spot LTP Trend (fetched at spot LTP window interval - INDEPENDENT)
    if (spotLtpMetrics?.spotLtpMovement) {
      const spot = spotLtpMetrics.spotLtpMovement;
      merged.spotLtpTrendPercent = spot.value;
      merged.spotLtpTrendDirection = spot.direction;
      // Include window metadata for timer display
      if (spot.windowStart) {
        merged.spotLtpWindowStart = spot.windowStart;
      }
      if (spot.windowEnd) {
        merged.spotLtpWindowEnd = spot.windowEnd;
      }
      merged.spotLtpWindowSeconds = spotLtpWindowSeconds; // Use from context
    }
    
    // Eaten Delta window metadata (from basicData)
    if (basicData?.eatenDeltaWindowStart) {
      merged.eatenDeltaWindowStart = basicData.eatenDeltaWindowStart;
    }
    if (basicData?.eatenDeltaWindowEnd) {
      merged.eatenDeltaWindowEnd = basicData.eatenDeltaWindowEnd;
    }
    if (basicData?.eatenDeltaWindowSeconds) {
      merged.eatenDeltaWindowSeconds = basicData.eatenDeltaWindowSeconds;
    } else {
      merged.eatenDeltaWindowSeconds = eatenDeltaWindowSeconds; // Fallback to context
    }
    
    // LTP Movement window metadata (from basicData)
    if (basicData?.ltpMovementWindowStart) {
      merged.ltpMovementWindowStart = basicData.ltpMovementWindowStart;
    }
    if (basicData?.ltpMovementWindowEnd) {
      merged.ltpMovementWindowEnd = basicData.ltpMovementWindowEnd;
    }
    if (basicData?.ltpMovementWindowSeconds) {
      merged.ltpMovementWindowSeconds = basicData.ltpMovementWindowSeconds;
    } else {
      merged.ltpMovementWindowSeconds = ltpMovementWindowSeconds; // Fallback to context
    }
    
    // Contract-level metrics (eatenDelta, ltpMovementDirection) are already in basicData
    // No need to merge with enrichedData - BasicValuesCacheService copies all necessary values
    
    return merged;
  }, [basicData, trendMetrics, spotLtpMetrics, trendWindowSeconds, eatenDeltaWindowSeconds, ltpMovementWindowSeconds]);
  
  const loading = basicLoading;

  // Organize derivatives data into structured tables using custom hooks
  // NOTE: This must be called AFTER derivativesData is defined
  const organizedData = useOrganizedData(
    derivativesData,
    selectedContract,
    updateIncrementalVolume,
    updateEatenValues
  );

  // Notify parent component when data updates (single source of truth)
  useEffect(() => {
    if (derivativesData) {
      onDataUpdate(derivativesData);
    }
  }, [derivativesData, onDataUpdate]);

  const {
    mainTable,
    minusOneTable,
    plusOneTable,
    currentStrike,
    futuresPrice: primaryFuturesPrice,
    currentFuturesContract,
    activeFuturesContract,
    targetExpiry,
    strikeList,
    atmIndex,
    strikeStep,
    callsForExpiry,
    putsForExpiry
  } = organizedData;
 
  const headerStats = useMemo(() => {
    const stats = [];
    if (derivativesData?.spotPrice != null) {
      stats.push({
      key: 'spot',
      label: 'Spot LTP',
      value: Number(derivativesData.spotPrice),
      format: (v) => `₹${Number(v).toLocaleString()}`,
      color: 'bg-green-500'
      });
    }
    if (activeFuturesContract?.volume != null) {
      stats.push({
        key: 'futuresVol',
        label: 'Vol',
        value: Number(activeFuturesContract.volume),
        format: (v) => Number(v).toLocaleString(),
        color: 'bg-blue-500'
      });
    }
    return stats;
  }, [derivativesData?.spotPrice, activeFuturesContract?.volume]);

  useEffect(() => {
    if (!strikeList || strikeList.length === 0) {
      if (dynamicStrikeIndex !== null) {
        setDynamicStrikeIndex(null);
        setIsStrikeLocked(false);
        setLockedStrikeValue(null);
      }
      return;
    }
 
    const maxIndex = strikeList.length - 1;
    
    // If strike is locked, try to find the locked strike value in the new strikeList
    if (isStrikeLocked && lockedStrikeValue !== null) {
      const foundIndex = strikeList.findIndex(strike => Number(strike) === Number(lockedStrikeValue));
      if (foundIndex >= 0 && foundIndex <= maxIndex) {
        // Strike value found in new list - update index to match
        if (dynamicStrikeIndex !== foundIndex) {
          setDynamicStrikeIndex(foundIndex);
        }
      } else {
        // Locked strike value not found in new list - unlock and fall back to ATM
        setIsStrikeLocked(false);
        setLockedStrikeValue(null);
        const fallbackIndex = (typeof atmIndex === 'number' && atmIndex >= 0 && atmIndex <= maxIndex)
          ? atmIndex
          : Math.max(0, Math.floor(strikeList.length / 2));
        setDynamicStrikeIndex(fallbackIndex);
      }
      return; // Don't auto-update when locked
    }
 
    // Only auto-update if strike is not manually locked
    // Use atmIndex to determine the limit/range, but only update if not locked
    const desiredIndex = dynamicStrikeIndex;
    if (desiredIndex === null || desiredIndex < 0 || desiredIndex > maxIndex) {
      const fallbackIndex = (typeof atmIndex === 'number' && atmIndex >= 0 && atmIndex <= maxIndex)
        ? atmIndex
        : Math.max(0, Math.floor(strikeList.length / 2));
      setDynamicStrikeIndex(fallbackIndex);
    }
    // Note: atmIndex changes with spot LTP, but we don't auto-update the selected strike
    // when locked. The limit (strikeList) still depends on spot LTP via organizedData.
  }, [strikeList, atmIndex, dynamicStrikeIndex, isStrikeLocked, lockedStrikeValue]);
 
  const dynamicStrikeTable = useMemo(() => {
    const strikes = strikeList || [];
    if (!strikes.length) {
      return {
        rows: [],
        sliderMin: 0,
        sliderMax: 0,
        sliderIndex: 0,
        selectedStrike: null,
        strikeStep,
        firstStrike: null,
        lastStrike: null,
        strikes: []
      };
    }

    const maxIndex = strikes.length - 1;
    let sliderIndex = dynamicStrikeIndex;
    if (sliderIndex === null || sliderIndex < 0 || sliderIndex > maxIndex) {
      sliderIndex = (typeof atmIndex === 'number' && atmIndex >= 0 && atmIndex <= maxIndex)
        ? atmIndex
        : Math.max(0, Math.floor(strikes.length / 2));
    }

    const selectedStrike = strikes[sliderIndex];
    const callsList = callsForExpiry || [];
    const putsList = putsForExpiry || [];
    const rows = [];

    const dynamicOptionRow = (option, sectionType) => {
      if (!option) return null;

      const rawLastPrice = option?.lastPrice != null ? Number(option.lastPrice) : null;
      const rawChange = option?.change != null ? Number(option.change) : null;
      const rawChangePercent = option?.changePercent != null ? Number(option.changePercent) : null;
      const rawOi = option?.openInterest != null ? Number(option.openInterest) : null;
      const rawVol = option?.volume != null ? Number(option.volume) : null;
      const rawBid = option?.bid != null ? Number(option.bid) : null;
      const rawAsk = option?.ask != null ? Number(option.ask) : null;
      const rawBidQty = option?.bidQuantity != null ? Number(option.bidQuantity) : null;
      const rawAskQty = option?.askQuantity != null ? Number(option.askQuantity) : null;
      // Handle eatenDelta: Get from backend, but preserve via cache
      // The cache ensures values don't reset to 0 on every UI refresh
      const instrumentToken = option?.instrumentToken ? String(option.instrumentToken) : null;
      const backendEatenDelta = option?.eatenDelta != null && option?.eatenDelta !== undefined 
        ? Number(option.eatenDelta) 
        : null;
      const backendBidEaten = option?.bidEaten != null && option?.bidEaten !== undefined 
        ? Number(option.bidEaten) 
        : null;
      const backendAskEaten = option?.askEaten != null && option?.askEaten !== undefined 
        ? Number(option.askEaten) 
        : null;
      
      // Update cache with backend values (cache preserves non-zero values, only updates on change)
      const cachedValues = instrumentToken 
        ? updateEatenValues(instrumentToken, backendEatenDelta, backendBidEaten, backendAskEaten)
        : { eatenDelta: backendEatenDelta, bidEaten: backendBidEaten, askEaten: backendAskEaten };
      
      // Use cached values (preserved across refreshes)
      const rawEatenDelta = cachedValues.eatenDelta;
      const rawBidEaten = cachedValues.bidEaten;
      const rawAskEaten = cachedValues.askEaten;

      // Calculate incremental volume (cumulative change over 5-minute window)
      const contractKey = option?.instrumentToken || option?.tradingsymbol || null;
      const incrementalVolData = contractKey && rawVol !== null 
        ? updateIncrementalVolume(`${sectionType}:${contractKey}`, rawVol)
        : { incrementalVol: 0, volumeChange: 0, displayValue: '-', rawValue: null };

      const formattedChange = rawChange != null ? formatChange(rawChange) : '';
      const formattedPercent = rawChangePercent != null ? formatChangePercent(rawChangePercent) : '';

      return {
        segment: option.tradingsymbol || '-',
        badgeLabel: null,
        badgeTone: sectionType === 'calls' ? 'call' : 'put',
        sectionType,
        contractKey,
        instrumentToken: option?.instrumentToken,
        tradingsymbol: option?.tradingsymbol,
        strikePrice: option?.strikePrice,
        ltp: formatPrice(rawLastPrice),
        ltpRaw: rawLastPrice,
        change: formattedChange,
        changeRaw: rawChange,
        changePercent: formattedPercent,
        changePercentRaw: rawChangePercent,
        oi: formatInteger(rawOi),
        oiRaw: rawOi,
        vol: incrementalVolData.displayValue,
        volRaw: incrementalVolData.rawValue, // For coloring - incremental volume
        volChange: incrementalVolData.volumeChange, // Change in this refresh
        originalVol: rawVol, // Original API volume for tooltip
        bid: formatPrice(rawBid),
        bidRaw: rawBid,
        ask: formatPrice(rawAsk),
        askRaw: rawAsk,
        bidQty: formatInteger(rawBidQty),
        bidQtyRaw: rawBidQty,
        askQty: formatInteger(rawAskQty),
        askQtyRaw: rawAskQty,
        eatenDeltaRaw: rawEatenDelta,
        eatenDelta: rawEatenDelta != null ? formatInteger(Math.abs(rawEatenDelta)) : '',
        bidEatenRaw: rawBidEaten,
        askEatenRaw: rawAskEaten,
        highs: {},
        lows: {},
      };
    };

    const pushInfoRow = (message, sectionType) => {
      rows.push({
        segment: message,
        badgeLabel: null,
        badgeTone: sectionType === 'calls' ? 'call' : 'put',
        sectionType,
        isInfoRow: true,
        ltp: '',
        ltpRaw: null,
        change: '',
        changeRaw: null,
        changePercent: '',
        changePercentRaw: null,
        oi: '',
        oiRaw: null,
        vol: '',
        volRaw: null,
        bid: '',
        bidRaw: null,
        ask: '',
        askRaw: null,
        bidQty: '',
        bidQtyRaw: null,
        askQty: '',
        askQtyRaw: null,
        eatenDeltaRaw: null,
        eatenDelta: '',
        bidEatenRaw: null,
        askEatenRaw: null,
        highs: {},
        lows: {},
      });
    };

    const findOption = (list, strikeValue, type) => {
      if (strikeValue === null || strikeValue === undefined) return null;
      return list.find(opt => (opt.instrumentType || '').toUpperCase() === type && Number(opt.strikePrice) === Number(strikeValue)) || null;
    };

    const strikeBelow = sliderIndex > 0 ? strikes[sliderIndex - 1] : null;
    const strikeAbove = sliderIndex < maxIndex ? strikes[sliderIndex + 1] : null;

    const callITMOption = findOption(callsList, strikeBelow, 'CE');
    const callATMOption = findOption(callsList, selectedStrike, 'CE');
    const callOTMOption = findOption(callsList, strikeAbove, 'CE');

    const putITMOption = findOption(putsList, strikeAbove, 'PE');
    const putATMOption = findOption(putsList, selectedStrike, 'PE');
    const putOTMOption = findOption(putsList, strikeBelow, 'PE');

    const toneMap = {
      'CALL / ITM': 'call-itm',
      'CALL / ATM': 'call-atm',
      'CALL / OTM': 'call-otm',
      'PUT / ITM': 'put-itm',
      'PUT / ATM': 'put-atm',
      'PUT / OTM': 'put-otm',
    };

    const classifications = [
      { label: 'CALL / ITM', option: callITMOption, sectionType: 'calls', strike: strikeBelow },
      { label: 'CALL / ATM', option: callATMOption, sectionType: 'calls', strike: selectedStrike },
      { label: 'CALL / OTM', option: callOTMOption, sectionType: 'calls', strike: strikeAbove },
      { label: 'PUT / ITM', option: putITMOption, sectionType: 'puts', strike: strikeAbove },
      { label: 'PUT / ATM', option: putATMOption, sectionType: 'puts', strike: selectedStrike },
      { label: 'PUT / OTM', option: putOTMOption, sectionType: 'puts', strike: strikeBelow },
    ];

    classifications.forEach(({ label, option, sectionType, strike }) => {
      rows.push({
        segment: strike != null ? `Strike: ${formatStrikeValue(strike)}` : 'Strike: —',
        badgeLabel: label,
        badgeTone: toneMap[label] || (sectionType === 'calls' ? 'call' : 'put'),
        sectionType,
        isHeader: true,
        ltp: '',
        ltpRaw: null,
        change: '',
        changeRaw: null,
        changePercent: '',
        changePercentRaw: null,
        oi: '',
        oiRaw: null,
        vol: '',
        volRaw: null,
        bid: '',
        bidRaw: null,
        ask: '',
        askRaw: null,
        bidQty: '',
        bidQtyRaw: null,
        askQty: '',
        askQtyRaw: null,
        eatenDeltaRaw: null,
        eatenDelta: '',
        bidEatenRaw: null,
        askEatenRaw: null,
        highs: {},
        lows: {},
      });

      if (option) {
        const row = dynamicOptionRow(option, sectionType);
        if (row) {
          row.badgeLabel = label;
          row.badgeTone = toneMap[label] || (sectionType === 'calls' ? 'call' : 'put');
          rows.push(row);
        }
      } else {
        pushInfoRow('No contract available', sectionType);
      }
    });
 
    return {
      rows,
      sliderMin: 0,
      sliderMax: maxIndex,
      sliderIndex,
      selectedStrike,
      strikeStep,
      firstStrike: strikes[0],
      lastStrike: strikes[maxIndex],
      strikes // Expose strikes array for slider handler
    };
  }, [strikeList, dynamicStrikeIndex, atmIndex, strikeStep, callsForExpiry, putsForExpiry]);

  const dynamicSliderControl = dynamicStrikeTable.selectedStrike != null ? (
    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 text-xs sm:text-sm text-gray-600">
      <span className="focus-strike-pill">Focus Strike: {formatStrikeValue(dynamicStrikeTable.selectedStrike)}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-violet-500">&lt;&gt;</span>
        <span className="text-[11px] text-gray-400">{formatStrikeValue(dynamicStrikeTable.firstStrike)}</span>
        <input
          type="range"
          min={dynamicStrikeTable.sliderMin}
          max={dynamicStrikeTable.sliderMax}
          step={1}
          value={dynamicStrikeTable.sliderIndex}
          onChange={(event) => {
            const newIndex = Number(event.target.value);
            const newStrikeValue = dynamicStrikeTable.strikes?.[newIndex] ?? null;
            setDynamicStrikeIndex(newIndex);
            setIsStrikeLocked(true); // Lock the strike when manually changed
            setLockedStrikeValue(newStrikeValue); // Store the actual strike value
          }}
          className="w-44 sm:w-56 accent-violet-500"
        />
        <span className="text-[11px] text-gray-400">{formatStrikeValue(dynamicStrikeTable.lastStrike)}</span>
      </div>
    </div>
  ) : null;

  const fullscreenSections = useMemo(() => {
    const sections = [
      {
        title: 'Below Spot (ITM Calls / OTM Puts)',
        rows: minusOneTable,
      },
      {
        title: 'Above Spot (OTM Calls / ITM Puts)',
        rows: plusOneTable,
      },
    ];

    if (dynamicStrikeTable.rows.length) {
      sections.push({
        title: 'Dynamic Strike (ITM / ATM / OTM)',
        rows: dynamicStrikeTable.rows,
        headerSlot: dynamicSliderControl,
      });
    }

    return sections;
  }, [minusOneTable, plusOneTable, dynamicStrikeTable.rows, dynamicSliderControl]);

  const totalContracts = derivativesData?.totalContracts ?? 0;
  const colorCacheSize = useMemo(() => {
    const baseline = totalContracts > 0 ? totalContracts + 40 : 120;
    return Math.max(60, Math.min(baseline, 200));
  }, [totalContracts]);

  if (!derivativesData) {
    return (
      <div className="p-4 text-center">
        {loading ? 'Loading derivatives data...' : 'No derivatives data available'}
      </div>
    );
  }

  if (!activeFuturesContract) {
    return <div className="p-4 text-center">No futures contract available</div>;
  }

  return (
    <ContractColorProvider maxSize={colorCacheSize}>
      <div className="space-y-6">
        {/* Subtle backend polling warning (non-blocking, non-intrusive) */}
        {pollingWarning && (
          <div
            className={`text-xs px-3 py-2 rounded border ${
              isDarkMode
                ? 'bg-amber-900/40 border-amber-700 text-amber-200'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {pollingWarning}
          </div>
        )}

        {/* Data Source Indicator */}
        {(derivativesData.dataSource || targetExpiry) && (
          <div className="relative flex justify-center">
            <div className={`space-y-1 text-xs text-center ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
              {derivativesData.dataSource && (
                <div>Data Source: {derivativesData.dataSource} | Total Contracts: {derivativesData.totalContracts}</div>
              )}
              {targetExpiry && (
                <div>
                  Options Expiry: {new Date(targetExpiry).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  {currentStrike ? ` | Reference Strike: ${currentStrike}` : ''}
                </div>
              )}
            </div>
            {connectionWarning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-full shadow-lg animate-pulse">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-xs font-semibold uppercase tracking-wide">Live feed interrupted</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Main Table - All sections */}
        <FuturesTable 
          spot={derivativesData?.spotPrice ?? primaryFuturesPrice} 
          baseSymbol={activeFuturesContract?.tradingsymbol || 'NIFTY FUT'} 
          selectedContract={activeFuturesContract}
          summaryStats={headerStats}
          organizedData={mainTable}
          fullscreenSections={fullscreenSections}
          connectionWarning={connectionWarning}
          derivativesData={derivativesData}
        />
        
        {/* Below Spot Table - ITM Calls & OTM Puts */}
        <OptionsTable 
          title="BELOW SPOT (ITM Calls / OTM Puts)"
          data={minusOneTable}
          dailyStrikePrice={derivativesData.dailyStrikePrice}
          collapsible
          collapsed={minusStrikeCollapsed}
          onToggle={() => setMinusStrikeCollapsed(prev => !prev)}
          enableColoring
        />
        
        {/* Above Spot Table - OTM Calls & ITM Puts */}
        <OptionsTable 
          title="ABOVE SPOT (OTM Calls / ITM Puts)"
          data={plusOneTable}
          dailyStrikePrice={derivativesData.dailyStrikePrice}
          collapsible
          collapsed={plusStrikeCollapsed}
          onToggle={() => setPlusStrikeCollapsed(prev => !prev)}
          enableColoring
        />

        {/* Dynamic Strike Selection Table */}
        <OptionsTable
          title="DYNAMIC STRIKE (ITM / ATM / OTM)"
          data={dynamicStrikeTable.rows}
          collapsible
          collapsed={dynamicTableCollapsed}
          onToggle={() => setDynamicTableCollapsed(!dynamicTableCollapsed)}
          enableColoring
          headerExtras={dynamicSliderControl}
        />
      </div>
    </ContractColorProvider>
  );
}

export default DerivativesDashboard;
