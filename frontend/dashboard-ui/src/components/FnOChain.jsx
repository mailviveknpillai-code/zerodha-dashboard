import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useLatestDerivativesFeed from '../hooks/useLatestDerivativesFeed';
import { useRefreshInterval } from '../contexts/RefreshIntervalContext';
import { useNavigate } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import DataCell from './common/DataCell';
import { useContractColoringContext } from '../contexts/ContractColorContext';

export default function FnOChain() {
  const { isDarkMode } = useTheme();
  const { intervalMs } = useRefreshInterval();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const colorContext = useContractColoringContext();

  const { data: derivativesData, loading } = useLatestDerivativesFeed({
    symbol: 'NIFTY',
    intervalMs,
    onConnectionStatusChange: () => {},
    onAuthFailure: () => navigate('/', { replace: true }),
    fallbackToFullFetch: false,
  });

  // Format numbers
  const formatPrice = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value);
  };

  const formatInteger = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.round(numeric).toLocaleString() : String(value);
  };

  // Prepare all contracts for search and display
  const allContracts = useMemo(() => {
    if (!derivativesData) return [];

    const contracts = [];

    // Add futures
    if (Array.isArray(derivativesData.futures)) {
      derivativesData.futures.forEach(future => {
        contracts.push({
          type: 'FUTURE',
          category: 'Index Futures',
          tradingsymbol: future.tradingsymbol || '-',
          strikePrice: null,
          instrumentType: 'FUT',
          ltp: future.lastPrice,
          oi: future.openInterest,
          vol: future.volume,
          bid: future.bid,
          ask: future.ask,
          bidQty: future.bidQuantity,
          askQty: future.askQuantity,
          change: future.change,
          changePercent: future.changePercent,
          expiryDate: future.expiryDate,
        });
      });
    }

    // Add call options
    if (Array.isArray(derivativesData.callOptions)) {
      derivativesData.callOptions.forEach(call => {
        contracts.push({
          type: 'CALL',
          category: 'Index Options',
          tradingsymbol: call.tradingsymbol || '-',
          strikePrice: call.strikePrice,
          instrumentType: 'CE',
          ltp: call.lastPrice,
          oi: call.openInterest,
          vol: call.volume,
          bid: call.bid,
          ask: call.ask,
          bidQty: call.bidQuantity,
          askQty: call.askQuantity,
          change: call.change,
          changePercent: call.changePercent,
          expiryDate: call.expiryDate,
        });
      });
    }

    // Add put options
    if (Array.isArray(derivativesData.putOptions)) {
      derivativesData.putOptions.forEach(put => {
        contracts.push({
          type: 'PUT',
          category: 'Index Options',
          tradingsymbol: put.tradingsymbol || '-',
          strikePrice: put.strikePrice,
          instrumentType: 'PE',
          ltp: put.lastPrice,
          oi: put.openInterest,
          vol: put.volume,
          bid: put.bid,
          ask: put.ask,
          bidQty: put.bidQuantity,
          askQty: put.askQuantity,
          change: put.change,
          changePercent: put.changePercent,
          expiryDate: put.expiryDate,
        });
      });
    }

    return contracts;
  }, [derivativesData]);

  // Search functionality
  const filteredContracts = useMemo(() => {
    if (!searchQuery.trim()) return allContracts;

    const query = searchQuery.toLowerCase().trim();
    return allContracts.filter(contract => {
      const categoryMatch = contract.category.toLowerCase().includes(query);
      const symbolMatch = contract.tradingsymbol.toLowerCase().includes(query);
      const strikeMatch = contract.strikePrice !== null && String(contract.strikePrice).includes(query);
      const typeMatch = contract.type.toLowerCase().includes(query);
      
      return categoryMatch || symbolMatch || strikeMatch || typeMatch;
    });
  }, [allContracts, searchQuery]);

  // Generate search suggestions
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) {
      // Top suggestions when search bar is selected but empty
      const topSuggestions = [
        'Index Futures',
        'Index Options',
        'CALL',
        'PUT',
        ...allContracts.slice(0, 5).map(c => c.tradingsymbol)
      ];
      return [...new Set(topSuggestions)].slice(0, 8);
    }

    const query = searchQuery.toLowerCase().trim();
    const suggestionSet = new Set();

    // Add matching categories
    if ('index futures'.includes(query)) suggestionSet.add('Index Futures');
    if ('index options'.includes(query)) suggestionSet.add('Index Options');
    if ('call'.includes(query)) suggestionSet.add('CALL');
    if ('put'.includes(query)) suggestionSet.add('PUT');

    // Add matching contracts (limit to 10)
    allContracts
      .filter(c => 
        c.tradingsymbol.toLowerCase().includes(query) ||
        (c.strikePrice !== null && String(c.strikePrice).includes(query))
      )
      .slice(0, 10)
      .forEach(c => {
        suggestionSet.add(c.tradingsymbol);
        if (c.strikePrice !== null) {
          suggestionSet.add(String(c.strikePrice));
        }
      });

    return Array.from(suggestionSet).slice(0, 10);
  }, [searchQuery, allContracts]);

  // Group filtered contracts
  const groupedContracts = useMemo(() => {
    const groups = {
      futures: [],
      calls: [],
      puts: [],
    };

    filteredContracts.forEach(contract => {
      if (contract.type === 'FUTURE') {
        groups.futures.push(contract);
      } else if (contract.type === 'CALL') {
        groups.calls.push(contract);
      } else if (contract.type === 'PUT') {
        groups.puts.push(contract);
      }
    });

    // Sort futures by expiry
    groups.futures.sort((a, b) => {
      const dateA = a.expiryDate ? new Date(a.expiryDate) : new Date(0);
      const dateB = b.expiryDate ? new Date(b.expiryDate) : new Date(0);
      return dateA - dateB;
    });

    // Sort options by strike price
    groups.calls.sort((a, b) => {
      const strikeA = a.strikePrice || 0;
      const strikeB = b.strikePrice || 0;
      return strikeA - strikeB;
    });

    groups.puts.sort((a, b) => {
      const strikeA = a.strikePrice || 0;
      const strikeB = b.strikePrice || 0;
      return strikeA - strikeB;
    });

    return groups;
  }, [filteredContracts]);

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const calculateDeltaBA = (bidQty, askQty) => {
    if (bidQty === null || bidQty === undefined || askQty === null || askQty === undefined) return null;
    const bid = Number(bidQty);
    const ask = Number(askQty);
    if (!Number.isFinite(bid) || !Number.isFinite(ask)) return null;
    return bid - ask;
  };


  const containerClasses = isDarkMode
    ? 'min-h-screen bg-slate-900 text-slate-100'
    : 'min-h-screen bg-white text-slate-900';

  const tableClasses = isDarkMode
    ? 'bg-slate-800 border-slate-600 text-slate-200'
    : 'bg-white border-gray-200 text-gray-900';

  const headerClasses = isDarkMode
    ? 'bg-slate-700 text-slate-200'
    : 'bg-gray-50 text-gray-700';

  const rowClasses = isDarkMode
    ? 'border-slate-700 hover:bg-slate-700/50'
    : 'border-gray-200 hover:bg-gray-50';

  if (loading && !derivativesData) {
    return (
      <div className={containerClasses}>
        <TopNavbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Loading F&O Chain data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <TopNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className={`text-3xl font-bold mb-4 ${
            isDarkMode ? 'text-slate-100' : 'text-gray-900'
          }`}>
            F&O Chain
          </h1>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                setSelectedSuggestionIndex(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by category, contract name, or strike rate..."
              className={`w-full px-4 py-3 rounded-lg border text-sm ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'
              }`}
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className={`absolute z-50 w-full mt-1 rounded-lg border shadow-lg max-h-60 overflow-y-auto ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-600'
                  : 'bg-white border-gray-200'
              }`}>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`px-4 py-2 cursor-pointer text-sm ${
                      index === selectedSuggestionIndex
                        ? isDarkMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-900'
                        : isDarkMode
                        ? 'hover:bg-slate-700 text-slate-200'
                        : 'hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Index Futures Section */}
        {groupedContracts.futures.length > 0 && (
          <div className={`mb-8 rounded-xl border shadow-sm ${tableClasses}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-slate-200' : 'text-gray-900'
              }`}>
                Index Futures
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={headerClasses}>
                  <tr>
                    <th className="px-4 py-3 text-left">Contract</th>
                    <th className="px-4 py-3 text-right">LTP</th>
                    <th className="px-4 py-3 text-right">OI</th>
                    <th className="px-4 py-3 text-right">Vol</th>
                    <th className="px-4 py-3 text-right">Bid</th>
                    <th className="px-4 py-3 text-right">Ask</th>
                    <th className="px-4 py-3 text-right">Bid Qty</th>
                    <th className="px-4 py-3 text-right">ΔB/A QTY</th>
                    <th className="px-4 py-3 text-right">Ask Qty</th>
                    <th className="px-4 py-3 text-right">Change</th>
                    <th className="px-4 py-3 text-right">% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedContracts.futures.map((contract, index) => {
                    const deltaBA = calculateDeltaBA(contract.bidQty, contract.askQty);
                    const deltaBADisplay = deltaBA !== null ? (deltaBA > 0 ? `+${formatInteger(deltaBA)}` : formatInteger(deltaBA)) : '-';
                    return (
                      <tr key={index} className={`border-b ${rowClasses}`}>
                        <td className="px-4 py-3 text-left font-medium">{contract.tradingsymbol}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.ltp)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.oi)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.vol)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.bid)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.ask)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.bidQty)}</td>
                        <DataCell
                          value={deltaBA}
                          className="px-4 py-3 text-right tabular-nums"
                          displayValue={deltaBADisplay}
                          coloringMeta={contract.tradingsymbol ? { contractId: contract.tradingsymbol, fieldKey: 'deltaBA' } : null}
                        />
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.askQty)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.change)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{contract.changePercent ? `${contract.changePercent > 0 ? '+' : ''}${Number(contract.changePercent).toFixed(2)}%` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Index Options - CALL Section */}
        {groupedContracts.calls.length > 0 && (
          <div className={`mb-8 rounded-xl border shadow-sm ${tableClasses}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-slate-200' : 'text-gray-900'
              }`}>
                Index Options - CALL
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={headerClasses}>
                  <tr>
                    <th className="px-4 py-3 text-left">Contract</th>
                    <th className="px-4 py-3 text-right">Strike</th>
                    <th className="px-4 py-3 text-right">LTP</th>
                    <th className="px-4 py-3 text-right">OI</th>
                    <th className="px-4 py-3 text-right">Vol</th>
                    <th className="px-4 py-3 text-right">Bid</th>
                    <th className="px-4 py-3 text-right">Ask</th>
                    <th className="px-4 py-3 text-right">Bid Qty</th>
                    <th className="px-4 py-3 text-right">ΔB/A QTY</th>
                    <th className="px-4 py-3 text-right">Ask Qty</th>
                    <th className="px-4 py-3 text-right">Change</th>
                    <th className="px-4 py-3 text-right">% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedContracts.calls.map((contract, index) => {
                    const deltaBA = calculateDeltaBA(contract.bidQty, contract.askQty);
                    const deltaBADisplay = deltaBA !== null ? (deltaBA > 0 ? `+${formatInteger(deltaBA)}` : formatInteger(deltaBA)) : '-';
                    return (
                      <tr key={index} className={`border-b ${rowClasses}`}>
                        <td className="px-4 py-3 text-left font-medium">{contract.tradingsymbol}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.strikePrice)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.ltp)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.oi)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.vol)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.bid)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.ask)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.bidQty)}</td>
                        <DataCell
                          value={deltaBA}
                          className="px-4 py-3 text-right tabular-nums"
                          displayValue={deltaBADisplay}
                          coloringMeta={contract.tradingsymbol ? { contractId: contract.tradingsymbol, fieldKey: 'deltaBA' } : null}
                        />
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.askQty)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.change)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{contract.changePercent ? `${contract.changePercent > 0 ? '+' : ''}${Number(contract.changePercent).toFixed(2)}%` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Index Options - PUT Section */}
        {groupedContracts.puts.length > 0 && (
          <div className={`mb-8 rounded-xl border shadow-sm ${tableClasses}`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-slate-200' : 'text-gray-900'
              }`}>
                Index Options - PUT
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={headerClasses}>
                  <tr>
                    <th className="px-4 py-3 text-left">Contract</th>
                    <th className="px-4 py-3 text-right">Strike</th>
                    <th className="px-4 py-3 text-right">LTP</th>
                    <th className="px-4 py-3 text-right">OI</th>
                    <th className="px-4 py-3 text-right">Vol</th>
                    <th className="px-4 py-3 text-right">Bid</th>
                    <th className="px-4 py-3 text-right">Ask</th>
                    <th className="px-4 py-3 text-right">Bid Qty</th>
                    <th className="px-4 py-3 text-right">ΔB/A QTY</th>
                    <th className="px-4 py-3 text-right">Ask Qty</th>
                    <th className="px-4 py-3 text-right">Change</th>
                    <th className="px-4 py-3 text-right">% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedContracts.puts.map((contract, index) => {
                    const deltaBA = calculateDeltaBA(contract.bidQty, contract.askQty);
                    const deltaBADisplay = deltaBA !== null ? (deltaBA > 0 ? `+${formatInteger(deltaBA)}` : formatInteger(deltaBA)) : '-';
                    return (
                      <tr key={index} className={`border-b ${rowClasses}`}>
                        <td className="px-4 py-3 text-left font-medium">{contract.tradingsymbol}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.strikePrice)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.ltp)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.oi)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.vol)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.bid)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.ask)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.bidQty)}</td>
                        <DataCell
                          value={deltaBA}
                          className="px-4 py-3 text-right tabular-nums"
                          displayValue={deltaBADisplay}
                          coloringMeta={contract.tradingsymbol ? { contractId: contract.tradingsymbol, fieldKey: 'deltaBA' } : null}
                        />
                        <td className="px-4 py-3 text-right tabular-nums">{formatInteger(contract.askQty)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(contract.change)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{contract.changePercent ? `${contract.changePercent > 0 ? '+' : ''}${Number(contract.changePercent).toFixed(2)}%` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredContracts.length === 0 && !loading && (
          <div className={`text-center py-12 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {searchQuery ? 'No contracts found matching your search.' : 'No contracts available.'}
          </div>
        )}
      </div>
    </div>
  );
}

