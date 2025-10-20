import React, { useMemo, useEffect, useState, memo } from 'react';
import { fetchDerivatives } from '../api/client';
import FuturesTable from './FuturesTable';
import OptionsTable from './OptionsTable';

function DerivativesDashboard({ 
  selectedContract, 
  blinkEnabled, 
  animateEnabled,
  derivativesData
}) {
  console.log('🔄 DerivativesDashboard: Component rendered/re-mounted', {
    selectedContract: selectedContract?.tradingsymbol,
    blinkEnabled,
    animateEnabled,
    hasData: !!derivativesData
  });

  const organizedData = useMemo(() => {
    if (!derivativesData || !selectedContract) {
      return {
        mainTable: [],
        minusOneTable: [],
        plusOneTable: []
      };
    }

    const spotPrice = derivativesData.spotPrice || 25000;
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

    // Helper function to organize options by strike price
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
            bid: future.bid && future.ask ? `${Number(future.bid).toFixed(2)}/${Number(future.ask).toFixed(2)}` : '-',
            bidQty: future.bidQuantity && future.askQuantity ? `${Number(future.bidQuantity).toLocaleString()}/${Number(future.askQuantity).toLocaleString()}` : '-',
            indicator: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
            isBlinking: isBelowStrike,
            strikePrice: future.strikePrice,
            sectionType: 'futures'
          });
        });
      }
      
      // Filter options based on strike range
      let filteredCalls = calls;
      let filteredPuts = puts;
      
        if (strikeRange === 'minusOne') {
          // -50 table: strikes around spot - 50 (same range as main table but shifted)
          filteredCalls = calls.filter(opt => 
            opt.strikePrice >= spotPrice - 100 && opt.strikePrice <= spotPrice
          );
          filteredPuts = puts.filter(opt => 
            opt.strikePrice >= spotPrice - 100 && opt.strikePrice <= spotPrice
          );
        } else if (strikeRange === 'plusOne') {
          // +50 table: strikes around spot + 50 (same range as main table but shifted)
          filteredCalls = calls.filter(opt => 
            opt.strikePrice >= spotPrice && opt.strikePrice <= spotPrice + 100
          );
          filteredPuts = puts.filter(opt => 
            opt.strikePrice >= spotPrice && opt.strikePrice <= spotPrice + 100
          );
        } else {
          // Main table - options around spot price
          filteredCalls = calls.filter(opt => 
            opt.strikePrice >= spotPrice - 50 && opt.strikePrice <= spotPrice + 50
          );
          filteredPuts = puts.filter(opt => 
            opt.strikePrice >= spotPrice - 50 && opt.strikePrice <= spotPrice + 50
          );
        }
      
      // Add CALL OPTIONS header
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
      
      // Organize calls by ITM/ATM/OTM - all tables show same structure
      const callITM = filteredCalls.filter(call => call.strikePrice < spotPrice).sort((a, b) => b.strikePrice - a.strikePrice);
      // For ATM, find the closest strike to spot price
      const callATM = filteredCalls.length > 0 ? [filteredCalls.reduce((closest, current) => 
        Math.abs(current.strikePrice - spotPrice) < Math.abs(closest.strikePrice - spotPrice) ? current : closest
      )] : [];
      const callOTM = filteredCalls.filter(call => call.strikePrice > spotPrice).sort((a, b) => a.strikePrice - b.strikePrice);
      
      // Add sections
      [callITM, callATM, callOTM].forEach((section, index) => {
        const sectionName = ['ITM', 'ATM', 'OTM'][index];
        if (section.length > 0) {
          rows.push({ 
            segment: `  ${sectionName}`, 
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
          
          section.slice(0, 1).forEach(call => {
            const change = call.change ? Number(call.change) : 0;
            const isBelowStrike = derivativesData.dailyStrikePrice && Number(call.lastPrice) < Number(derivativesData.dailyStrikePrice);
            rows.push({
              segment: `    ${call.tradingsymbol}`,
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
        }
      });
      
      // Add PUT OPTIONS header
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
      
      // Organize puts by ITM/ATM/OTM - all tables show same structure
      const putITM = filteredPuts.filter(put => put.strikePrice > spotPrice).sort((a, b) => a.strikePrice - b.strikePrice);
      // For ATM, find the closest strike to spot price
      const putATM = filteredPuts.length > 0 ? [filteredPuts.reduce((closest, current) => 
        Math.abs(current.strikePrice - spotPrice) < Math.abs(closest.strikePrice - spotPrice) ? current : closest
      )] : [];
      const putOTM = filteredPuts.filter(put => put.strikePrice < spotPrice).sort((a, b) => b.strikePrice - a.strikePrice);
      
      // Add put sections
      [putITM, putATM, putOTM].forEach((section, index) => {
        const sectionName = ['ITM', 'ATM', 'OTM'][index];
        if (section.length > 0) {
          rows.push({ 
            segment: `  ${sectionName}`, 
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
          
          section.slice(0, 1).forEach(put => {
            const change = put.change ? Number(put.change) : 0;
            const isBelowStrike = derivativesData.dailyStrikePrice && Number(put.lastPrice) < Number(derivativesData.dailyStrikePrice);
            rows.push({
              segment: `    ${put.tradingsymbol}`,
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
      });
      
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

  if (!selectedContract) {
    return <div className="p-4 text-center">No contract selected</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Table - All sections */}
      <FuturesTable 
        spot={derivativesData.spotPrice} 
        baseSymbol="NIFTY FUT" 
        selectedContract={selectedContract}
        blinkEnabled={blinkEnabled}
        animateEnabled={animateEnabled}
        derivativesData={derivativesData}
        organizedData={organizedData.mainTable}
      />
      
      {/* -50 Unit Table */}
      <OptionsTable 
        title="-50"
        data={organizedData.minusOneTable}
        blinkEnabled={blinkEnabled}
        animateEnabled={animateEnabled}
        dailyStrikePrice={derivativesData.dailyStrikePrice}
      />
      
      {/* +50 Unit Table */}
      <OptionsTable 
        title="+50"
        data={organizedData.plusOneTable}
        blinkEnabled={blinkEnabled}
        animateEnabled={animateEnabled}
        dailyStrikePrice={derivativesData.dailyStrikePrice}
      />
    </div>
  );
}

export default DerivativesDashboard;
