import React from 'react';
import ContractSelector from './ContractSelector';

const favorites = [
  { symbol: 'NIFTY', status: 'Active' },
];

export default function FavoritesSidebar({ selected, onSelect, contracts, selectedContract, onContractSelect }) {
  return (
    <aside className="bg-white border-r border-gray-200 p-4 w-64 flex-shrink-0">
      {/* NIFTY Card */}
      <div className="mb-6">
        {favorites.map(fav => (
          <div
            key={fav.symbol}
            onClick={() => onSelect(fav.symbol)}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 ${
              selected === fav.symbol
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-bold ${
                  selected === fav.symbol ? 'text-white' : 'text-gray-900'
                }`}>
                  {fav.symbol}
                </h3>
                <p className={`text-sm ${
                  selected === fav.symbol ? 'text-blue-100' : 'text-gray-600'
                }`}>
                  {fav.status}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                fav.status === 'Active' 
                  ? selected === fav.symbol 
                    ? 'bg-white' 
                    : 'bg-green-500' 
                  : 'bg-gray-400'
              }`}></div>
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
    </aside>
  );
}
