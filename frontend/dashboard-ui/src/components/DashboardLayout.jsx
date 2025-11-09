import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import TopNavbar from './TopNavbar';
import FavoritesSidebar from './FavoritesSidebar';
import MarketSummary from './MarketSummary';
import DerivativesDashboard from './DerivativesDashboard';
import CollapsibleRightPanel from './CollapsibleRightPanel';
import { fetchDerivatives } from '../api/client';
import { useRefreshInterval } from '../contexts/RefreshIntervalContext';

const DashboardLayout = memo(function DashboardLayout() {
  const [selected, setSelected] = useState('NIFTY');
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const contractsFetchInFlight = useRef(false);
  const contractsTimerRef = useRef(null);
  const [connectionWarning, setConnectionWarning] = useState(null);
  const latestContractsRef = useRef([]);
  const { intervalMs } = useRefreshInterval();
  
  // Memoize selectedContract to prevent object recreation
  const memoizedSelectedContract = useMemo(
    () => selectedContract,
    [selectedContract?.tradingsymbol, selectedContract?.expiryDate, selectedContract?.instrumentToken]
  );
  
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsLeftPanelOpen(false);
    }
  }, []);
  console.log('🔄 DashboardLayout: Component rendered', {
    selected: selected,
    selectedContract: selectedContract?.tradingsymbol,
    contractsCount: contracts.length
  });

  // Load derivatives data and set default contract - single useEffect
  useEffect(() => {
    let mounted = true;
    
    const loadDerivatives = async () => {
      try {
        if (contractsFetchInFlight.current) {
          return;
        }
        contractsFetchInFlight.current = true;
        console.log('🔄 DashboardLayout: Loading derivatives data...');
        const data = await fetchDerivatives('NIFTY');
        
        if (mounted && data && Array.isArray(data.futures)) {
          console.log('🔄 DashboardLayout: Updating contracts list...');

          const futuresWithDates = data.futures
            .map(future => ({
              ...future,
              expiryDate: future.expiryDate instanceof Date
                ? future.expiryDate
                : new Date(future.expiryDate)
            }))
            .filter(future => !Number.isNaN(future.expiryDate?.getTime?.()))
            .sort((a, b) => a.expiryDate - b.expiryDate);

          if (futuresWithDates.length) {
            latestContractsRef.current = futuresWithDates;
            setContracts(futuresWithDates);
            setConnectionWarning(null);

            setSelectedContract(prev => {
              if (!prev) {
                console.log('🔄 DashboardLayout: Setting default contract:', futuresWithDates[0].tradingsymbol);
                return futuresWithDates[0];
              }

              const matched = futuresWithDates.find(future => {
                if (prev.instrumentToken && future.instrumentToken) {
                  return String(future.instrumentToken) === String(prev.instrumentToken);
                }
                if (prev.tradingsymbol && future.tradingsymbol) {
                  return future.tradingsymbol === prev.tradingsymbol;
                }
                return false;
              });

              return matched || futuresWithDates[0];
            });
          } else if (latestContractsRef.current.length) {
            console.warn('⚠️ DashboardLayout: Zerodha returned no futures; preserving previous list');
            setConnectionWarning(prev => prev ?? {
              type: 'no-data',
              message: 'Zerodha API temporarily returned no futures. Displaying the last known contracts.',
            });
            setContracts(latestContractsRef.current);
            setSelectedContract(prev => prev ?? latestContractsRef.current[0]);
          } else {
            setContracts([]);
            setSelectedContract(null);
            setConnectionWarning({
              type: 'no-data',
              message: 'No futures available from Zerodha yet. Waiting for live feed.',
            });
          }
        }
      } catch (error) {
        console.error('Error loading derivatives data:', error);
        setConnectionWarning({
          type: 'error',
          message: 'Failed to refresh futures list. Showing last known contracts.',
        });
        if (latestContractsRef.current.length) {
          setContracts(latestContractsRef.current);
          setSelectedContract(prev => prev ?? latestContractsRef.current[0]);
        }
      } finally {
        contractsFetchInFlight.current = false;
      }
    };
    
    // Load data immediately
    const scheduleNext = () => {
      if (!mounted) return;
      contractsTimerRef.current = setTimeout(async () => {
        await loadDerivatives();
        scheduleNext();
      }, intervalMs);
    };

    loadDerivatives().then(() => {
      if (mounted) {
        scheduleNext();
      }
    });
    
    return () => {
      mounted = false;
      if (contractsTimerRef.current) {
        clearTimeout(contractsTimerRef.current);
      }
      contractsFetchInFlight.current = false;
    };
  }, [intervalMs]);

  const handleContractSelect = useCallback((contract) => {
    console.log('🔄 DashboardLayout: Contract selected:', contract?.tradingsymbol);
    setSelectedContract(contract);
  }, []);


  const handleToggleRightPanel = useCallback((isOpen) => {
    setIsRightPanelOpen(isOpen);
  }, []);

  const handleToggleLeftPanel = useCallback(() => {
    setIsLeftPanelOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback((symbol) => {
    setSelected(symbol);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col">
      <TopNavbar onToggleRightPanel={handleToggleRightPanel} />
      <div className="flex-1 relative flex flex-col lg:flex-row">
        <FavoritesSidebar 
          selected={selected} 
          onSelect={handleSelect}
          contracts={contracts}
          selectedContract={selectedContract}
          onContractSelect={handleContractSelect}
          isOpen={isLeftPanelOpen}
          onToggle={handleToggleLeftPanel}
        />

        <main className="flex-1 w-full px-3 sm:px-4 lg:px-6 py-4 space-y-4 bg-white">
          <MarketSummary symbol={selected} />

          {connectionWarning && (
            <div className="flex justify-center">
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-semibold uppercase tracking-wide">Live data interrupted</p>
                  <p className="text-xs text-red-600 max-w-md">{connectionWarning.message}</p>
                </div>
              </div>
            </div>
          )}

      <DerivativesDashboard 
        selectedContract={memoizedSelectedContract} 
        onConnectionStatusChange={setConnectionWarning}
        connectionWarning={connectionWarning}
      />
        </main>

      {isRightPanelOpen && (
        <CollapsibleRightPanel />
      )}
      </div>
    </div>
  );
});

export default DashboardLayout;
