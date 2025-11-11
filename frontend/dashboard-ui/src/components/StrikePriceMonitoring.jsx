import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStrikePriceMonitoring } from '../api/client';
import BackButton from './BackButton';
import { useRefreshInterval } from '../contexts/RefreshIntervalContext';
import DataCell from './common/DataCell';
import useContinuousPolling from '../hooks/useContinuousPolling';

export default function StrikePriceMonitoring() {
  const [monitoringData, setMonitoringData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isFetchingRef = useRef(false);
  const { intervalMs } = useRefreshInterval();

  const loadMonitoringData = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    try {
      const data = await fetchStrikePriceMonitoring('NIFTY');
      setMonitoringData(data);
      setLoading(false);
    } catch (error) {
      console.error('❌ StrikePriceMonitoring: Error loading data:', error);
      if (error?.response?.status === 401) {
        navigate('/', { replace: true });
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [navigate]);

  useContinuousPolling(loadMonitoringData, intervalMs, [navigate]);

  const renderContractRow = (contract, index) => {
    const change = contract.change ? Number(contract.change) : 0;
    const isBelowStrike = contract.strikePrice && Number(contract.lastPrice) < contract.strikePrice;
    const bid = contract.bid ?? contract.bestBid ?? null;
    const ask = contract.ask ?? contract.bestAsk ?? null;
    const bidQty = contract.bidQuantity ?? contract.bidQty ?? null;
    const askQty = contract.askQuantity ?? contract.askQty ?? null;
    const numericCellBase = 'py-3 px-4 text-right whitespace-nowrap tabular-nums font-mono data-cell leading-tight text-xs sm:text-sm';

    return (
      <tr key={index} className="border-b border-slate-200/70 dark:border-slate-600/60 last:border-0 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
        <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100 text-left">{contract.tradingsymbol}</td>
        <DataCell
          value={contract.lastPrice}
          metric="price"
          className={`${numericCellBase} font-semibold text-gray-900 dark:text-gray-100`}
          displayValue={contract.lastPrice != null ? Number(contract.lastPrice).toFixed(2) : '—'}
        />
        <DataCell
          value={contract.change}
          metric="price"
          className={`${numericCellBase}`}
          displayValue={change.toFixed(2)}
        />
        <DataCell
          value={contract.changePercent}
          metric="percent"
          className={`${numericCellBase}`}
          displayValue={contract.changePercent != null ? `${Number(contract.changePercent).toFixed(2)}%` : '—'}
        />
        <DataCell
          value={contract.openInterest}
          metric="oi"
          className={`${numericCellBase}`}
          displayValue={contract.openInterest != null ? Number(contract.openInterest).toLocaleString() : '—'}
        />
        <DataCell
          value={contract.volume}
          metric="volume"
          className={`${numericCellBase}`}
          displayValue={contract.volume != null ? Number(contract.volume).toLocaleString() : '—'}
        />
        <DataCell
          value={bid}
          metric="price"
          className={`${numericCellBase}`}
          displayValue={bid != null ? Number(bid).toFixed(2) : '—'}
        />
        <DataCell
          value={ask}
          metric="price"
          className={`${numericCellBase}`}
          displayValue={ask != null ? Number(ask).toFixed(2) : '—'}
        />
        <DataCell
          value={bidQty}
          metric="qty"
          className={`${numericCellBase}`}
          displayValue={bidQty != null ? Number(bidQty).toLocaleString() : '—'}
        />
        <DataCell
          value={askQty}
          metric="qty"
          className={`${numericCellBase}`}
          displayValue={askQty != null ? Number(askQty).toLocaleString() : '—'}
        />
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 m-4">
          <div className="flex items-center gap-4 mb-6">
            <BackButton />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Strike Price Monitoring</h1>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading monitoring data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!monitoringData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 m-4">
          <div className="flex items-center gap-4 mb-6">
            <BackButton />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Strike Price Monitoring</h1>
          </div>
          <div className="text-center py-8 text-red-500 dark:text-red-400">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-lg font-medium">No monitoring data available</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please check your connection and try again</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 m-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Strike Price Monitoring</h1>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Daily Strike: ₹{monitoringData.dailyStrikePrice}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Spot: ₹{monitoringData.spotPrice}</span>
            </div>
          </div>
        </div>
      
        <div className="space-y-6">
          {/* Monitoring Contracts (Around Strike) */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              ATM Options (At-The-Money)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs font-semibold">
                  <tr>
                    <th className="text-left px-4 py-3">Contract</th>
                    <th className="px-4 py-3 text-right">LTP</th>
                    <th className="px-4 py-3 text-right">Δ Price</th>
                    <th className="px-4 py-3 text-right">%Δ</th>
                    <th className="px-4 py-3 text-right">OI</th>
                    <th className="px-4 py-3 text-right">Vol</th>
                    <th className="px-4 py-3 text-right">Bid</th>
                    <th className="px-4 py-3 text-right">Ask</th>
                    <th className="px-4 py-3 text-right">Bid Qty</th>
                    <th className="px-4 py-3 text-right">Ask Qty</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {(() => {
                    const allContracts = [
                      ...(monitoringData.callOptions || []),
                      ...(monitoringData.putOptions || [])
                    ];
                    const aroundStrike = allContracts.filter(contract => {
                      const strike = contract.strikePrice || 0;
                      const spot = monitoringData.spotPrice || null;
                      return Math.abs(strike - spot) <= 50;
                    });
                    return aroundStrike.length > 0 ? 
                      aroundStrike.map((contract, index) => renderContractRow(contract, index)) :
                      <tr><td colSpan="10" className="text-center py-8 text-gray-500 dark:text-gray-400">No contracts around strike price</td></tr>;
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Above Strike Price */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Above Strike (OTM Calls / ITM Puts)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs font-semibold">
                  <tr>
                    <th className="text-left px-4 py-3">Contract</th>
                    <th className="px-4 py-3 text-right">LTP</th>
                    <th className="px-4 py-3 text-right">Δ Price</th>
                    <th className="px-4 py-3 text-right">%Δ</th>
                    <th className="px-4 py-3 text-right">OI</th>
                    <th className="px-4 py-3 text-right">Vol</th>
                    <th className="px-4 py-3 text-right">Bid</th>
                    <th className="px-4 py-3 text-right">Ask</th>
                    <th className="px-4 py-3 text-right">Bid Qty</th>
                    <th className="px-4 py-3 text-right">Ask Qty</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {(() => {
                    const allContracts = [
                      ...(monitoringData.callOptions || []),
                      ...(monitoringData.putOptions || [])
                    ];
                    const aboveStrike = allContracts.filter(contract => {
                      const strike = contract.strikePrice || 0;
                      const spot = monitoringData.spotPrice || null;
                      return strike > spot + 50;
                    });
                    return aboveStrike.length > 0 ? 
                      aboveStrike.map((contract, index) => renderContractRow(contract, index)) :
                      <tr><td colSpan="10" className="text-center py-8 text-gray-500 dark:text-gray-400">No contracts above strike price</td></tr>;
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Below Strike Price */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Below Strike (ITM Calls / OTM Puts)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs font-semibold">
                  <tr>
                    <th className="text-left px-4 py-3">Contract</th>
                    <th className="px-4 py-3 text-right">LTP</th>
                    <th className="px-4 py-3 text-right">Δ Price</th>
                    <th className="px-4 py-3 text-right">%Δ</th>
                    <th className="px-4 py-3 text-right">OI</th>
                    <th className="px-4 py-3 text-right">Vol</th>
                    <th className="px-4 py-3 text-right">Bid</th>
                    <th className="px-4 py-3 text-right">Ask</th>
                    <th className="px-4 py-3 text-right">Bid Qty</th>
                    <th className="px-4 py-3 text-right">Ask Qty</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {(() => {
                    const allContracts = [
                      ...(monitoringData.callOptions || []),
                      ...(monitoringData.putOptions || [])
                    ];
                    const belowStrike = allContracts.filter(contract => {
                      const strike = contract.strikePrice || 0;
                      const spot = monitoringData.spotPrice || null;
                      return strike < spot - 50;
                    });
                    return belowStrike.length > 0 ? 
                      belowStrike.map((contract, index) => renderContractRow(contract, index)) :
                      <tr><td colSpan="10" className="text-center py-8 text-gray-500 dark:text-gray-400">No contracts below strike price</td></tr>;
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
