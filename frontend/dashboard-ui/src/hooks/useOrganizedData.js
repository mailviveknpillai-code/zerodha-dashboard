import { useMemo } from 'react';
import { useFuturesContract } from './useFuturesContract';
import { useOptionsExpiry } from './useOptionsExpiry';
import { useStrikeCalculation } from './useStrikeCalculation';
import { useOptionSelection } from './useOptionSelection';
import { useOptionRowBuilder } from './useOptionRowBuilder';
import { formatStrikeValue } from '../utils/formatters';

/**
 * Custom hook to organize derivatives data into structured tables.
 * This is the main orchestrator hook that combines all sub-hooks.
 */
export function useOrganizedData(derivativesData, selectedContract, updateIncrementalVolume, updateEatenValues) {
  // Get futures contract information
  const { currentFuturesContract, activeFuturesContract, futuresPrice } = useFuturesContract(
    derivativesData,
    selectedContract
  );

  // Get options expiry and filtered options
  const { targetExpiry, calls, puts } = useOptionsExpiry(derivativesData, activeFuturesContract);

  // Calculate reference price (memoized to avoid recalculation)
  const referencePrice = useMemo(() => {
    const spotPrice = derivativesData?.spotPrice || null;
    return spotPrice || derivativesData?.dailyStrikePrice || futuresPrice || 0;
  }, [derivativesData?.spotPrice, derivativesData?.dailyStrikePrice, futuresPrice]);

  // Calculate strikes
  const {
    allStrikes,
    strikeStep,
    currentStrike,
    currentStrikeIndex,
    desiredPlusStrike,
    desiredMinusStrike,
  } = useStrikeCalculation(calls, puts, referencePrice);

  // Get option selection function
  const { selectOption } = useOptionSelection();

  // Get row builder functions
  const { buildOptionRow, buildInfoRow, buildHeaderRow, buildFuturesRow } = useOptionRowBuilder(
    updateIncrementalVolume,
    updateEatenValues
  );

  // Organize data into tables
  return useMemo(() => {
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
        targetExpiry: null,
        strikeList: [],
        atmIndex: -1,
        strikeStep: 50,
        callsForExpiry: [],
        putsForExpiry: [],
      };
    }

    // Sort options by strike
    const sortedCalls = [...calls].sort((a, b) => a.strikePrice - b.strikePrice);
    const sortedPuts = [...puts].sort((a, b) => a.strikePrice - b.strikePrice);

    // Select options for different strikes
    const atmCall = selectOption(sortedCalls, currentStrike, 'CE', 'closest');
    const atmPut = selectOption(sortedPuts, currentStrike, 'PE', 'closest');
    const belowCall = selectOption(sortedCalls, desiredMinusStrike, 'CE', 'closest');
    const belowPut = selectOption(sortedPuts, desiredMinusStrike, 'PE', 'closest');
    const aboveCall = selectOption(sortedCalls, desiredPlusStrike, 'CE', 'closest');
    const abovePut = selectOption(sortedPuts, desiredPlusStrike, 'PE', 'closest');
    const futuresRow = buildFuturesRow(activeFuturesContract);

    // Build main table (futures + ATM options)
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

    // Build below strike table
    const belowRows = [];
    const belowLabel = desiredMinusStrike != null ? formatStrikeValue(desiredMinusStrike) : 'N/A';
    belowRows.push(buildHeaderRow({
      badgeLabel: 'CALL / ITM',
      badgeTone: 'call-itm',
      segment: `Strike: ${belowLabel}`,
      sectionType: 'calls'
    }));
    if (belowCall) {
      const callRow = buildOptionRow(belowCall, 'calls', 'contract-only');
      callRow.badgeLabel = 'CALL / ITM';
      callRow.badgeTone = 'call-itm';
      belowRows.push(callRow);
    } else {
      belowRows.push(buildInfoRow('No call options available at this strike', 'calls'));
    }
    belowRows.push(buildHeaderRow({
      badgeLabel: 'PUT / OTM',
      badgeTone: 'put-otm',
      segment: `Strike: ${belowLabel}`,
      sectionType: 'puts'
    }));
    if (belowPut) {
      const putRow = buildOptionRow(belowPut, 'puts', 'contract-only');
      putRow.badgeLabel = 'PUT / OTM';
      putRow.badgeTone = 'put-otm';
      belowRows.push(putRow);
    } else {
      belowRows.push(buildInfoRow('No put options available at this strike', 'puts'));
    }

    // Build above strike table
    const aboveRows = [];
    const aboveLabel = desiredPlusStrike != null ? formatStrikeValue(desiredPlusStrike) : 'N/A';
    aboveRows.push(buildHeaderRow({
      badgeLabel: 'CALL / OTM',
      badgeTone: 'call-otm',
      segment: `Strike: ${aboveLabel}`,
      sectionType: 'calls'
    }));
    if (aboveCall) {
      const callRow = buildOptionRow(aboveCall, 'calls', 'contract-only');
      callRow.badgeLabel = 'CALL / OTM';
      callRow.badgeTone = 'call-otm';
      aboveRows.push(callRow);
    } else {
      aboveRows.push(buildInfoRow('No call options available at this strike', 'calls'));
    }
    aboveRows.push(buildHeaderRow({
      badgeLabel: 'PUT / ITM',
      badgeTone: 'put-itm',
      segment: `Strike: ${aboveLabel}`,
      sectionType: 'puts'
    }));
    if (abovePut) {
      const putRow = buildOptionRow(abovePut, 'puts', 'contract-only');
      putRow.badgeLabel = 'PUT / ITM';
      putRow.badgeTone = 'put-itm';
      aboveRows.push(putRow);
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
      putsForExpiry: sortedPuts,
    };
  }, [
    derivativesData,
    currentFuturesContract,
    activeFuturesContract,
    futuresPrice,
    targetExpiry,
    calls,
    puts,
    referencePrice,
    allStrikes,
    strikeStep,
    currentStrike,
    currentStrikeIndex,
    desiredPlusStrike,
    desiredMinusStrike,
    selectOption,
    buildOptionRow,
    buildInfoRow,
    buildHeaderRow,
    buildFuturesRow,
  ]);
}

