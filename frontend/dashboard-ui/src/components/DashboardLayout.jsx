import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import TopNavbar from './TopNavbar';
import FavoritesSidebar from './FavoritesSidebar';
import MarketSummary from './MarketSummary';
import DerivativesDashboard from './DerivativesDashboard';
import CollapsibleRightPanel from './CollapsibleRightPanel';
import { useTheme } from '../contexts/ThemeContext';

const DashboardLayout = memo(function DashboardLayout() {
  const [selected, setSelected] = useState('NIFTY');
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [connectionWarning, setConnectionWarning] = useState(null);
  const [derivativesData, setDerivativesData] = useState(null);
  const { isDarkMode } = useTheme();
  
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

  // Extract contracts from derivatives data (single source of truth)
  useEffect(() => {
    if (derivativesData && Array.isArray(derivativesData.futures)) {
      const futuresWithDates = derivativesData.futures
        .map(future => ({
          ...future,
          expiryDate: future.expiryDate instanceof Date
            ? future.expiryDate
            : new Date(future.expiryDate)
        }))
        .filter(future => !Number.isNaN(future.expiryDate?.getTime?.()))
        .sort((a, b) => a.expiryDate - b.expiryDate);

      if (futuresWithDates.length) {
        setContracts(futuresWithDates);

        setSelectedContract(prev => {
          if (!prev) {
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
    }
  }, [derivativesData]);

  const handleContractSelect = useCallback((contract) => {
    console.log('🔄 DashboardLayout: Contract selected:', contract?.tradingsymbol);
    setSelectedContract(contract);
  }, []);



  const handleToggleLeftPanel = useCallback(() => {
    setIsLeftPanelOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback((symbol) => {
    setSelected(symbol);
  }, []);

  const layoutClasses = isDarkMode
    ? 'min-h-screen bg-slate-900 text-slate-100'
    : 'min-h-screen bg-white text-slate-900';

  const mainContainerClasses = isDarkMode
    ? 'flex-1 w-full px-3 sm:px-4 lg:px-6 py-4 space-y-4 bg-slate-900/20'
    : 'flex-1 w-full px-3 sm:px-4 lg:px-6 py-4 space-y-4 bg-white';

  const warningContainer = isDarkMode
    ? 'flex items-center gap-3 px-4 py-3 bg-red-900/20 border border-red-500/60 text-red-200 rounded-xl shadow-sm'
    : 'flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl shadow-sm';

  return (
    <div className={layoutClasses}>
      <TopNavbar />
      <div className="flex-1 relative flex flex-col lg:flex-row">
        <FavoritesSidebar 
          selected={selected} 
          onSelect={handleSelect}
          contracts={contracts}
          selectedContract={selectedContract}
          onContractSelect={handleContractSelect}
          isOpen={isLeftPanelOpen}
          onToggle={handleToggleLeftPanel}
          derivativesData={derivativesData}
        />

        <main className={mainContainerClasses}>
          <MarketSummary symbol={selected} derivativesData={derivativesData} />

          {connectionWarning && (
            <div className="flex justify-center">
              <div className={warningContainer}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-semibold uppercase tracking-wide">Live data interrupted</p>
                  <p className="text-xs max-w-md">{connectionWarning.message}</p>
                </div>
              </div>
            </div>
          )}

      <DerivativesDashboard 
        selectedContract={memoizedSelectedContract} 
        onConnectionStatusChange={setConnectionWarning}
        connectionWarning={connectionWarning}
        onDataUpdate={setDerivativesData}
      />
        </main>

        <CollapsibleRightPanel derivativesData={derivativesData} />
      </div>
    </div>
  );
});

export default DashboardLayout;
