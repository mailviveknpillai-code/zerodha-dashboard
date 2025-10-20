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
  const [derivativesData, setDerivativesData] = useState(null);
  const mockData = useMemo(() => ({ spotLtp: 0, lotSize: 50, expiry: '30-Oct-2025' }), []);
  
  // Memoize selectedContract to prevent object recreation
  const memoizedSelectedContract = useMemo(() => selectedContract, [selectedContract?.tradingsymbol, selectedContract?.expiryDate]);
  
  console.log('🔄 DashboardLayout: Component rendered', {
    selected: selected,
    selectedContract: selectedContract?.tradingsymbol,
    contractsCount: contracts.length
  });

  // Load contracts and set default selection - only once on mount
  useEffect(() => {
    const loadContracts = async () => {
      try {
        console.log('🔄 DashboardLayout: Loading contracts...');
        const data = await fetchDerivatives('NIFTY', 25000);
        if (data && data.futures) {
          // Convert expiry dates to Date objects and sort by expiry
          const futuresWithDates = data.futures.map(future => ({
            ...future,
            expiryDate: new Date(future.expiryDate)
          })).sort((a, b) => a.expiryDate - b.expiryDate);
          
          setContracts(futuresWithDates);
          
          // Set the first contract (earliest expiry) as default
          if (futuresWithDates.length > 0) {
            setSelectedContract(futuresWithDates[0]);
          }
        }
      } catch (error) {
        console.error('Error loading contracts:', error);
      }
    };
    
    loadContracts();
  }, []); // Only run once on mount

  // Load derivatives data every 2 seconds
  useEffect(() => {
    const loadDerivatives = async () => {
      try {
        console.log('🔄 DashboardLayout: Loading derivatives data...');
        const data = await fetchDerivatives('NIFTY', 25000);
        setDerivativesData(data);
      } catch (error) {
        console.error('Error loading derivatives data:', error);
      }
    };
    
    loadDerivatives();
    const interval = setInterval(loadDerivatives, 2000);
    return () => clearInterval(interval);
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
              <MarketSummary symbol={selected} data={mockData} />
              <DerivativesDashboard 
                selectedContract={memoizedSelectedContract}
                blinkEnabled={blinkEnabled}
                animateEnabled={animateEnabled}
                derivativesData={derivativesData}
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
