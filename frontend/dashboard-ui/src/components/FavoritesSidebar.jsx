import React from 'react';
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

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-full transition-all duration-300 overflow-hidden shadow-sm ${sidebarBase} ${
          isOpen ? 'w-64 p-4' : 'w-14 p-3'
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className={`self-end inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${collapseButton}`}
          aria-label={isOpen ? 'Collapse instruments panel' : 'Expand instruments panel'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            )}
          </svg>
        </button>

        {isOpen ? (
          <div className="mt-4 flex-1">{renderFavoritesContent()}</div>
        ) : (
          <div className="flex-1 flex items-center justify-center relative">
          </div>
        )}
      </aside>
    </>
  );
}
