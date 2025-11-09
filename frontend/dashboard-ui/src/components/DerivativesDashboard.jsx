import React, { useMemo, useEffect, useState, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDerivatives } from '../api/client';
import FuturesTable from './FuturesTable';
import OptionsTable from './OptionsTable';
import { ContractColorProvider } from '../contexts/ContractColorContext';
import { useRefreshInterval } from '../contexts/RefreshIntervalContext';

function DerivativesDashboard({ 
  selectedContract,
  onConnectionStatusChange = () => {},
  connectionWarning = null,
}) {
  const { intervalMs } = useRefreshInterval();
  const [derivativesData, setDerivativesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minusStrikeCollapsed, setMinusStrikeCollapsed] = useState(false);
  const [plusStrikeCollapsed, setPlusStrikeCollapsed] = useState(false);
  const [dynamicStrikeIndex, setDynamicStrikeIndex] = useState(null);
  const [dynamicTableCollapsed, setDynamicTableCollapsed] = useState(false);
  const navigate = useNavigate();
  const isFetchingRef = useRef(false);
  const timerRef = useRef(null);
  const latestDataRef = useRef(null);

  const formatStrikeValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
  };

  console.log('🔄 DerivativesDashboard: Component rendered/re-mounted', {
    selectedContract: selectedContract?.tradingsymbol,
    hasData: !!derivativesData
  });

  // Load derivatives data
  useEffect(() => {
    let mounted = true;
    
    const loadDerivatives = async () => {
      try {
        if (isFetchingRef.current) {
          return;
        }
        isFetchingRef.current = true;
        console.log('🚀 DerivativesDashboard: Loading derivatives data...');
        if (!derivativesData) setLoading(true);
        const data = await fetchDerivatives('NIFTY');
        console.log('✅ DerivativesDashboard: Derivatives data loaded:', data);

        if (!mounted) {
          return;
        }

        const futuresCount = Array.isArray(data?.futures) ? data.futures.length : 0;
        const callCount = Array.isArray(data?.callOptions) ? data.callOptions.length : 0;
        const putCount = Array.isArray(data?.putOptions) ? data.putOptions.length : 0;
        const hasContracts = futuresCount + callCount + putCount > 0;

        if (hasContracts) {
          latestDataRef.current = data;
          setDerivativesData(data);
          onConnectionStatusChange(null);
        } else {
          console.warn('⚠️ DerivativesDashboard: No live contracts returned from Zerodha API');

          onConnectionStatusChange({
            type: 'no-data',
            message: 'Zerodha API did not return live contracts. Showing the last known prices until the feed recovers.',
          });

          if (latestDataRef.current) {
            const previous = latestDataRef.current;
            const merged = {
              ...previous,
              ...data,
              futures: previous.futures || [],
              callOptions: previous.callOptions || [],
              putOptions: previous.putOptions || [],
              totalContracts: previous.totalContracts ?? futuresCount + callCount + putCount,
            };
            latestDataRef.current = merged;
            setDerivativesData(merged);
          } else {
            // No historical data yet; show what we have and allow UI to render warning
            latestDataRef.current = data;
            setDerivativesData(data);
          }
        }
      } catch (error) {
        console.error('❌ DerivativesDashboard: Error loading data:', error);
        if (mounted && error?.response?.status === 401) {
          navigate('/', { replace: true });
          return;
        }

        if (mounted) {
          const message = deriveConnectionErrorMessage(error);
          onConnectionStatusChange({
            type: 'error',
            message,
          });

          if (!latestDataRef.current) {
            setDerivativesData({
              underlying: 'NIFTY',
              spotPrice: null,
              dailyStrikePrice: null,
              futures: [],
              callOptions: [],
              putOptions: [],
              totalContracts: 0,
              dataSource: 'ERROR',
            });
          } else {
            setDerivativesData(latestDataRef.current);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
        isFetchingRef.current = false;
      }
    };
    
    // Load data immediately
    const scheduleNext = () => {
      if (!mounted) return;
      timerRef.current = setTimeout(async () => {
        await loadDerivatives();
        scheduleNext();
      }, intervalMs);
    };

    loadDerivatives().then(() => {
      if (mounted) {
        scheduleNext();
      }
    });
    
    return () => {
      mounted = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      isFetchingRef.current = false;
    };
  }, [navigate, intervalMs, onConnectionStatusChange]);

  const organizedData = useMemo(() => {
    if (!derivativesData) {
      return {
        mainTable: [],
        minusOneTable: [],
        plusOneTable: [],
        referencePrice: null,
        currentStrike: null,
        desiredPlusStrike: null,
        desiredMinusStrike: null,
        futuresPrice: null,
        currentFuturesContract: null,
        activeFuturesContract: null,
        targetExpiry: null
      };
    }

    const spotPrice = derivativesData.spotPrice || null;
    
    // Dynamic option filtering: Get options for current week (nearest expiry) and futures contract for current month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Determine primary futures contract (current month, no NIFTYNXT)
    const allFutures = (derivativesData.futures || [])
      .filter(f => (f.instrumentType || '').toUpperCase() === 'FUT' || (f.tradingsymbol || '').toUpperCase().includes('FUT'))
      .filter(f => !(f.tradingsymbol || '').toUpperCase().includes('NXT'));

    const futuresWithDates = allFutures
      .map(f => ({
        ...f,
        expiryDateObj: f.expiryDate ? new Date(f.expiryDate) : null
      }))
      .map(f => ({
        ...f,
        expiryTimestamp: f.expiryDateObj && !isNaN(f.expiryDateObj.getTime()) ? f.expiryDateObj.getTime() : null
      }))
      .filter(f => f.expiryTimestamp !== null);

    const sortedFutures = futuresWithDates
      .sort((a, b) => a.expiryTimestamp - b.expiryTimestamp);
    
    const currentFuturesContract = sortedFutures.find(f => f.expiryDateObj >= today) || sortedFutures[0] || null;

    let matchedSelectedFuture = null;
    if (selectedContract) {
      matchedSelectedFuture = sortedFutures.find(future => {
        const tokensMatch = selectedContract.instrumentToken && future.instrumentToken && String(future.instrumentToken) === String(selectedContract.instrumentToken);
        const symbolsMatch = selectedContract.tradingsymbol && future.tradingsymbol && future.tradingsymbol === selectedContract.tradingsymbol;
        return tokensMatch || symbolsMatch;
      }) || null;
    }

    const activeFuturesContract = matchedSelectedFuture || currentFuturesContract;
    const futuresPrice = activeFuturesContract?.lastPrice ? Number(activeFuturesContract.lastPrice) : (currentFuturesContract?.lastPrice ? Number(currentFuturesContract.lastPrice) : null);

    // Determine nearest weekly options expiry (closest future date)
    const allOptionExpiries = [...new Set([
      ...(derivativesData.callOptions || []).map(call => call.expiryDate),
      ...(derivativesData.putOptions || []).map(put => put.expiryDate)
    ])]
      .map(expiry => ({
        raw: expiry,
        date: expiry ? new Date(expiry) : null
      }))
      .filter(item => item.date && !isNaN(item.date.getTime()))
      .sort((a, b) => a.date - b.date);

    const nearestWeeklyExpiry = allOptionExpiries.find(item => {
      const date = new Date(item.date);
      date.setHours(0, 0, 0, 0);
      return date >= today;
    }) || allOptionExpiries[allOptionExpiries.length - 1] || null;

    let preferredExpiry = null;
    if (activeFuturesContract?.expiryDateObj) {
      const targetMonth = activeFuturesContract.expiryDateObj.getMonth();
      const targetYear = activeFuturesContract.expiryDateObj.getFullYear();

      const sameMonthExpiries = allOptionExpiries.filter(item => {
        if (!item.date || Number.isNaN(item.date.getTime())) return false;
        return item.date.getMonth() === targetMonth && item.date.getFullYear() === targetYear;
      });

      if (sameMonthExpiries.length) {
        preferredExpiry = sameMonthExpiries.find(item => item.date >= today) || sameMonthExpiries[sameMonthExpiries.length - 1];
      }
    }

    const targetExpiry = (preferredExpiry ?? nearestWeeklyExpiry)?.raw ?? null;

    const calls = targetExpiry
      ? (derivativesData.callOptions || []).filter(call => call.expiryDate === targetExpiry)
      : (derivativesData.callOptions || []);

    const puts = targetExpiry
      ? (derivativesData.putOptions || []).filter(put => put.expiryDate === targetExpiry)
      : (derivativesData.putOptions || []);

    const referencePrice = spotPrice || derivativesData.dailyStrikePrice || futuresPrice || 0;

    // Calculate strikes once for all tables (before defining organizeOptions)
    const strikeUnit = 50;
    const allStrikes = [...new Set([
      ...calls.map(c => c.strikePrice),
      ...puts.map(p => p.strikePrice)
    ])].sort((a, b) => a - b);

    const strikeStep = allStrikes.length > 1
      ? Math.abs(Number(allStrikes[1]) - Number(allStrikes[0])) || strikeUnit
      : strikeUnit;
    
    let currentStrike = allStrikes[0] || 0;
    if (allStrikes.length > 0 && referencePrice) {
      currentStrike = allStrikes.reduce((closest, strike) => {
        return Math.abs(strike - referencePrice) < Math.abs(closest - referencePrice) ? strike : closest;
      });
    }
    
    const currentStrikeIndex = allStrikes.findIndex(strike => Number(strike) === Number(currentStrike));

    const desiredPlusStrike = currentStrike + strikeUnit;
    const desiredMinusStrike = currentStrike - strikeUnit;

    const sortedCalls = [...calls].sort((a, b) => a.strikePrice - b.strikePrice);
    const sortedPuts = [...puts].sort((a, b) => a.strikePrice - b.strikePrice);

    const formatPrice = (value) => {
      if (value === null || value === undefined || value === '') return '-';
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric.toFixed(2) : String(value);
    };

    const formatInteger = (value) => {
      if (value === null || value === undefined || value === '') return '-';
      const numeric = Number(value);
      return Number.isFinite(numeric) ? Math.round(numeric).toLocaleString() : String(value);
    };

    const selectOption = (options, strikeValue, type, direction = 'closest') => {
      if (!options.length || strikeValue == null) return null;
      const filtered = options
        .filter(opt => (opt.instrumentType || '').toUpperCase() === type && opt.strikePrice != null)
        .sort((a, b) => Number(a.strikePrice) - Number(b.strikePrice));

      if (!filtered.length) return null;

      const target = Number(strikeValue);
      const exact = filtered.find(opt => Number(opt.strikePrice) === target);
      if (exact) return exact;

      if (direction === 'below') {
        const below = filtered.filter(opt => Number(opt.strikePrice) < target);
        return below.length ? below[below.length - 1] : filtered[0];
      }

      if (direction === 'above') {
        const above = filtered.filter(opt => Number(opt.strikePrice) > target);
        return above.length ? above[0] : filtered[filtered.length - 1];
      }

      return filtered.reduce((closest, current) => {
        if (!closest) return current;
        const currentDiff = Math.abs(Number(current.strikePrice) - target);
        const closestDiff = Math.abs(Number(closest.strikePrice) - target);
        if (currentDiff < closestDiff) return current;
        if (currentDiff === closestDiff) {
          const currentVol = Number(current.volume) || 0;
          const closestVol = Number(closest.volume) || 0;
          return currentVol >= closestVol ? current : closest;
        }
        return closest;
      }, null);
    };

    const extractHighLow = (option, sectionType) => {
      if (!option) return { highs: {}, lows: {} };

      const mapField = (field, candidates) => {
        for (const key of candidates) {
          if (option[key] !== undefined && option[key] !== null) {
            return option[key];
          }
        }
        return null;
      };

      const highs = {};
      const lows = {};

      const ltpHigh = mapField('lastPriceHigh', ['highPrice', 'high', 'dayHighPrice']);
      const ltpLow = mapField('lastPriceLow', ['lowPrice', 'low', 'dayLowPrice']);
      if (ltpHigh !== null) highs.ltp = ltpHigh;
      if (ltpLow !== null) lows.ltp = ltpLow;

      const changePctHigh = mapField('changePercentHigh', ['changePercentDayHigh']);
      const changePctLow = mapField('changePercentLow', ['changePercentDayLow']);
      if (changePctHigh !== null) highs.changePercent = changePctHigh;
      if (changePctLow !== null) lows.changePercent = changePctLow;

      const oiHigh = mapField('openInterestDayHigh', ['openInterestDayHigh', 'oiDayHigh']);
      const oiLow = mapField('openInterestDayLow', ['openInterestDayLow', 'oiDayLow']);
      if (oiHigh !== null) highs.oi = oiHigh;
      if (oiLow !== null) lows.oi = oiLow;

      const volHigh = mapField('volumeDayHigh', ['volumeDayHigh']);
      const volLow = mapField('volumeDayLow', ['volumeDayLow']);
      if (volHigh !== null) highs.vol = volHigh;
      if (volLow !== null) lows.vol = volLow;

      const bidHigh = mapField('bestBidPriceDayHigh', ['bestBidPriceDayHigh']);
      const bidLow = mapField('bestBidPriceDayLow', ['bestBidPriceDayLow']);
      if (bidHigh !== null) highs.bid = bidHigh;
      if (bidLow !== null) lows.bid = bidLow;

      const askHigh = mapField('bestAskPriceDayHigh', ['bestAskPriceDayHigh']);
      const askLow = mapField('bestAskPriceDayLow', ['bestAskPriceDayLow']);
      if (askHigh !== null) highs.ask = askHigh;
      if (askLow !== null) lows.ask = askLow;

      const bidQtyHigh = mapField('bestBidQtyDayHigh', ['bestBidQtyDayHigh']);
      const bidQtyLow = mapField('bestBidQtyDayLow', ['bestBidQtyDayLow']);
      if (bidQtyHigh !== null) highs.bidQty = bidQtyHigh;
      if (bidQtyLow !== null) lows.bidQty = bidQtyLow;

      const askQtyHigh = mapField('bestAskQtyDayHigh', ['bestAskQtyDayHigh']);
      const askQtyLow = mapField('bestAskQtyDayLow', ['bestAskQtyDayLow']);
      if (askQtyHigh !== null) highs.askQty = askQtyHigh;
      if (askQtyLow !== null) lows.askQty = askQtyLow;

      return { highs, lows };
    };

    const buildOptionRow = (option, sectionType, variant = 'default') => {
      const { highs, lows } = extractHighLow(option, sectionType);
      const baseBadgeLabel = sectionType === 'calls' ? 'CALL' : 'PUT';
      const badgeTone = sectionType === 'calls' ? 'call' : 'put';
      const strikeDisplay = option?.strikePrice != null ? Number(option.strikePrice).toFixed(0) : '-';
      const tradingsymbol = option?.tradingsymbol || '';
      const formattedStrike = option?.strikePrice != null ? formatStrikeValue(option.strikePrice) : '-';

      const rawLastPrice = option?.lastPrice != null ? Number(option.lastPrice) : null;
      const rawChange = option?.change != null ? Number(option.change) : null;
      const rawChangePercent = option?.changePercent != null ? Number(option.changePercent) : null;
      const rawOi = option?.openInterest != null ? Number(option.openInterest) : null;
      const rawVol = option?.volume != null ? Number(option.volume) : null;
      const rawBid = option?.bid != null ? Number(option.bid) : null;
      const rawAsk = option?.ask != null ? Number(option.ask) : null;
      const rawBidQty = option?.bidQuantity != null ? Number(option.bidQuantity) : null;
      const rawAskQty = option?.askQuantity != null ? Number(option.askQuantity) : null;
 
      let segmentLabel;
      let badgeLabel = baseBadgeLabel;

      switch (variant) {
        case 'main':
          segmentLabel = option
            ? `@ ${strikeDisplay}${tradingsymbol ? ` (${tradingsymbol})` : ''}`
            : `@ -`;
          break;
        case 'contract-only':
          segmentLabel = tradingsymbol || '-';
          badgeLabel = null;
          break;
        case 'strike-title':
          segmentLabel = option ? `Strike: ${formattedStrike}` : 'Strike: —';
          break;
        default:
          segmentLabel = option
            ? `${strikeDisplay}${tradingsymbol ? ` (${tradingsymbol})` : ''}`
            : '-';
          break;
      }

      const contractKey = option
        ? `${sectionType}:${option.instrumentToken || option.tradingsymbol || segmentLabel}`
        : null;

      let changeDisplay = '';
      if (option?.change != null) {
        const formatted = formatPrice(option.change);
        const numeric = Number(option.change);
        changeDisplay = numeric > 0 ? `+${formatted}` : formatted;
      }

      let changePercentDisplay = '';
      if (option?.changePercent != null) {
        const formatted = formatPrice(option.changePercent);
        const numeric = Number(option.changePercent);
        changePercentDisplay = `${numeric > 0 ? `+${formatted}` : formatted}%`;
      }

      return {
        segment: segmentLabel,
        badgeLabel,
        ltp: rawLastPrice != null ? formatPrice(rawLastPrice) : '',
        ltpRaw: rawLastPrice,
        change: changeDisplay,
        changeRaw: rawChange,
        changePercent: changePercentDisplay,
        changePercentRaw: rawChangePercent,
        oi: rawOi != null ? formatInteger(rawOi) : '',
        oiRaw: rawOi,
        vol: rawVol != null ? formatInteger(rawVol) : '',
        volRaw: rawVol,
        bid: rawBid != null ? formatPrice(rawBid) : '',
        bidRaw: rawBid,
        ask: rawAsk != null ? formatPrice(rawAsk) : '',
        askRaw: rawAsk,
        bidQty: rawBidQty != null ? formatInteger(rawBidQty) : '',
        bidQtyRaw: rawBidQty,
        askQty: rawAskQty != null ? formatInteger(rawAskQty) : '',
        askQtyRaw: rawAskQty,
        strikePrice: option?.strikePrice,
        sectionType,
        contractKey,
        instrumentToken: option?.instrumentToken,
        tradingsymbol: option?.tradingsymbol,
        highs,
        lows,
        badgeTone,
      };
    };

    const buildInfoRow = (label, sectionType) => ({
      segment: label,
      badgeLabel: null,
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
      sectionType,
      isInfoRow: true,
    });

    const buildHeaderRow = ({ badgeLabel = null, segment, sectionType, badgeTone = sectionType === 'calls' ? 'call' : sectionType === 'puts' ? 'put' : 'neutral' }) => ({
      segment,
      badgeLabel,
      badgeTone,
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
      sectionType
    });

    const buildFuturesRow = (future) => {
      if (!future) return null;
      const contractKey = future?.instrumentToken || future?.tradingsymbol || null;
      const rawLastPrice = future?.lastPrice != null ? Number(future.lastPrice) : null;
      const rawChange = future?.change != null ? Number(future.change) : null;
      const rawChangePercent = future?.changePercent != null ? Number(future.changePercent) : null;
      const rawOi = future?.openInterest != null ? Number(future.openInterest) : null;
      const rawVol = future?.volume != null ? Number(future.volume) : null;
      const rawBid = future?.bid != null ? Number(future.bid) : null;
      const rawAsk = future?.ask != null ? Number(future.ask) : null;
      const rawBidQty = future?.bidQuantity != null ? Number(future.bidQuantity) : null;
      const rawAskQty = future?.askQuantity != null ? Number(future.askQuantity) : null;
      return {
        segment: future.tradingsymbol || 'NIFTY FUT',
        ltp: rawLastPrice != null ? formatPrice(rawLastPrice) : '',
        ltpRaw: rawLastPrice,
        change: rawChange != null ? formatPrice(rawChange) : '',
        changeRaw: rawChange,
        changePercent: rawChangePercent != null ? formatPrice(rawChangePercent) : '',
        changePercentRaw: rawChangePercent,
        oi: rawOi != null ? formatInteger(rawOi) : '',
        oiRaw: rawOi,
        vol: rawVol != null ? formatInteger(rawVol) : '',
        volRaw: rawVol,
        bid: rawBid != null ? formatPrice(rawBid) : '',
        bidRaw: rawBid,
        ask: rawAsk != null ? formatPrice(rawAsk) : '',
        askRaw: rawAsk,
        bidQty: rawBidQty != null ? formatInteger(rawBidQty) : '',
        bidQtyRaw: rawBidQty,
        askQty: rawAskQty != null ? formatInteger(rawAskQty) : '',
        askQtyRaw: rawAskQty,
        sectionType: 'futures',
        instrumentToken: future.instrumentToken,
        tradingsymbol: future.tradingsymbol,
        contractKey,
      };
    };

    const atmCall = selectOption(sortedCalls, currentStrike, 'CE', 'closest');
    const atmPut = selectOption(sortedPuts, currentStrike, 'PE', 'closest');
    const belowCall = selectOption(sortedCalls, desiredMinusStrike, 'CE', 'closest');
    const belowPut = selectOption(sortedPuts, desiredMinusStrike, 'PE', 'closest');
    const aboveCall = selectOption(sortedCalls, desiredPlusStrike, 'CE', 'closest');
    const abovePut = selectOption(sortedPuts, desiredPlusStrike, 'PE', 'closest');
    const futuresRow = buildFuturesRow(activeFuturesContract);

    const mainRows = [];
    if (futuresRow) {
      mainRows.push(futuresRow);
    }
    if (atmCall) {
      mainRows.push(buildOptionRow(atmCall, 'calls', 'main'));
    } else {
      mainRows.push(buildInfoRow('No call contract at ATM', 'calls'));
    }
    if (atmPut) {
      mainRows.push(buildOptionRow(atmPut, 'puts', 'main'));
    } else {
      mainRows.push(buildInfoRow('No put contract at ATM', 'puts'));
    }

    const belowRows = [];
    const belowLabel = desiredMinusStrike != null ? formatStrikeValue(desiredMinusStrike) : 'N/A';
    belowRows.push(buildHeaderRow({
      badgeLabel: 'CALL OPTIONS',
      badgeTone: 'call',
      segment: `Strike: ${belowLabel}`,
      sectionType: 'calls'
    }));
    if (belowCall) {
      belowRows.push(buildOptionRow(belowCall, 'calls', 'contract-only'));
    } else {
      belowRows.push(buildInfoRow('No call options available at this strike', 'calls'));
    }
    belowRows.push(buildHeaderRow({
      badgeLabel: 'PUT OPTIONS',
      badgeTone: 'put',
      segment: `Strike: ${belowLabel}`,
      sectionType: 'puts'
    }));
    if (belowPut) {
      belowRows.push(buildOptionRow(belowPut, 'puts', 'contract-only'));
    } else {
      belowRows.push(buildInfoRow('No put options available at this strike', 'puts'));
    }

    const aboveRows = [];
    const aboveLabel = desiredPlusStrike != null ? formatStrikeValue(desiredPlusStrike) : 'N/A';
    aboveRows.push(buildHeaderRow({
      badgeLabel: 'CALL OPTIONS',
      badgeTone: 'call',
      segment: `Strike: ${aboveLabel}`,
      sectionType: 'calls'
    }));
    if (aboveCall) {
      aboveRows.push(buildOptionRow(aboveCall, 'calls', 'contract-only'));
    } else {
      aboveRows.push(buildInfoRow('No call options available at this strike', 'calls'));
    }
    aboveRows.push(buildHeaderRow({
      badgeLabel: 'PUT OPTIONS',
      badgeTone: 'put',
      segment: `Strike: ${aboveLabel}`,
      sectionType: 'puts'
    }));
    if (abovePut) {
      aboveRows.push(buildOptionRow(abovePut, 'puts', 'contract-only'));
    } else {
      aboveRows.push(buildInfoRow('No put options available at this strike', 'puts'));
    }

    return {
      mainTable: mainRows,
      minusOneTable: belowRows,
      plusOneTable: aboveRows,
      referencePrice,
      currentStrike,
      desiredPlusStrike,
      desiredMinusStrike,
      futuresPrice,
      currentFuturesContract,
      activeFuturesContract,
      targetExpiry,
      strikeList: allStrikes,
      atmIndex: currentStrikeIndex,
      strikeStep,
      callsForExpiry: sortedCalls,
      putsForExpiry: sortedPuts
    };
  }, [derivativesData, selectedContract]);

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
      }
      return;
    }
 
    const maxIndex = strikeList.length - 1;
    const desiredIndex = dynamicStrikeIndex;
 
    if (desiredIndex === null || desiredIndex < 0 || desiredIndex > maxIndex) {
      const fallbackIndex = (typeof atmIndex === 'number' && atmIndex >= 0 && atmIndex <= maxIndex)
        ? atmIndex
        : Math.max(0, Math.floor(strikeList.length / 2));
      setDynamicStrikeIndex(fallbackIndex);
    }
  }, [strikeList, atmIndex, dynamicStrikeIndex]);
 
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
        lastStrike: null
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

    const formatPriceValue = (value) => {
      if (value === null || value === undefined || Number.isNaN(value)) return '';
      return Number(value).toFixed(2);
    };

    const formatIntegerValue = (value) => {
      if (value === null || value === undefined || Number.isNaN(value)) return '';
      return Number(value).toLocaleString();
    };

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

      const formattedChange = rawChange != null ? `${rawChange > 0 ? '+' : ''}${formatPriceValue(rawChange)}` : '';
      const formattedPercent = rawChangePercent != null ? `${rawChangePercent > 0 ? '+' : ''}${Number(rawChangePercent).toFixed(2)}%` : '';

      return {
        segment: option.tradingsymbol || '-',
        badgeLabel: null,
        badgeTone: sectionType === 'calls' ? 'call' : 'put',
        sectionType,
        contractKey: option?.instrumentToken || option?.tradingsymbol || null,
        instrumentToken: option?.instrumentToken,
        tradingsymbol: option?.tradingsymbol,
        strikePrice: option?.strikePrice,
        ltp: rawLastPrice != null ? formatPriceValue(rawLastPrice) : '',
        ltpRaw: rawLastPrice,
        change: formattedChange,
        changeRaw: rawChange,
        changePercent: formattedPercent,
        changePercentRaw: rawChangePercent,
        oi: rawOi != null ? formatIntegerValue(rawOi) : '',
        oiRaw: rawOi,
        vol: rawVol != null ? formatIntegerValue(rawVol) : '',
        volRaw: rawVol,
        bid: rawBid != null ? formatPriceValue(rawBid) : '',
        bidRaw: rawBid,
        ask: rawAsk != null ? formatPriceValue(rawAsk) : '',
        askRaw: rawAsk,
        bidQty: rawBidQty != null ? formatIntegerValue(rawBidQty) : '',
        bidQtyRaw: rawBidQty,
        askQty: rawAskQty != null ? formatIntegerValue(rawAskQty) : '',
        askQtyRaw: rawAskQty,
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
        highs: {},
        lows: {},
      });

      if (option) {
        const row = dynamicOptionRow(option, sectionType);
        if (row) rows.push(row);
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
      lastStrike: strikes[maxIndex]
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
          onChange={(event) => setDynamicStrikeIndex(Number(event.target.value))}
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

  if (!derivativesData) {
    return <div className="p-4 text-center">Loading derivatives data...</div>;
  }

  if (!activeFuturesContract) {
    return <div className="p-4 text-center">No futures contract available</div>;
  }

  return (
    <ContractColorProvider>
      <div className="space-y-6">
        {/* Data Source Indicator */}
        {(derivativesData.dataSource || targetExpiry) && (
          <div className="relative flex justify-center">
            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 text-center">
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

function deriveConnectionErrorMessage(error) {
  if (!error) return 'Unknown error';
  if (error.response) {
    const { status } = error.response;
    if (status === 429) return 'Zerodha API rate limit reached. Pausing updates briefly.';
    if (status === 401) return 'Session expired with Zerodha. Please login again to resume live data.';
    if (status >= 500) return 'Zerodha API reported a server error. Waiting for recovery.';
    return `Zerodha API responded with status ${status}. Retrying shortly.`;
  }
  if (error.request) {
    return 'Network interruption detected. Trying to reconnect to the Zerodha feed.';
  }
  return error.message || 'Unexpected error contacting Zerodha API.';
}
