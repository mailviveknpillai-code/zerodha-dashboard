import React, { useState, useRef, useEffect } from 'react';
import ContractSelector from './ContractSelector';
import { useTheme } from '../contexts/ThemeContext';

const favorites = [
  { symbol: 'NIFTY', status: 'Active' },
];

export default function FavoritesSidebar({
  selected,
  onSelect,
  contracts,
  selectedContract,
  onContractSelect,
  isOpen,
  onToggle,
  derivativesData = null
}) {
  const { isDarkMode } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const sidebarRef = useRef(null);

  // Handle click outside to unpin
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isPinned && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsPinned(false);
      }
    };

    if (isPinned) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPinned]);

  // Determine if sidebar should be expanded
  const isExpanded = isPinned || isHovered;

  const sidebarBase = isDarkMode
    ? 'bg-slate-900 border-slate-700 text-slate-200'
    : 'bg-white border-gray-200 text-gray-900';

  const overlayColor = isDarkMode ? 'bg-black/40' : 'bg-black/20';
  const collapseButton = isDarkMode
    ? 'border-slate-600 text-slate-200 hover:bg-slate-700'
    : 'border-gray-200 text-gray-600 hover:bg-gray-100';

  const collapsedLabel = isDarkMode ? 'text-slate-300' : 'text-gray-500';

  const favoriteCardClasses = (isSelected) => {
    if (isSelected) {
      return isDarkMode
        ? 'border-blue-400 shadow-lg bg-slate-800 text-blue-200'
        : 'border-blue-500 shadow-lg bg-white text-gray-900';
    }
    return isDarkMode
      ? 'border-slate-700 hover:border-slate-500 hover:shadow-md bg-slate-900 text-slate-200'
      : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white text-gray-900';
  };

  // Determine if API is live based on dataSource
  const isApiLive = derivativesData?.dataSource === 'ZERODHA_KITE';
  const apiStatus = isApiLive ? 'Active' : 'Inactive';

  const statusDot = (fav, selected, isLive) => {
    if (!isLive) {
      // Inactive - orange dot
      return isDarkMode ? 'bg-orange-400' : 'bg-orange-500';
    }
    // Active - blue dot (when selected) or blue/green when not selected
    if (selected === fav.symbol) {
      return isDarkMode ? 'bg-blue-400' : 'bg-blue-500';
    }
    return isDarkMode ? 'bg-blue-400' : 'bg-blue-500';
  };

  const statusText = (fav, selected, isLive) => {
    if (!isLive) {
      // Inactive - orange text
      return isDarkMode ? 'text-orange-400' : 'text-orange-600';
    }
    // Active - blue text
    return isDarkMode
      ? selected === fav.symbol
        ? 'text-blue-200'
        : 'text-blue-300'
      : selected === fav.symbol
      ? 'text-blue-500'
      : 'text-blue-600';
  };

  const handleSidebarClick = () => {
    setIsPinned(true);
  };

  const renderFavoritesContent = (closeButton = null) => (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">
      {closeButton}
      <div className="flex flex-col gap-6">
        {favorites.map(fav => (
          <div
            key={fav.symbol}
            onClick={() => onSelect(fav.symbol)}
            className={`cursor-pointer rounded-xl p-4 border transition-all duration-200 ${favoriteCardClasses(selected === fav.symbol)}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {fav.symbol}
                </h3>
                <p
                  className={`text-sm ${statusText(fav, selected, isApiLive)}`}
                >
                  {apiStatus}
                </p>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${statusDot(fav, selected, isApiLive)}`}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {contracts && contracts.length > 0 && (
        <ContractSelector
          contracts={contracts}
          selectedContract={selectedContract}
          onContractSelect={onContractSelect}
        />
      )}
    </div>
  );

  const renderCollapsedIcons = () => (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Favorites Icon */}
      <div className={`p-2 rounded-lg ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} title="Instruments">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      {/* Contracts Icon */}
      <div className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`} title="Contracts">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile / Tablet overlay */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform ${sidebarBase} shadow-xl transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        {renderFavoritesContent(
          <div className="flex items-center justify-between pt-4 pr-4 pl-4">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
              Instruments
            </h2>
            <button
              type="button"
              onClick={onToggle}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                isDarkMode
                  ? 'border-slate-600 text-slate-200 hover:bg-slate-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="Close instruments panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </aside>
      {isOpen && (
        <div
          className={`fixed inset-0 z-30 ${overlayColor} backdrop-blur-sm lg:hidden`}
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar - Fixed position with hover/pin behavior - Floating panel look */}
      <aside
        ref={sidebarRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSidebarClick}
        className={`hidden lg:flex flex-col fixed left-3 top-20 bottom-1.5 z-30 transition-all duration-300 overflow-hidden rounded-2xl table-halo-border-strong backdrop-blur-xl ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-800/95 via-slate-800/90 to-indigo-900/20 text-slate-200' 
            : 'bg-gradient-to-br from-blue-50/95 via-purple-50/90 to-white/95 text-gray-900'
        } ${
          isExpanded ? 'w-64 p-4' : 'w-16 p-2'
        }`}
      >
        {isExpanded ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                Instruments
              </h2>
              {isPinned && (
                <div className={`p-1.5 rounded ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`} title="Pinned">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78.232 1.598 1.074 1.826.844.228 1.698-.232 1.948-1.012L8.96 10.27 5 10.274z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderFavoritesContent()}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            {renderCollapsedIcons()}
          </div>
        )}
      </aside>
    </>
  );
}
