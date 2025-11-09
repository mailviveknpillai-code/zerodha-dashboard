import React, { useEffect, useState, useRef } from 'react';
import { fetchDerivatives } from '../api/client';
import { useRefreshInterval } from '../contexts/RefreshIntervalContext';

export const TrendIcon = ({ direction }) => {
  if (direction === 'up') {
    return (
      <svg className="w-3 h-3 text-green-500 transition-transform duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="1 7 4.5 3.5 7 6 11 2" />
      </svg>
    );
  }
  if (direction === 'down') {
    return (
      <svg className="w-3 h-3 text-red-500 transition-transform duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="1 5 4.5 8.5 7 6 11 10" />
      </svg>
    );
  }
  return <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />;
};

export default function MarketSummary({ symbol }) {
  const [spot, setSpot] = useState(null);
  const [lotSize, setLotSize] = useState(null);
  const [expiry, setExpiry] = useState(null);
  const [volume, setVolume] = useState(null);
  const [spotTrend, setSpotTrend] = useState('flat');
  const [volumeTrend, setVolumeTrend] = useState('flat');
  const isFetchingRef = useRef(false);
  const refreshTimerRef = useRef(null);
  const previousSpotRef = useRef(null);
  const previousVolumeRef = useRef(null);
  const { intervalMs } = useRefreshInterval();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (isFetchingRef.current) {
          return;
        }
        isFetchingRef.current = true;
        // Use Zerodha API derivatives data
        const derivativesData = await fetchDerivatives(symbol);
        if (mounted && derivativesData) {
          if (derivativesData.spotPrice) {
            const nextSpot = Number(derivativesData.spotPrice);
            const previousSpot = previousSpotRef.current;
            if (previousSpot !== null && Number.isFinite(previousSpot)) {
              if (nextSpot > previousSpot) setSpotTrend('up');
              else if (nextSpot < previousSpot) setSpotTrend('down');
              else setSpotTrend('flat');
            }
            previousSpotRef.current = nextSpot;
            setSpot(nextSpot);
          }
          if (derivativesData.lotSize) {
            setLotSize(derivativesData.lotSize);
          }
          if (derivativesData.futures && derivativesData.futures.length > 0) {
            // Get the earliest expiry date
            const earliestFuture = derivativesData.futures.reduce((earliest, current) => {
              return new Date(current.expiryDate) < new Date(earliest.expiryDate) ? current : earliest;
            });
            setExpiry(new Date(earliestFuture.expiryDate).toLocaleDateString('en-GB'));
            const parsedVolume = Number(earliestFuture.volume);
            if (Number.isFinite(parsedVolume)) {
              const previousVolume = previousVolumeRef.current;
              if (previousVolume !== null && Number.isFinite(previousVolume)) {
                if (parsedVolume > previousVolume) setVolumeTrend('up');
                else if (parsedVolume < previousVolume) setVolumeTrend('down');
                else setVolumeTrend('flat');
              }
              previousVolumeRef.current = parsedVolume;
              setVolume(parsedVolume);
            }
          }
        }
      } catch (error) {
        console.error('Error loading spot price:', error);
      } finally {
        isFetchingRef.current = false;
      }
    };
    const scheduleNext = () => {
      if (!mounted) return;
      refreshTimerRef.current = setTimeout(async () => {
        await load();
        scheduleNext();
      }, intervalMs);
    };
    load().then(() => {
      if (mounted) {
        scheduleNext();
      }
    });
    return () => { 
      mounted = false; 
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      isFetchingRef.current = false;
    };
  }, [symbol, intervalMs]);

  const refreshLabel = `${(intervalMs / 1000).toFixed(2)}s`;

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl text-gray-900 mb-2">{symbol} — Equity</h2>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Underlying: <span className="font-semibold text-gray-900">{symbol}</span>
            </span>
            <span className="flex items-center gap-1">
              <TrendIcon direction={spotTrend} />
              Spot LTP: <span className="font-semibold text-black dark:text-gray-100">₹{spot ?? '—'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Lot size: <span className="font-semibold text-gray-900">{lotSize ?? '—'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Expiry: <span className="font-semibold text-gray-900">{expiry ?? '—'}</span>
            </span>
            <span className="flex items-center gap-1">
              <TrendIcon direction={volumeTrend} />
              Vol: <span className="font-semibold text-gray-900">{volume != null ? volume.toLocaleString() : '—'}</span>
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Auto Refresh</div>
          <div className="text-sm font-semibold text-blue-600">{refreshLabel}</div>
        </div>
      </div>
    </div>
  );
}
