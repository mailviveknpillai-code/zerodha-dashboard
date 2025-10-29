import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import FavoritesSidebar from './FavoritesSidebar';
import MarketSummary from './MarketSummary';
import DerivativesDashboard from './DerivativesDashboard';
import CollapsibleRightPanel from './CollapsibleRightPanel';
import { fetchDerivatives } from '../api/client';

const DashboardLayout = memo(function DashboardLayout() {
  const [selected, setSelected] = useState('NIFTY');
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [blinkEnabled, setBlinkEnabled] = useState(true);
  const [animateEnabled, setAnimateEnabled] = useState(true);
  // Removed mockData - using real API data only
  
  // Memoize selectedContract to prevent object recreation
  const memoizedSelectedContract = useMemo(() => selectedContract, [selectedContract?.tradingsymbol, selectedContract?.expiryDate]);
  
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
        
        if (mounted) {
          // Set contracts and default selection only on first load
          if (data && data.futures && contracts.length === 0) {
            console.log('🔄 DashboardLayout: Setting up contracts...');
            // Convert expiry dates to Date objects and sort by expiry
            const futuresWithDates = data.futures.map(future => ({
              ...future,
              expiryDate: new Date(future.expiryDate)
            })).sort((a, b) => a.expiryDate - b.expiryDate);
            
            setContracts(futuresWithDates);
            
            // Set the first contract (earliest expiry - current month) as default
            if (futuresWithDates.length > 0 && !selectedContract) {
              console.log('🔄 DashboardLayout: Setting default contract:', futuresWithDates[0].tradingsymbol);
              setSelectedContract(futuresWithDates[0]);
            }
          }
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
    }, 2000);
    
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
