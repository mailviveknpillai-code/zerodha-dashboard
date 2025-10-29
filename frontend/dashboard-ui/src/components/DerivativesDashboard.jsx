import React, { useMemo, useEffect, useState, memo } from 'react';
import { fetchDerivatives } from '../api/client';
import FuturesTable from './FuturesTable';
import OptionsTable from './OptionsTable';

function DerivativesDashboard({ 
  selectedContract, 
  blinkEnabled, 
  animateEnabled
}) {
  const [derivativesData, setDerivativesData] = useState(null);
  const [loading, setLoading] = useState(true);

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
            console.warn('⚠️ DerivativesDashboard: No real data available from Breeze API');
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
    }, 2000);
    
    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []); // Empty dependency array to prevent re-mounting

  const organizedData = useMemo(() => {
    if (!derivativesData || !selectedContract) {
      return {
        mainTable: [],
        minusOneTable: [],
        plusOneTable: []
      };
    }

    const spotPrice = derivativesData.spotPrice || null;
    const selectedExpiryDate = new Date(selectedContract.expiryDate).toISOString().split('T')[0];
    
    // Filter options by selected contract expiry
    const calls = (derivativesData.callOptions || []).filter(call => {
      const callExpiry = new Date(call.expiryDate).toISOString().split('T')[0];
      return callExpiry === selectedExpiryDate;
    });
    
    const puts = (derivativesData.putOptions || []).filter(put => {
      const putExpiry = new Date(put.expiryDate).toISOString().split('T')[0];
      return putExpiry === selectedExpiryDate;
    });

    // Professional options chain organizer for traders
    const organizeOptions = (calls, puts, spotPrice, strikeRange) => {
      const rows = [];
      
      // Add FUTURES section for main table only
      if (strikeRange === 'main') {
        rows.push({ 
          segment: 'FUTURES', 
          ltp: '-', 
          change: '-', 
          oi: '-', 
          vol: '-', 
          bid: '-', 
          bidQty: '-',
          indicator: 'header',
          isHeader: true,
          sectionType: 'futures'
        });
        
        // Add selected futures contract
        const selectedFutures = (derivativesData.futures || []).filter(future => {
          const futureExpiry = new Date(future.expiryDate).toISOString().split('T')[0];
          return futureExpiry === selectedExpiryDate;
        });
        
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
            bid: future.bid ? Number(future.bid).toFixed(2) : '-',
            ask: future.ask ? Number(future.ask).toFixed(2) : '-',
            bidQty: future.bidQuantity ? Number(future.bidQuantity).toLocaleString() : '-',
            askQty: future.askQuantity ? Number(future.askQuantity).toLocaleString() : '-',
            indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
            isBlinking: isBelowStrike,
            strikePrice: future.strikePrice,
            sectionType: 'futures'
          });
        });
      }
      
      // Filter options based on strike range for professional trading
      let filteredCalls = calls;
      let filteredPuts = puts;
      
        if (strikeRange === 'minusOne') {
        // -50 table: strikes below spot (ITM calls, OTM puts)
          filteredCalls = calls.filter(opt => 
          opt.strikePrice >= spotPrice - 100 && opt.strikePrice < spotPrice
          );
          filteredPuts = puts.filter(opt => 
          opt.strikePrice >= spotPrice - 100 && opt.strikePrice < spotPrice
          );
        } else if (strikeRange === 'plusOne') {
        // +50 table: strikes above spot (OTM calls, ITM puts)
          filteredCalls = calls.filter(opt => 
          opt.strikePrice > spotPrice && opt.strikePrice <= spotPrice + 100
          );
          filteredPuts = puts.filter(opt => 
          opt.strikePrice > spotPrice && opt.strikePrice <= spotPrice + 100
          );
        } else {
        // Main table - ATM strikes (±25 points around spot)
          filteredCalls = calls.filter(opt => 
          opt.strikePrice >= spotPrice - 25 && opt.strikePrice <= spotPrice + 25
          );
          filteredPuts = puts.filter(opt => 
          opt.strikePrice >= spotPrice - 25 && opt.strikePrice <= spotPrice + 25
        );
      }
      
      // Professional structure: Complete options chain for main table
      if (strikeRange === 'main') {
        // Main table: Complete options chain with ITM, ATM, OTM for both calls and puts
        
        // CALL OPTIONS - ITM, ATM, OTM
      rows.push({ 
        segment: 'CALL OPTIONS', 
        ltp: '-', 
        change: '-', 
        oi: '-', 
        vol: '-', 
        bid: '-', 
        bidQty: '-',
        indicator: 'header',
        isHeader: true,
        sectionType: 'calls'
      });
      
        // ITM Calls (strikes < spot)
        const itmCalls = filteredCalls.filter(call => call.strikePrice < spotPrice).sort((a, b) => b.strikePrice - a.strikePrice);
        if (itmCalls.length > 0) {
          rows.push({ 
            segment: '  ITM', 
            ltp: '-', 
            change: '-', 
            oi: '-', 
            vol: '-', 
            bid: '-', 
            bidQty: '-',
            indicator: 'subheader',
            isSubHeader: true,
            sectionType: 'calls'
          });
          
          itmCalls.slice(0, 2).forEach(call => { // Top 2 ITM calls
            const change = call.change ? Number(call.change) : 0;
            const isBelowStrike = derivativesData.dailyStrikePrice && Number(call.lastPrice) < Number(derivativesData.dailyStrikePrice);
            rows.push({
              segment: `    ${call.tradingsymbol}`,
              ltp: call.lastPrice ? Number(call.lastPrice).toFixed(2) : '-',
              change: change.toFixed(2),
              changePercent: call.changePercent ? Number(call.changePercent).toFixed(2) : '-',
              oi: call.openInterest ? Number(call.openInterest).toLocaleString() : '-',
              vol: call.volume ? Number(call.volume).toLocaleString() : '-',
              bid: call.bid ? Number(call.bid).toFixed(2) : '-',
              ask: call.ask ? Number(call.ask).toFixed(2) : '-',
              bidQty: call.bidQuantity ? Number(call.bidQuantity).toLocaleString() : '-',
              askQty: call.askQuantity ? Number(call.askQuantity).toLocaleString() : '-',
              indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
              isBlinking: isBelowStrike,
              strikePrice: call.strikePrice,
              sectionType: 'calls'
            });
          });
        }
        
        // ATM Calls (closest to spot)
        const atmCalls = filteredCalls.length > 0 ? [filteredCalls.reduce((closest, current) => 
        Math.abs(current.strikePrice - spotPrice) < Math.abs(closest.strikePrice - spotPrice) ? current : closest
      )] : [];
      
        if (atmCalls.length > 0) {
          rows.push({ 
            segment: '  ATM', 
            ltp: '-', 
            change: '-', 
            oi: '-', 
            vol: '-', 
            bid: '-', 
            bidQty: '-',
            indicator: 'subheader',
            isSubHeader: true,
            sectionType: 'calls'
          });
          
          atmCalls.forEach(call => {
            const change = call.change ? Number(call.change) : 0;
            const isBelowStrike = derivativesData.dailyStrikePrice && Number(call.lastPrice) < Number(derivativesData.dailyStrikePrice);
            rows.push({
              segment: `    ${call.tradingsymbol}`,
              ltp: call.lastPrice ? Number(call.lastPrice).toFixed(2) : '-',
              change: change.toFixed(2),
              changePercent: call.changePercent ? Number(call.changePercent).toFixed(2) : '-',
              oi: call.openInterest ? Number(call.openInterest).toLocaleString() : '-',
              vol: call.volume ? Number(call.volume).toLocaleString() : '-',
              bid: call.bid ? Number(call.bid).toFixed(2) : '-',
              ask: call.ask ? Number(call.ask).toFixed(2) : '-',
              bidQty: call.bidQuantity ? Number(call.bidQuantity).toLocaleString() : '-',
              askQty: call.askQuantity ? Number(call.askQuantity).toLocaleString() : '-',
              indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
              isBlinking: isBelowStrike,
              strikePrice: call.strikePrice,
              sectionType: 'calls'
            });
          });
        }
        
        // OTM Calls (strikes > spot)
        const otmCalls = filteredCalls.filter(call => call.strikePrice > spotPrice).sort((a, b) => a.strikePrice - b.strikePrice);
        if (otmCalls.length > 0) {
          rows.push({ 
            segment: '  OTM', 
            ltp: '-', 
            change: '-', 
            oi: '-', 
            vol: '-', 
            bid: '-', 
            bidQty: '-',
            indicator: 'subheader',
            isSubHeader: true,
            sectionType: 'calls'
          });
          
          otmCalls.slice(0, 2).forEach(call => { // Top 2 OTM calls
            const change = call.change ? Number(call.change) : 0;
            const isBelowStrike = derivativesData.dailyStrikePrice && Number(call.lastPrice) < Number(derivativesData.dailyStrikePrice);
            rows.push({
              segment: `    ${call.tradingsymbol}`,
              ltp: call.lastPrice ? Number(call.lastPrice).toFixed(2) : '-',
              change: change.toFixed(2),
              changePercent: call.changePercent ? Number(call.changePercent).toFixed(2) : '-',
              oi: call.openInterest ? Number(call.openInterest).toLocaleString() : '-',
              vol: call.volume ? Number(call.volume).toLocaleString() : '-',
              bid: call.bid ? Number(call.bid).toFixed(2) : '-',
              ask: call.ask ? Number(call.ask).toFixed(2) : '-',
              bidQty: call.bidQuantity ? Number(call.bidQuantity).toLocaleString() : '-',
              askQty: call.askQuantity ? Number(call.askQuantity).toLocaleString() : '-',
              indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
              isBlinking: isBelowStrike,
              strikePrice: call.strikePrice,
              sectionType: 'calls'
            });
          });
        }
        
        // PUT OPTIONS - ITM, ATM, OTM
      rows.push({ 
        segment: 'PUT OPTIONS', 
        ltp: '-', 
        change: '-', 
        oi: '-', 
        vol: '-', 
        bid: '-', 
        bidQty: '-',
        indicator: 'header',
        isHeader: true,
        sectionType: 'puts'
      });
      
        // ITM Puts (strikes > spot)
        const itmPuts = filteredPuts.filter(put => put.strikePrice > spotPrice).sort((a, b) => a.strikePrice - b.strikePrice);
        if (itmPuts.length > 0) {
          rows.push({ 
            segment: '  ITM', 
            ltp: '-', 
            change: '-', 
            oi: '-', 
            vol: '-', 
            bid: '-', 
            bidQty: '-',
            indicator: 'subheader',
            isSubHeader: true,
            sectionType: 'puts'
          });
          
          itmPuts.slice(0, 2).forEach(put => { // Top 2 ITM puts
            const change = put.change ? Number(put.change) : 0;
            const isBelowStrike = derivativesData.dailyStrikePrice && Number(put.lastPrice) < Number(derivativesData.dailyStrikePrice);
            rows.push({
              segment: `    ${put.tradingsymbol}`,
              ltp: put.lastPrice ? Number(put.lastPrice).toFixed(2) : '-',
              change: change.toFixed(2),
              changePercent: put.changePercent ? Number(put.changePercent).toFixed(2) : '-',
              oi: put.openInterest ? Number(put.openInterest).toLocaleString() : '-',
              vol: put.volume ? Number(put.volume).toLocaleString() : '-',
              bid: put.bid ? Number(put.bid).toFixed(2) : '-',
              ask: put.ask ? Number(put.ask).toFixed(2) : '-',
              bidQty: put.bidQuantity ? Number(put.bidQuantity).toLocaleString() : '-',
              askQty: put.askQuantity ? Number(put.askQuantity).toLocaleString() : '-',
              indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
              isBlinking: isBelowStrike,
              strikePrice: put.strikePrice,
              sectionType: 'puts'
            });
          });
        }
        
        // ATM Puts (closest to spot)
        const atmPuts = filteredPuts.length > 0 ? [filteredPuts.reduce((closest, current) => 
        Math.abs(current.strikePrice - spotPrice) < Math.abs(closest.strikePrice - spotPrice) ? current : closest
      )] : [];
        
        if (atmPuts.length > 0) {
          rows.push({ 
            segment: '  ATM', 
            ltp: '-', 
            change: '-', 
            oi: '-', 
            vol: '-', 
            bid: '-', 
            bidQty: '-',
            indicator: 'subheader',
            isSubHeader: true,
            sectionType: 'puts'
          });
          
          atmPuts.forEach(put => {
            const change = put.change ? Number(put.change) : 0;
            const isBelowStrike = derivativesData.dailyStrikePrice && Number(put.lastPrice) < Number(derivativesData.dailyStrikePrice);
            rows.push({
              segment: `    ${put.tradingsymbol}`,
              ltp: put.lastPrice ? Number(put.lastPrice).toFixed(2) : '-',
              change: change.toFixed(2),
              changePercent: put.changePercent ? Number(put.changePercent).toFixed(2) : '-',
              oi: put.openInterest ? Number(put.openInterest).toLocaleString() : '-',
              vol: put.volume ? Number(put.volume).toLocaleString() : '-',
              bid: put.bid ? Number(put.bid).toFixed(2) : '-',
              ask: put.ask ? Number(put.ask).toFixed(2) : '-',
              bidQty: put.bidQuantity ? Number(put.bidQuantity).toLocaleString() : '-',
              askQty: put.askQuantity ? Number(put.askQuantity).toLocaleString() : '-',
              indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
              isBlinking: isBelowStrike,
              strikePrice: put.strikePrice,
              sectionType: 'puts'
            });
          });
        }
        
        // OTM Puts (strikes < spot)
        const otmPuts = filteredPuts.filter(put => put.strikePrice < spotPrice).sort((a, b) => b.strikePrice - a.strikePrice);
        if (otmPuts.length > 0) {
          rows.push({ 
            segment: '  OTM', 
            ltp: '-', 
            change: '-', 
            oi: '-', 
            vol: '-', 
            bid: '-', 
            bidQty: '-',
            indicator: 'subheader',
            isSubHeader: true,
            sectionType: 'puts'
          });
          
          otmPuts.slice(0, 2).forEach(put => { // Top 2 OTM puts
            const change = put.change ? Number(put.change) : 0;
            const isBelowStrike = derivativesData.dailyStrikePrice && Number(put.lastPrice) < Number(derivativesData.dailyStrikePrice);
            rows.push({
              segment: `    ${put.tradingsymbol}`,
              ltp: put.lastPrice ? Number(put.lastPrice).toFixed(2) : '-',
              change: change.toFixed(2),
              changePercent: put.changePercent ? Number(put.changePercent).toFixed(2) : '-',
              oi: put.openInterest ? Number(put.openInterest).toLocaleString() : '-',
              vol: put.volume ? Number(put.volume).toLocaleString() : '-',
              bid: put.bid ? Number(put.bid).toFixed(2) : '-',
              ask: put.ask ? Number(put.ask).toFixed(2) : '-',
              bidQty: put.bidQuantity ? Number(put.bidQuantity).toLocaleString() : '-',
              askQty: put.askQuantity ? Number(put.askQuantity).toLocaleString() : '-',
              indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
              isBlinking: isBelowStrike,
              strikePrice: put.strikePrice,
              sectionType: 'puts'
            });
          });
        }
        
      } else if (strikeRange === 'minusOne') {
        // -50 table: ITM calls and OTM puts (below spot)
        rows.push({ 
          segment: 'CALL OPTIONS (ITM)', 
          ltp: '-', 
          change: '-', 
          oi: '-', 
          vol: '-', 
          bid: '-', 
          bidQty: '-',
          indicator: 'header',
          isHeader: true,
          sectionType: 'calls'
        });
        
        // ITM calls (strikes < spot)
        const itmCalls = filteredCalls.filter(call => call.strikePrice < spotPrice).sort((a, b) => b.strikePrice - a.strikePrice);
        itmCalls.slice(0, 3).forEach(call => { // Show top 3 ITM calls
          const change = call.change ? Number(call.change) : 0;
          const isBelowStrike = derivativesData.dailyStrikePrice && Number(call.lastPrice) < Number(derivativesData.dailyStrikePrice);
          rows.push({
            segment: call.tradingsymbol,
            ltp: call.lastPrice ? Number(call.lastPrice).toFixed(2) : '-',
            change: change.toFixed(2),
            changePercent: call.changePercent ? Number(call.changePercent).toFixed(2) : '-',
            oi: call.openInterest ? Number(call.openInterest).toLocaleString() : '-',
            vol: call.volume ? Number(call.volume).toLocaleString() : '-',
            bid: call.bid && call.ask ? `${Number(call.bid).toFixed(2)}/${Number(call.ask).toFixed(2)}` : '-',
            bidQty: call.bidQuantity && call.askQuantity ? `${Number(call.bidQuantity).toLocaleString()}/${Number(call.askQuantity).toLocaleString()}` : '-',
            indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
            isBlinking: isBelowStrike,
            strikePrice: call.strikePrice,
            sectionType: 'calls'
          });
        });
        
        rows.push({ 
          segment: 'PUT OPTIONS (OTM)', 
          ltp: '-', 
          change: '-', 
          oi: '-', 
          vol: '-', 
          bid: '-', 
          bidQty: '-',
          indicator: 'header',
          isHeader: true,
          sectionType: 'puts'
        });
        
        // OTM puts (strikes < spot)
        const otmPuts = filteredPuts.filter(put => put.strikePrice < spotPrice).sort((a, b) => b.strikePrice - a.strikePrice);
        otmPuts.slice(0, 3).forEach(put => { // Show top 3 OTM puts
          const change = put.change ? Number(put.change) : 0;
          const isBelowStrike = derivativesData.dailyStrikePrice && Number(put.lastPrice) < Number(derivativesData.dailyStrikePrice);
          rows.push({
            segment: put.tradingsymbol,
            ltp: put.lastPrice ? Number(put.lastPrice).toFixed(2) : '-',
            change: change.toFixed(2),
            changePercent: put.changePercent ? Number(put.changePercent).toFixed(2) : '-',
            oi: put.openInterest ? Number(put.openInterest).toLocaleString() : '-',
            vol: put.volume ? Number(put.volume).toLocaleString() : '-',
            bid: put.bid && put.ask ? `${Number(put.bid).toFixed(2)}/${Number(put.ask).toFixed(2)}` : '-',
            bidQty: put.bidQuantity && put.askQuantity ? `${Number(put.bidQuantity).toLocaleString()}/${Number(put.askQuantity).toLocaleString()}` : '-',
            indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
            isBlinking: isBelowStrike,
            strikePrice: put.strikePrice,
            sectionType: 'puts'
          });
        });
        
      } else if (strikeRange === 'plusOne') {
        // +50 table: OTM calls and ITM puts (above spot)
        rows.push({ 
          segment: 'CALL OPTIONS (OTM)', 
          ltp: '-', 
          change: '-', 
          oi: '-', 
          vol: '-', 
          bid: '-', 
          bidQty: '-',
          indicator: 'header',
          isHeader: true,
          sectionType: 'calls'
        });
        
        // OTM calls (strikes > spot)
        const otmCalls = filteredCalls.filter(call => call.strikePrice > spotPrice).sort((a, b) => a.strikePrice - b.strikePrice);
        otmCalls.slice(0, 3).forEach(call => { // Show top 3 OTM calls
          const change = call.change ? Number(call.change) : 0;
          const isBelowStrike = derivativesData.dailyStrikePrice && Number(call.lastPrice) < Number(derivativesData.dailyStrikePrice);
          rows.push({
            segment: call.tradingsymbol,
            ltp: call.lastPrice ? Number(call.lastPrice).toFixed(2) : '-',
            change: change.toFixed(2),
            changePercent: call.changePercent ? Number(call.changePercent).toFixed(2) : '-',
            oi: call.openInterest ? Number(call.openInterest).toLocaleString() : '-',
            vol: call.volume ? Number(call.volume).toLocaleString() : '-',
            bid: call.bid && call.ask ? `${Number(call.bid).toFixed(2)}/${Number(call.ask).toFixed(2)}` : '-',
            bidQty: call.bidQuantity && call.askQuantity ? `${Number(call.bidQuantity).toLocaleString()}/${Number(call.askQuantity).toLocaleString()}` : '-',
            indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
            isBlinking: isBelowStrike,
            strikePrice: call.strikePrice,
            sectionType: 'calls'
          });
        });
        
        rows.push({ 
          segment: 'PUT OPTIONS (ITM)', 
          ltp: '-', 
          change: '-', 
          oi: '-', 
          vol: '-', 
          bid: '-', 
          bidQty: '-',
          indicator: 'header',
          isHeader: true,
          sectionType: 'puts'
        });
        
        // ITM puts (strikes > spot)
        const itmPuts = filteredPuts.filter(put => put.strikePrice > spotPrice).sort((a, b) => a.strikePrice - b.strikePrice);
        itmPuts.slice(0, 3).forEach(put => { // Show top 3 ITM puts
          const change = put.change ? Number(put.change) : 0;
          const isBelowStrike = derivativesData.dailyStrikePrice && Number(put.lastPrice) < Number(derivativesData.dailyStrikePrice);
          rows.push({
            segment: put.tradingsymbol,
            ltp: put.lastPrice ? Number(put.lastPrice).toFixed(2) : '-',
            change: change.toFixed(2),
            changePercent: put.changePercent ? Number(put.changePercent).toFixed(2) : '-',
            oi: put.openInterest ? Number(put.openInterest).toLocaleString() : '-',
            vol: put.volume ? Number(put.volume).toLocaleString() : '-',
            bid: put.bid && put.ask ? `${Number(put.bid).toFixed(2)}/${Number(put.ask).toFixed(2)}` : '-',
            bidQty: put.bidQuantity && put.askQuantity ? `${Number(put.bidQuantity).toLocaleString()}/${Number(put.askQuantity).toLocaleString()}` : '-',
            indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
            isBlinking: isBelowStrike,
            strikePrice: put.strikePrice,
            sectionType: 'puts'
          });
        });
      }
      
      return rows;
    };

    return {
      mainTable: organizeOptions(calls, puts, spotPrice, 'main'),
      minusOneTable: organizeOptions(calls, puts, spotPrice, 'minusOne'),
      plusOneTable: organizeOptions(calls, puts, spotPrice, 'plusOne')
    };
  }, [derivativesData, selectedContract]);

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
            Real-time derivatives data from Breeze API is not available. 
            {derivativesData.dataSource === 'NO_DATA' && ' Please configure Breeze API credentials.'}
            {derivativesData.dataSource === 'ERROR' && ' There was an error fetching data from the API.'}
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Data Source: {derivativesData.dataSource || 'Unknown'}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedContract) {
    return <div className="p-4 text-center">No contract selected</div>;
  }

  return (
    <div className="space-y-6">
      {/* Data Source Indicator */}
      {derivativesData.dataSource && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Data Source: {derivativesData.dataSource} | Total Contracts: {derivativesData.totalContracts}
        </div>
      )}
      
      {/* Main Table - All sections */}
      <FuturesTable 
        spot={derivativesData?.spotPrice} 
        baseSymbol="NIFTY FUT" 
        selectedContract={selectedContract}
        blinkEnabled={blinkEnabled}
        animateEnabled={animateEnabled}
        organizedData={organizedData.mainTable}
      />
      
      {/* Below Spot Table - ITM Calls & OTM Puts */}
      <OptionsTable 
        title="BELOW SPOT (ITM Calls / OTM Puts)"
        data={organizedData.minusOneTable}
        blinkEnabled={blinkEnabled}
        animateEnabled={animateEnabled}
        dailyStrikePrice={derivativesData.dailyStrikePrice}
      />
      
      {/* Above Spot Table - OTM Calls & ITM Puts */}
      <OptionsTable 
        title="ABOVE SPOT (OTM Calls / ITM Puts)"
        data={organizedData.plusOneTable}
        blinkEnabled={blinkEnabled}
        animateEnabled={animateEnabled}
        dailyStrikePrice={derivativesData.dailyStrikePrice}
      />
    </div>
  );
}

export default DerivativesDashboard;
