import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import TopNavbar from './TopNavbar';
import FavoritesSidebar from './FavoritesSidebar';
import MarketSummary from './MarketSummary';
import DerivativesDashboard from './DerivativesDashboard';
import CollapsibleRightPanel from './CollapsibleRightPanel';
import { fetchDerivatives } from '../api/client';
import { REFRESH_INTERVAL_MS } from '../constants';

const DashboardLayout = memo(function DashboardLayout() {
  const [selected, setSelected] = useState('NIFTY');
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [blinkEnabled, setBlinkEnabled] = useState(true);
  const [animateEnabled, setAnimateEnabled] = useState(true);
  // Removed mockData - using real API data only
  
  // Memoize selectedContract to prevent object recreation
  const memoizedSelectedContract = useMemo(
    () => selectedContract,
    [selectedContract?.tradingsymbol, selectedContract?.expiryDate, selectedContract?.instrumentToken]
  );
  
  console.log('🔄 DashboardLayout: Component rendered', {
    selected: selected,
    selectedContract: selectedContract?.tradingsymbol,
    contractsCount: contracts.length
  });

  // Load derivatives data and set default contract - single useEffect
  useEffect(() => {
    let mounted = true;
    let intervalId = null;
    
    const loadDerivatives = async () => {
      try {
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
            .sort((a, b) => a.expiryDate - b.expiryDate);

          setContracts(futuresWithDates);

          setSelectedContract(prev => {
            if (!futuresWithDates.length) {
              return prev ?? null;
            }

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
        }
      } catch (error) {
        console.error('Error loading derivatives data:', error);
      }
    };
    
    // Load data immediately
    loadDerivatives();
    
    // Set up interval for updates
    intervalId = setInterval(() => {
      if (mounted) {
        loadDerivatives();
      }
    }, REFRESH_INTERVAL_MS);
    
    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []); // Only run once on mount

  const handleContractSelect = useCallback((contract) => {
    console.log('🔄 DashboardLayout: Contract selected:', contract?.tradingsymbol);
    setSelectedContract(contract);
  }, []);

  const handleBlinkToggle = useCallback(() => {
    setBlinkEnabled(prev => !prev);
  }, []);

  const handleAnimateToggle = useCallback(() => {
    setAnimateEnabled(prev => !prev);
  }, []);

  const handleToggleRightPanel = useCallback((isOpen) => {
    setIsRightPanelOpen(isOpen);
  }, []);

  const handleSelect = useCallback((symbol) => {
    setSelected(symbol);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNavbar onToggleRightPanel={handleToggleRightPanel} />
      <div className="flex">
        <FavoritesSidebar 
          selected={selected} 
          onSelect={handleSelect}
          contracts={contracts}
          selectedContract={selectedContract}
          onContractSelect={handleContractSelect}
        />
            <main className="flex-1 p-4 space-y-3">
              <MarketSummary symbol={selected} />
              <DerivativesDashboard 
                selectedContract={memoizedSelectedContract}
                blinkEnabled={blinkEnabled}
                animateEnabled={animateEnabled}
              />
            </main>
        {isRightPanelOpen && (
          <CollapsibleRightPanel 
            blinkEnabled={blinkEnabled}
            onBlinkToggle={handleBlinkToggle}
            animateEnabled={animateEnabled}
            onAnimateToggle={handleAnimateToggle}
          />
        )}
      </div>
    </div>
  );
});

export default DashboardLayout;
