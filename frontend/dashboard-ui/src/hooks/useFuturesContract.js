import { useMemo } from 'react';

/**
 * Custom hook to determine the active futures contract from derivatives data.
 * Handles filtering, sorting, and selection logic for futures contracts.
 */
export function useFuturesContract(derivativesData, selectedContract) {
  return useMemo(() => {
    if (!derivativesData) {
      return {
        currentFuturesContract: null,
        activeFuturesContract: null,
        futuresPrice: null,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter futures (exclude NIFTYNXT)
    const allFutures = (derivativesData.futures || [])
      .filter(f => (f.instrumentType || '').toUpperCase() === 'FUT' || (f.tradingsymbol || '').toUpperCase().includes('FUT'))
      .filter(f => !(f.tradingsymbol || '').toUpperCase().includes('NXT'));

    // Add date objects and timestamps
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

    // Sort by expiry
    const sortedFutures = futuresWithDates
      .sort((a, b) => a.expiryTimestamp - b.expiryTimestamp);

    // Find current month contract
    const currentFuturesContract = sortedFutures.find(f => f.expiryDateObj >= today) || sortedFutures[0] || null;

    // Match selected contract if provided
    let matchedSelectedFuture = null;
    if (selectedContract) {
      matchedSelectedFuture = sortedFutures.find(future => {
        const tokensMatch = selectedContract.instrumentToken && future.instrumentToken && 
          String(future.instrumentToken) === String(selectedContract.instrumentToken);
        const symbolsMatch = selectedContract.tradingsymbol && future.tradingsymbol && 
          future.tradingsymbol === selectedContract.tradingsymbol;
        return tokensMatch || symbolsMatch;
      }) || null;
    }

    const activeFuturesContract = matchedSelectedFuture || currentFuturesContract;
    const futuresPrice = activeFuturesContract?.lastPrice 
      ? Number(activeFuturesContract.lastPrice) 
      : (currentFuturesContract?.lastPrice ? Number(currentFuturesContract.lastPrice) : null);

    return {
      currentFuturesContract,
      activeFuturesContract,
      futuresPrice,
    };
  }, [derivativesData, selectedContract]);
}

