import React, { useMemo, useEffect, useState, memo } from 'react';
import { fetchDerivatives } from '../api/client';
import FuturesTable from './FuturesTable';
import OptionsTable from './OptionsTable';
import { REFRESH_INTERVAL_MS } from '../constants';

function DerivativesDashboard({ 
  selectedContract, 
  blinkEnabled, 
  animateEnabled
}) {
  const [derivativesData, setDerivativesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minusStrikeCollapsed, setMinusStrikeCollapsed] = useState(false);
  const [plusStrikeCollapsed, setPlusStrikeCollapsed] = useState(false);
  const [dynamicStrikeIndex, setDynamicStrikeIndex] = useState(null);
  const [dynamicTableCollapsed, setDynamicTableCollapsed] = useState(false);

  const formatStrikeValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
  };

  console.log('🔄 DerivativesDashboard: Component rendered/re-mounted', {
    selectedContract: selectedContract?.tradingsymbol,
    blinkEnabled,
    animateEnabled,
    hasData: !!derivativesData
  });

  // Load derivatives data
  useEffect(() => {
    let mounted = true;
    let intervalId = null;
    
    const loadDerivatives = async () => {
      try {
        console.log('🚀 DerivativesDashboard: Loading derivatives data...');
        if (!derivativesData) setLoading(true);
        const data = await fetchDerivatives('NIFTY');
        console.log('✅ DerivativesDashboard: Derivatives data loaded:', data);
        if (mounted) {
          // Handle empty data from Breeze API
          if (data && data.dataSource === 'NO_DATA') {
            console.warn('⚠️ DerivativesDashboard: No real data available from Zerodha API');
            setDerivativesData({
              ...data,
              futures: [],
              callOptions: [],
              putOptions: [],
              totalContracts: 0
            });
          } else {
            setDerivativesData(data);
          }
        }
      } catch (error) {
        console.error('❌ DerivativesDashboard: Error loading data:', error);
        if (mounted && !derivativesData) {
          // Set empty data structure on error (no hardcoded values)
          setDerivativesData({
            underlying: 'NIFTY',
            spotPrice: null,
            dailyStrikePrice: null,
            futures: [],
            callOptions: [],
            putOptions: [],
            totalContracts: 0,
            dataSource: 'ERROR'
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    // Load data immediately
    loadDerivatives();
    
    // Set up interval only after initial load
    intervalId = setInterval(() => {
      if (mounted) {
        loadDerivatives();
      }
    }, REFRESH_INTERVAL_MS);
    
    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []); // Empty dependency array to prevent re-mounting

  const organizedData = useMemo(() => {
    if (!derivativesData) {
      return {
        mainTable: [],
        minusOneTable: [],
        plusOneTable: [],
        referencePrice: null,
        currentStrike: null,
        plusOneStrike: null,
        minusOneStrike: null,
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

    const referencePrice = futuresPrice || spotPrice || derivativesData.dailyStrikePrice || 0;

    // Calculate strikes once for all tables (before defining organizeOptions)
    const strikeUnit = 50;
    const allStrikes = [...new Set([
      ...calls.map(c => c.strikePrice),
      ...puts.map(p => p.strikePrice)
    ])].sort((a, b) => a - b);
    
    let currentStrike = allStrikes[0] || 0;
    if (allStrikes.length > 0 && referencePrice) {
      currentStrike = allStrikes.reduce((closest, strike) => {
        return Math.abs(strike - referencePrice) < Math.abs(closest - referencePrice) ? strike : closest;
      });
    }
    
    const currentStrikeIndex = allStrikes.indexOf(currentStrike);
    const plusOneStrike = currentStrikeIndex >= 0 && currentStrikeIndex < allStrikes.length - 1 
      ? allStrikes[currentStrikeIndex + 1] 
      : currentStrike + strikeUnit;
    const minusOneStrike = currentStrikeIndex > 0 
      ? allStrikes[currentStrikeIndex - 1] 
      : currentStrike - strikeUnit;

    const sortedCalls = [...calls].sort((a, b) => a.strikePrice - b.strikePrice);
    const sortedPuts = [...puts].sort((a, b) => a.strikePrice - b.strikePrice);

    const findNearestIndex = (options, strike) => {
      if (!options.length) return -1;
      let idx = options.findIndex(opt => Number(opt.strikePrice) === Number(strike));
      if (idx !== -1) return idx;
      let bestIdx = 0;
      let bestDiff = Math.abs(options[0].strikePrice - strike);
      for (let i = 1; i < options.length; i += 1) {
        const diff = Math.abs(options[i].strikePrice - strike);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    const getWindowAroundStrike = (options, strike, windowSize = 50) => {
      if (!options.length) return [];
      const idx = findNearestIndex(options, strike);
      if (idx === -1 || idx === undefined) return [];
      const start = Math.max(idx - windowSize, 0);
      const end = Math.min(idx + windowSize, options.length - 1);
      return options.slice(start, end + 1);
    };

    const windowSize = 100;
    const callsWindow = getWindowAroundStrike(sortedCalls, currentStrike, windowSize);
    const putsWindow = getWindowAroundStrike(sortedPuts, currentStrike, windowSize);
    const strikeStep = allStrikes.length > 1 ? Math.abs(allStrikes[1] - allStrikes[0]) : strikeUnit;

    const callsMinusStrike = sortedCalls.filter(opt => Number(opt.strikePrice) === Number(minusOneStrike));
    const putsMinusStrike = sortedPuts.filter(opt => Number(opt.strikePrice) === Number(minusOneStrike));
    const callsPlusStrike = sortedCalls.filter(opt => Number(opt.strikePrice) === Number(plusOneStrike));
    const putsPlusStrike = sortedPuts.filter(opt => Number(opt.strikePrice) === Number(plusOneStrike));

    const buildOptionRow = (option, labelPrefix, sectionType) => {
      const changeValue = option?.change != null ? Number(option.change) : 0;
      const indicator = changeValue > 0 ? 'up' : changeValue < 0 ? 'down' : 'neutral';
      const bidValue = option?.bid != null ? Number(option.bid).toFixed(2) : '-';
      const askValue = option?.ask != null ? Number(option.ask).toFixed(2) : '-';
      const bidQtyValue = option?.bidQuantity != null ? Number(option.bidQuantity).toLocaleString() : '-';
      const askQtyValue = option?.askQuantity != null ? Number(option.askQuantity).toLocaleString() : '-';
      return {
        segment: option
          ? `${labelPrefix} ${option.strikePrice != null ? Number(option.strikePrice).toFixed(0) : '-'} (${option.tradingsymbol || ''})`
          : `${labelPrefix} -`,
        ltp: option?.lastPrice != null ? Number(option.lastPrice).toFixed(2) : '-',
        change: option?.change != null ? changeValue.toFixed(2) : '-',
        changePercent: option?.changePercent != null ? Number(option.changePercent).toFixed(2) : '-',
        oi: option?.openInterest != null ? Number(option.openInterest).toLocaleString() : '-',
        vol: option?.volume != null ? Number(option.volume).toLocaleString() : '-',
        bid: bidValue,
        ask: askValue,
        bidQty: bidQtyValue,
        askQty: askQtyValue,
        indicator,
        isBlinking: false,
        strikePrice: option?.strikePrice,
        sectionType,
        instrumentToken: option?.instrumentToken,
        tradingsymbol: option?.tradingsymbol
      };
    };

    const buildInfoRow = (label, sectionType) => ({
      segment: label,
            ltp: '-', 
            change: '-', 
      changePercent: '-',
            oi: '-', 
            vol: '-', 
            bid: '-', 
      ask: '-',
            bidQty: '-',
      askQty: '-',
      indicator: 'info',
      sectionType
    });

    const findClosestOption = (options, type, strikeValue) => {
      const candidates = options.filter(opt => (opt.instrumentType || '').toUpperCase() === type && opt.strikePrice != null);
      if (!candidates.length) return null;
      return candidates.reduce((closest, current) => {
        if (!closest) return current;
        const currentDiff = Math.abs(Number(current.strikePrice) - strikeValue);
        const closestDiff = Math.abs(Number(closest.strikePrice) - strikeValue);
        if (currentDiff < closestDiff) return current;
        if (currentDiff === closestDiff) {
          const currentVol = current.volume ? Number(current.volume) : 0;
          const closestVol = closest.volume ? Number(closest.volume) : 0;
          return currentVol >= closestVol ? current : closest;
        }
        return closest;
      }, null);
    };

    // Professional options chain organizer for traders
    const organizeOptions = (calls, puts, strikeRange, futuresContract, currentStrikeValue, plusOneValue, minusOneValue) => {
      const rows = [];
      
      if (strikeRange === 'main') {
        if (futuresContract) {
          rows.push({
            segment: 'FUTURES',
            ltp: '-',
            change: '-',
            changePercent: '-',
            oi: '-',
            vol: '-',
            bid: '-',
            ask: '-',
            bidQty: '-',
            askQty: '-',
            indicator: 'header',
            isHeader: true,
            sectionType: 'futures'
          });

          const selectedFutures = futuresContract ? [futuresContract] : [];

          selectedFutures.forEach(future => {
            const change = future.change ? Number(future.change) : 0;
            const isBelowStrike = derivativesData.dailyStrikePrice && Number(future.lastPrice) < Number(derivativesData.dailyStrikePrice);
            rows.push({
              segment: future.tradingsymbol,
              ltp: future.lastPrice ? Number(future.lastPrice).toFixed(2) : '-',
              change: change.toFixed(2),
              changePercent: future.changePercent ? Number(future.changePercent).toFixed(2) : '-',
              oi: future.openInterest ? Number(future.openInterest).toLocaleString() : '-',
              vol: future.volume ? Number(future.volume).toLocaleString() : '-',
              bid: future.bid != null ? Number(future.bid).toFixed(2) : '-',
              ask: future.ask != null ? Number(future.ask).toFixed(2) : '-',
              bidQty: future.bidQuantity != null ? Number(future.bidQuantity).toLocaleString() : '-',
              askQty: future.askQuantity != null ? Number(future.askQuantity).toLocaleString() : '-',
              indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
              isBlinking: isBelowStrike,
              strikePrice: future.strikePrice,
              sectionType: 'futures',
              instrumentToken: future.instrumentToken,
              tradingsymbol: future.tradingsymbol
            });
          });
        }
        
        const closestCall = findClosestOption(calls, 'CE', currentStrikeValue);
        if (closestCall) {
          rows.push(buildOptionRow(closestCall, 'CALL @', 'calls'));
        } else {
          rows.push(buildInfoRow('CALL @ -', 'calls'));
        }

        const closestPut = findClosestOption(puts, 'PE', currentStrikeValue);
        if (closestPut) {
          rows.push(buildOptionRow(closestPut, 'PUT @', 'puts'));
        } else {
          rows.push(buildInfoRow('PUT @ -', 'puts'));
        }

        return rows;
      }

      if (strikeRange === 'minusOne') {
        const minusLabel = (typeof minusOneValue === 'number' && !isNaN(minusOneValue)) ? minusOneValue : 'N/A';
        rows.push({ 
          segment: `CALL OPTIONS (Strike: ${minusLabel})`,
          ltp: '-', 
          change: '-', 
          oi: '-', 
          vol: '-', 
          bid: '-', 
          ask: '-',
          bidQty: '-',
          askQty: '-',
          indicator: 'header',
          isHeader: true,
          sectionType: 'calls'
        });
        
        const minusCalls = calls.filter(call => (call.instrumentType || '').toUpperCase() === 'CE');
        if (minusCalls.length) {
          minusCalls.forEach(call => rows.push(buildOptionRow(call, call.tradingsymbol || 'CALL', 'calls')));
        } else {
          rows.push(buildInfoRow('    No call options available at this strike', 'calls'));
        }
        
        rows.push({ 
          segment: `PUT OPTIONS (Strike: ${minusLabel})`,
          ltp: '-', 
          change: '-', 
          oi: '-', 
          vol: '-', 
          bid: '-', 
          ask: '-',
          bidQty: '-',
          askQty: '-',
          indicator: 'header',
          isHeader: true,
          sectionType: 'puts'
        });
        
        const minusPuts = puts.filter(put => (put.instrumentType || '').toUpperCase() === 'PE');
        if (minusPuts.length) {
          minusPuts.forEach(put => rows.push(buildOptionRow(put, put.tradingsymbol || 'PUT', 'puts')));
        } else {
          rows.push(buildInfoRow('    No put options available at this strike', 'puts'));
        }

        return rows;
      }

      if (strikeRange === 'plusOne') {
        const plusLabel = (typeof plusOneValue === 'number' && !isNaN(plusOneValue)) ? plusOneValue : 'N/A';
        rows.push({ 
          segment: `CALL OPTIONS (Strike: ${plusLabel})`,
          ltp: '-', 
          change: '-', 
          oi: '-', 
          vol: '-', 
          bid: '-', 
          ask: '-',
          bidQty: '-',
          askQty: '-',
          indicator: 'header',
          isHeader: true,
          sectionType: 'calls'
        });
        
        const plusCalls = calls.filter(call => (call.instrumentType || '').toUpperCase() === 'CE');
        if (plusCalls.length) {
          plusCalls.forEach(call => rows.push(buildOptionRow(call, call.tradingsymbol || 'CALL', 'calls')));
        } else {
          rows.push(buildInfoRow('    No call options available at this strike', 'calls'));
        }
        
        rows.push({ 
          segment: `PUT OPTIONS (Strike: ${plusLabel})`,
          ltp: '-', 
          change: '-', 
          oi: '-', 
          vol: '-', 
          bid: '-', 
          ask: '-',
          bidQty: '-',
          askQty: '-',
          indicator: 'header',
          isHeader: true,
          sectionType: 'puts'
        });
        
        const plusPuts = puts.filter(put => (put.instrumentType || '').toUpperCase() === 'PE');
        if (plusPuts.length) {
          plusPuts.forEach(put => rows.push(buildOptionRow(put, put.tradingsymbol || 'PUT', 'puts')));
        } else {
          rows.push(buildInfoRow('    No put options available at this strike', 'puts'));
        }

        return rows;
      }
      
      return rows;
    };

    return {
      mainTable: organizeOptions(callsWindow, putsWindow, 'main', activeFuturesContract, currentStrike, plusOneStrike, minusOneStrike),
      minusOneTable: organizeOptions(callsMinusStrike, putsMinusStrike, 'minusOne', null, currentStrike, plusOneStrike, minusOneStrike),
      plusOneTable: organizeOptions(callsPlusStrike, putsPlusStrike, 'plusOne', null, currentStrike, plusOneStrike, minusOneStrike),
      referencePrice,
      currentStrike,
      plusOneStrike,
      minusOneStrike,
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
    if (derivativesData?.spotPrice == null) {
      return [];
    }

    return [{
      key: 'spot',
      label: 'Spot LTP',
      value: Number(derivativesData.spotPrice),
      format: (v) => `₹${Number(v).toLocaleString()}`,
      color: 'bg-green-500'
    }];
  }, [derivativesData?.spotPrice]);

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

    const buildOptionRow = (option, sectionType) => {
      if (!option) return null;
      const changeValue = option?.change != null ? Number(option.change) : 0;
      const indicator = changeValue > 0 ? 'up' : changeValue < 0 ? 'down' : 'neutral';
      const bidValue = option?.bid != null ? Number(option.bid).toFixed(2) : '-';
      const askValue = option?.ask != null ? Number(option.ask).toFixed(2) : '-';
      const bidQtyValue = option?.bidQuantity != null ? Number(option.bidQuantity).toLocaleString() : '-';
      const askQtyValue = option?.askQuantity != null ? Number(option.askQuantity).toLocaleString() : '-';

      return {
        segment: `    ${option.tradingsymbol || sectionType.toUpperCase()}`,
        ltp: option?.lastPrice != null ? Number(option.lastPrice).toFixed(2) : '-',
        change: option?.change != null ? changeValue.toFixed(2) : '-',
        changePercent: option?.changePercent != null ? Number(option.changePercent).toFixed(2) : '-',
        oi: option?.openInterest != null ? Number(option.openInterest).toLocaleString() : '-',
        vol: option?.volume != null ? Number(option.volume).toLocaleString() : '-',
        bid: bidValue,
        ask: askValue,
        bidQty: bidQtyValue,
        askQty: askQtyValue,
        indicator,
        isBlinking: false,
        strikePrice: option?.strikePrice,
        sectionType,
        instrumentToken: option?.instrumentToken,
        tradingsymbol: option?.tradingsymbol
      };
    };

    const pushSubSection = (label, sectionType) => {
      rows.push({
        segment: `  ${label}`,
        ltp: '-',
        change: '-',
        changePercent: '-',
        oi: '-',
        vol: '-',
        bid: '-',
        ask: '-',
        bidQty: '-',
        askQty: '-',
        indicator: 'subheader',
        isSubHeader: true,
        sectionType
      });
    };

    const pushInfoRow = (message, sectionType) => {
      rows.push({
        segment: `    ${message}`,
        ltp: '-',
        change: '-',
        changePercent: '-',
        oi: '-',
        vol: '-',
        bid: '-',
        ask: '-',
        bidQty: '-',
        askQty: '-',
        indicator: 'info',
        sectionType
      });
    };

    const appendSection = (sectionLabel, sectionType, datasets) => {
      rows.push({
        segment: sectionLabel,
        ltp: '-',
        change: '-',
        changePercent: '-',
        oi: '-',
        vol: '-',
        bid: '-',
        ask: '-',
        bidQty: '-',
        askQty: '-',
        indicator: 'header',
        isHeader: true,
        sectionType
      });

      datasets.forEach(({ label, collection }) => {
        pushSubSection(label, sectionType);
        if (!collection.length) {
          pushInfoRow(`No ${sectionType === 'calls' ? 'call' : 'put'} contracts`, sectionType);
        } else {
          collection.forEach(option => {
            const row = buildOptionRow(option, sectionType);
            if (row) rows.push(row);
          });
        }
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

    appendSection('CALL OPTIONS', 'calls', [
      { label: 'ITM', collection: callITMOption ? [callITMOption] : [] },
      { label: 'ATM', collection: callATMOption ? [callATMOption] : [] },
      { label: 'OTM', collection: callOTMOption ? [callOTMOption] : [] }
    ]);

    const putITMOption = findOption(putsList, strikeAbove, 'PE');
    const putATMOption = findOption(putsList, selectedStrike, 'PE');
    const putOTMOption = findOption(putsList, strikeBelow, 'PE');

    appendSection('PUT OPTIONS', 'puts', [
      { label: 'ITM', collection: putITMOption ? [putITMOption] : [] },
      { label: 'ATM', collection: putATMOption ? [putATMOption] : [] },
      { label: 'OTM', collection: putOTMOption ? [putOTMOption] : [] }
    ]);

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
    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
      <span className="hidden md:inline text-gray-500">
        Step: {formatStrikeValue(dynamicStrikeTable.strikeStep)}
      </span>
      {dynamicStrikeTable.firstStrike != null && (
        <span>{formatStrikeValue(dynamicStrikeTable.firstStrike)}</span>
      )}
      <input
        type="range"
        min={dynamicStrikeTable.sliderMin}
        max={dynamicStrikeTable.sliderMax}
        step={1}
        value={dynamicStrikeTable.sliderIndex}
        onChange={(event) => setDynamicStrikeIndex(Number(event.target.value))}
        className="w-28 sm:w-40"
        disabled={dynamicStrikeTable.sliderMax <= dynamicStrikeTable.sliderMin}
      />
      {dynamicStrikeTable.lastStrike != null && (
        <span>{formatStrikeValue(dynamicStrikeTable.lastStrike)}</span>
      )}
      <span className="font-semibold text-gray-700">
        Focus: {formatStrikeValue(dynamicStrikeTable.selectedStrike)}
      </span>
    </div>
  ) : null;

  if (!derivativesData) {
    return <div className="p-4 text-center">Loading derivatives data...</div>;
  }

  // Check if no real data is available
  if (derivativesData.dataSource === 'NO_DATA' || derivativesData.dataSource === 'ERROR' || derivativesData.totalContracts === 0) {
    return (
      <div className="p-8 text-center bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="text-yellow-600 dark:text-yellow-400 mb-4">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No Real Data Available</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Real-time derivatives data from Zerodha API is not available. 
            {derivativesData.dataSource === 'NO_DATA' && ' Please check Zerodha API configuration and access token.'}
            {derivativesData.dataSource === 'ERROR' && ' There was an error fetching data from the API.'}
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Data Source: {derivativesData.dataSource || 'Unknown'}
          </div>
        </div>
      </div>
    );
  }

  if (!activeFuturesContract) {
    return <div className="p-4 text-center">No futures contract available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Data Source Indicator */}
      {derivativesData.dataSource && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Data Source: {derivativesData.dataSource} | Total Contracts: {derivativesData.totalContracts}
        </div>
      )}

      {targetExpiry && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Options Expiry: {new Date(targetExpiry).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          {currentStrike ? ` | Reference Strike: ${currentStrike}` : ''}
        </div>
      )}
      
      {/* Main Table - All sections */}
      <FuturesTable 
        spot={derivativesData?.spotPrice ?? primaryFuturesPrice} 
        baseSymbol={activeFuturesContract?.tradingsymbol || 'NIFTY FUT'} 
        selectedContract={activeFuturesContract}
        summaryStats={headerStats}
        blinkEnabled={blinkEnabled}
        animateEnabled={animateEnabled}
        organizedData={mainTable}
      />
      
      {/* Below Spot Table - ITM Calls & OTM Puts */}
      <OptionsTable 
        title="BELOW SPOT (ITM Calls / OTM Puts)"
        data={minusOneTable}
        blinkEnabled={blinkEnabled}
        animateEnabled={animateEnabled}
        dailyStrikePrice={derivativesData.dailyStrikePrice}
        collapsible
        collapsed={minusStrikeCollapsed}
        onToggle={() => setMinusStrikeCollapsed(prev => !prev)}
      />
      
      {/* Above Spot Table - OTM Calls & ITM Puts */}
      <OptionsTable 
        title="ABOVE SPOT (OTM Calls / ITM Puts)"
        data={plusOneTable}
        blinkEnabled={blinkEnabled}
        animateEnabled={animateEnabled}
        dailyStrikePrice={derivativesData.dailyStrikePrice}
        collapsible
        collapsed={plusStrikeCollapsed}
        onToggle={() => setPlusStrikeCollapsed(prev => !prev)}
      />

      {/* Dynamic Strike Selection Table */}
      <OptionsTable
        title="DYNAMIC STRIKE (Calls & Puts ITM/ATM/OTM)"
        data={dynamicStrikeTable.rows}
        blinkEnabled={blinkEnabled}
        animateEnabled={animateEnabled}
        dailyStrikePrice={derivativesData.dailyStrikePrice}
        collapsible
        collapsed={dynamicTableCollapsed}
        onToggle={() => setDynamicTableCollapsed(prev => !prev)}
        headerExtras={dynamicSliderControl}
      />
    </div>
  );
}

export default DerivativesDashboard;
