import React, { useState, useEffect } from 'react';
import { fetchDerivatives } from '../api/client';
import BackButton from './BackButton';

const DerivativesTable = ({ underlying = 'NIFTY' }) => {
  const [derivativesData, setDerivativesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState('ALL');

  useEffect(() => {
    loadDerivativesData();
    const interval = setInterval(loadDerivativesData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [underlying]);

  const loadDerivativesData = async () => {
    try {
      setLoading(true);
      const data = await fetchDerivatives(underlying);
      setDerivativesData(data);
      setError(null);
    } catch (err) {
      console.error('Error loading derivatives data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSegmentColor = (segment) => {
    switch (segment) {
      case 'FUTURES': return 'bg-blue-100 text-blue-800';
      case 'CALL_OPTIONS': return 'bg-green-100 text-green-800';
      case 'PUT_OPTIONS': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change, changePercent) => {
    if (!change) return '-';
    const isPositive = change >= 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    return (
      <span className={color}>
        {isPositive ? '+' : ''}{formatPrice(change)} ({isPositive ? '+' : ''}{formatPrice(changePercent)}%)
      </span>
    );
  };

  const formatExpiry = (expiryDate) => {
    if (!expiryDate) return '-';
    return new Date(expiryDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  };

  const getFilteredContracts = () => {
    if (!derivativesData) return [];
    
    const allContracts = [
      ...derivativesData.futures || [],
      ...derivativesData.callOptions || [],
      ...derivativesData.putOptions || []
    ];

    if (selectedSegment === 'ALL') return allContracts;
    
    return allContracts.filter(contract => contract.segment === selectedSegment);
  };

  const getSegmentStats = () => {
    if (!derivativesData) return {};
    
    return {
      futures: derivativesData.futures?.length || 0,
      callOptions: derivativesData.callOptions?.length || 0,
      putOptions: derivativesData.putOptions?.length || 0,
      total: (derivativesData.futures?.length || 0) + 
             (derivativesData.callOptions?.length || 0) + 
             (derivativesData.putOptions?.length || 0)
    };
  };

  if (loading && !derivativesData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading derivatives data</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={loadDerivativesData}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = getSegmentStats();
  const filteredContracts = getFilteredContracts();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 m-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {underlying} Derivatives Chain
              </h1>
              <div className="flex items-center gap-6 text-sm mt-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Spot: ₹{formatPrice(derivativesData?.spotPrice)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Last Updated: {derivativesData?.timestamp ? new Date(derivativesData.timestamp).toLocaleTimeString() : '-'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Data Source: <span className="font-medium text-gray-900 dark:text-gray-100">{derivativesData?.dataSource || 'Real-time'}</span>
            </div>
          </div>
        </div>

        {/* Segment Filter */}
        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedSegment('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedSegment === 'ALL' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-500'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setSelectedSegment('FUTURES')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedSegment === 'FUTURES' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-500'
              }`}
            >
              Futures ({stats.futures})
            </button>
            <button
              onClick={() => setSelectedSegment('CALL_OPTIONS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedSegment === 'CALL_OPTIONS' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-500'
              }`}
            >
              Calls ({stats.callOptions})
            </button>
            <button
              onClick={() => setSelectedSegment('PUT_OPTIONS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedSegment === 'PUT_OPTIONS' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-500'
              }`}
            >
              Puts ({stats.putOptions})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-100 dark:bg-slate-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Contract
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Segment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Strike
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  LTP
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Volume
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  OI
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Bid/Ask
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-600">
              {filteredContracts.map((contract, index) => (
                <tr key={contract.instrumentToken || index} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {contract.tradingsymbol}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {contract.instrumentType}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSegmentColor(contract.segment)}`}>
                      {contract.segment}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {contract.strikePrice ? formatPrice(contract.strikePrice) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatExpiry(contract.expiryDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                    {formatPrice(contract.lastPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatChange(contract.change, contract.changePercent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-right">
                    {contract.volume ? contract.volume.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-right">
                    {contract.openInterest ? formatPrice(contract.openInterest) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-right">
                    {contract.bid && contract.ask ? 
                      `${formatPrice(contract.bid)}/${formatPrice(contract.ask)}` : '-'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        
        {filteredContracts.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No contracts found for selected segment
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default DerivativesTable;
