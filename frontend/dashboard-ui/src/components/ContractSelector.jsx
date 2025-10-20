import React from 'react';

export default function ContractSelector({ contracts, selectedContract, onContractSelect }) {
  // Group contracts by month and get the earliest contract for each month
  const groupedContracts = React.useMemo(() => {
    if (!contracts || contracts.length === 0) return [];
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const groups = {
      thisMonth: [],
      nextMonth: [],
      nextPlusMonth: []
    };
    
    contracts.forEach(contract => {
      const expiry = new Date(contract.expiryDate);
      const contractMonth = expiry.getMonth();
      const contractYear = expiry.getFullYear();
      
      // Group by month relative to current month
      const monthsDiff = (contractYear - currentYear) * 12 + (contractMonth - currentMonth);
      
      if (monthsDiff === 1) { // Next month (current + 1)
        groups.thisMonth.push(contract);
      } else if (monthsDiff === 2) { // Month after next (current + 2)
        groups.nextMonth.push(contract);
      } else if (monthsDiff === 3) { // Month after that (current + 3)
        groups.nextPlusMonth.push(contract);
      }
    });
    
    // Return the earliest contract from each group
    return [
      { group: 'thisMonth', contract: groups.thisMonth.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0] },
      { group: 'nextMonth', contract: groups.nextMonth.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0] },
      { group: 'nextPlusMonth', contract: groups.nextPlusMonth.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0] }
    ].filter(item => item.contract); // Only include groups that have contracts
  }, [contracts]);

  const getContractDisplayName = (group) => {
    switch (group) {
      case 'thisMonth': return 'This Month';
      case 'nextMonth': return 'Next Month';
      case 'nextPlusMonth': return 'Next+ Month';
      default: return 'Unknown';
    }
  };

  const getContractStatus = (contract) => {
    const expiry = contract.expiryDate;
    const today = new Date();
    const daysToExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysToExpiry <= 7) {
      return 'expiring-soon';
    } else if (daysToExpiry <= 30) {
      return 'expiring-month';
    } else {
      return 'expiring-later';
    }
  };

  const formatExpiryDate = (contract) => {
    const expiry = contract.expiryDate;
    return expiry.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: '2-digit' 
    });
  };

  return (
    <div className="bg-white rounded border p-3 mb-4">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">Contract Expiry</h3>
      <div className="space-y-2">
        {groupedContracts.map(({ group, contract }, index) => {
          const isSelected = selectedContract && 
            selectedContract.expiryDate.getTime() === contract.expiryDate.getTime();
          const status = getContractStatus(contract);
          
          return (
            <button
              key={index}
              onClick={() => onContractSelect(contract)}
              className={`w-full text-left p-2 rounded text-xs transition-colors ${
                isSelected 
                  ? 'bg-blue-100 border border-blue-300 text-blue-800' 
                  : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{getContractDisplayName(group)}</div>
                  <div className="text-gray-500 text-xs">{contract.tradingsymbol || contract.instrumentToken}</div>
                  <div className="text-gray-400 text-xs">{formatExpiryDate(contract)}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  status === 'expiring-soon' ? 'bg-red-500' :
                  status === 'expiring-month' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`} title={
                  status === 'expiring-soon' ? 'Expires within 7 days' :
                  status === 'expiring-month' ? 'Expires within 30 days' :
                  'Expires later'
                }></div>
              </div>
            </button>
          );
        })}
      </div>
      
      {selectedContract && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <div className="font-medium">Selected Contract:</div>
            <div className="text-gray-500">
              {selectedContract.tradingsymbol || selectedContract.instrumentToken}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
