import React from 'react';
import ContractSelector from './ContractSelector';

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
  onToggle
}) {
  const renderFavoritesContent = (closeButton = null) => (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">
      {closeButton}
      <div className="flex flex-col gap-6">
        {favorites.map(fav => (
          <div
            key={fav.symbol}
            onClick={() => onSelect(fav.symbol)}
            className={`cursor-pointer rounded-xl p-4 border transition-all duration-200 ${
              selected === fav.symbol
                ? 'border-blue-500 shadow-lg bg-white'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className={`text-lg font-bold ${
                    selected === fav.symbol ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {fav.symbol}
                </h3>
                <p
                  className={`text-sm ${
                    selected === fav.symbol ? 'text-blue-500' : 'text-gray-600'
                  }`}
                >
                  {fav.status}
                </p>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${
                  fav.status === 'Active'
                    ? selected === fav.symbol
                      ? 'bg-blue-500'
                      : 'bg-green-500'
                    : 'bg-gray-400'
                }`}
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
        className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 shadow-xl transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        {renderFavoritesContent(
          <div className="flex items-center justify-between pt-4 pr-4 pl-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Instruments
            </h2>
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
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
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 transition-all duration-300 overflow-hidden shadow-sm ${
          isOpen ? 'w-64 p-4' : 'w-14 p-3'
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="self-end inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
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
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10px] tracking-[0.3em] text-gray-500 dark:text-gray-400 rotate-90 uppercase">
              Instruments
            </span>
          </div>
        )}
      </aside>
    </>
  );
}
