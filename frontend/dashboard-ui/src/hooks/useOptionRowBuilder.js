import { useCallback } from 'react';
import { formatPrice, formatInteger, formatStrikeValue, formatChange, formatChangePercent } from '../utils/formatters';

/**
 * Custom hook to build option and futures rows for display.
 * Handles data extraction, formatting, and row construction.
 */
export function useOptionRowBuilder(updateIncrementalVolume, updateEatenValues) {
  /**
   * Extract high/low values from option data.
   */
  const extractHighLow = useCallback((option, sectionType) => {
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
  }, []);

  /**
   * Build an option row for display.
   */
  const buildOptionRow = useCallback((option, sectionType, variant = 'default') => {
    const { highs, lows } = extractHighLow(option, sectionType);
    const baseBadgeLabel = sectionType === 'calls' ? 'CALL' : 'PUT';
    const badgeTone = sectionType === 'calls' ? 'call' : 'put';
    const strikeDisplay = option?.strikePrice != null ? Number(option.strikePrice).toFixed(0) : '-';
    const tradingsymbol = option?.tradingsymbol || '';
    const formattedStrike = option?.strikePrice != null ? formatStrikeValue(option.strikePrice) : '-';

    // Extract raw values
    const rawLastPrice = option?.lastPrice != null ? Number(option.lastPrice) : null;
    const rawChange = option?.change != null ? Number(option.change) : null;
    const rawChangePercent = option?.changePercent != null ? Number(option.changePercent) : null;
    const rawOi = option?.openInterest != null ? Number(option.openInterest) : null;
    const rawVol = option?.volume != null ? Number(option.volume) : null;
    const rawBid = option?.bid != null ? Number(option.bid) : null;
    const rawAsk = option?.ask != null ? Number(option.ask) : null;
    const rawBidQty = option?.bidQuantity != null ? Number(option.bidQuantity) : null;
    const rawAskQty = option?.askQuantity != null ? Number(option.askQuantity) : null;

    // Handle eatenDelta, bidEaten, askEaten with cache
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

    const cachedValues = instrumentToken 
      ? updateEatenValues(instrumentToken, backendEatenDelta, backendBidEaten, backendAskEaten)
      : { eatenDelta: backendEatenDelta, bidEaten: backendBidEaten, askEaten: backendAskEaten };

    const rawEatenDelta = cachedValues.eatenDelta;
    const rawBidEaten = cachedValues.bidEaten;
    const rawAskEaten = cachedValues.askEaten;

    // Determine segment label and badge
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

    // Calculate incremental volume
    const incrementalVolData = contractKey && rawVol !== null 
      ? updateIncrementalVolume(contractKey, rawVol)
      : { incrementalVol: 0, volumeChange: 0, displayValue: '-', rawValue: null };

    const changeDisplay = formatChange(option?.change);
    const changePercentDisplay = formatChangePercent(option?.changePercent);

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
      vol: incrementalVolData.displayValue,
      volRaw: incrementalVolData.rawValue,
      volChange: incrementalVolData.volumeChange,
      originalVol: rawVol,
      bid: rawBid != null ? formatPrice(rawBid) : '',
      bidRaw: rawBid,
      ask: rawAsk != null ? formatPrice(rawAsk) : '',
      askRaw: rawAsk,
      bidQty: rawBidQty != null ? formatInteger(rawBidQty) : '',
      bidQtyRaw: rawBidQty,
      askQty: rawAskQty != null ? formatInteger(rawAskQty) : '',
      askQtyRaw: rawAskQty,
      eatenDeltaRaw: rawEatenDelta,
      eatenDelta: rawEatenDelta != null ? formatInteger(Math.abs(rawEatenDelta)) : '',
      bidEatenRaw: rawBidEaten,
      askEatenRaw: rawAskEaten,
      ltpMovementDirection: option?.ltpMovementDirection || null,
      ltpMovementConfidence: option?.ltpMovementConfidence != null ? Number(option.ltpMovementConfidence) : null,
      ltpMovementIntensity: option?.ltpMovementIntensity || null,
      strikePrice: option?.strikePrice,
      sectionType,
      contractKey,
      instrumentToken: option?.instrumentToken,
      tradingsymbol: option?.tradingsymbol,
      highs,
      lows,
      badgeTone,
    };
  }, [updateIncrementalVolume, updateEatenValues, extractHighLow]);

  /**
   * Build an info row (placeholder row).
   */
  const buildInfoRow = useCallback((label, sectionType) => ({
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
    eatenDeltaRaw: null,
    eatenDelta: '',
    bidEatenRaw: null,
    askEatenRaw: null,
    sectionType,
    isInfoRow: true,
  }), []);

  /**
   * Build a header row.
   */
  const buildHeaderRow = useCallback(({ badgeLabel = null, segment, sectionType, badgeTone = sectionType === 'calls' ? 'call' : sectionType === 'puts' ? 'put' : 'neutral' }) => ({
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
    eatenDeltaRaw: null,
    eatenDelta: '',
    bidEatenRaw: null,
    askEatenRaw: null,
    sectionType
  }), []);

  /**
   * Build a futures row.
   */
  const buildFuturesRow = useCallback((future) => {
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

    // Handle eatenDelta, bidEaten, askEaten with cache
    const instrumentToken = future?.instrumentToken ? String(future.instrumentToken) : null;
    const backendEatenDelta = future?.eatenDelta != null && future?.eatenDelta !== undefined 
      ? Number(future.eatenDelta) 
      : null;
    const backendBidEaten = future?.bidEaten != null && future?.bidEaten !== undefined 
      ? Number(future.bidEaten) 
      : null;
    const backendAskEaten = future?.askEaten != null && future?.askEaten !== undefined 
      ? Number(future.askEaten) 
      : null;

    const cachedValues = instrumentToken 
      ? updateEatenValues(instrumentToken, backendEatenDelta, backendBidEaten, backendAskEaten)
      : { eatenDelta: backendEatenDelta, bidEaten: backendBidEaten, askEaten: backendAskEaten };

    const rawEatenDelta = cachedValues.eatenDelta;
    const rawBidEaten = cachedValues.bidEaten;
    const rawAskEaten = cachedValues.askEaten;

    // Calculate incremental volume
    const incrementalVolData = contractKey && rawVol !== null 
      ? updateIncrementalVolume(contractKey, rawVol)
      : { incrementalVol: 0, volumeChange: 0, displayValue: '-', rawValue: null };

    return {
      segment: future.tradingsymbol || 'NIFTY FUT',
      ltp: formatPrice(rawLastPrice),
      ltpRaw: rawLastPrice,
      change: formatChange(rawChange),
      changeRaw: rawChange,
      changePercent: formatChangePercent(rawChangePercent),
      changePercentRaw: rawChangePercent,
      oi: rawOi != null ? formatInteger(rawOi) : '',
      oiRaw: rawOi,
      vol: incrementalVolData.displayValue,
      volRaw: incrementalVolData.rawValue,
      volChange: incrementalVolData.volumeChange,
      originalVol: rawVol,
      bid: rawBid != null ? formatPrice(rawBid) : '',
      bidRaw: rawBid,
      ask: rawAsk != null ? formatPrice(rawAsk) : '',
      askRaw: rawAsk,
      bidQty: rawBidQty != null ? formatInteger(rawBidQty) : '',
      bidQtyRaw: rawBidQty,
      askQty: rawAskQty != null ? formatInteger(rawAskQty) : '',
      askQtyRaw: rawAskQty,
      eatenDeltaRaw: rawEatenDelta,
      eatenDelta: rawEatenDelta != null ? formatInteger(Math.abs(rawEatenDelta)) : '',
      bidEatenRaw: rawBidEaten,
      askEatenRaw: rawAskEaten,
      ltpMovementDirection: future?.ltpMovementDirection || null,
      ltpMovementConfidence: future?.ltpMovementConfidence != null ? Number(future.ltpMovementConfidence) : null,
      ltpMovementIntensity: future?.ltpMovementIntensity || null,
      sectionType: 'futures',
      instrumentToken: future.instrumentToken,
      tradingsymbol: future.tradingsymbol,
      contractKey,
    };
  }, [updateIncrementalVolume, updateEatenValues]);

  return {
    buildOptionRow,
    buildInfoRow,
    buildHeaderRow,
    buildFuturesRow,
  };
}

