import React from 'react';

const LABEL_MAP = ['This Month', 'Next Month', 'Next+ Month'];

const normalizeContract = (contract) => {
  if (!contract) return null;
  const expiryDate = contract.expiryDate instanceof Date
    ? contract.expiryDate
    : new Date(contract.expiryDate);

  return {
    ...contract,
    expiryDate
  };
};

const getRelativeLabel = (expiryDate, index) => {
  if (!(expiryDate instanceof Date) || Number.isNaN(expiryDate.getTime())) {
    return LABEL_MAP[index] || 'Upcoming Contract';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthsDiff = (expiryDate.getFullYear() - today.getFullYear()) * 12 + (expiryDate.getMonth() - today.getMonth());

  if (monthsDiff <= 0) return 'This Month';
  if (monthsDiff === 1) return 'Next Month';
  if (monthsDiff === 2) return 'Next+ Month';

  return expiryDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const getContractStatus = (expiryDate) => {
  if (!(expiryDate instanceof Date) || Number.isNaN(expiryDate.getTime())) return 'expiring-later';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffInMs = expiryDate.getTime() - today.getTime();
  const daysToExpiry = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  if (daysToExpiry <= 7) return 'expiring-soon';
  if (daysToExpiry <= 30) return 'expiring-month';
  return 'expiring-later';
};

const formatExpiryDate = (expiryDate) => {
  if (!(expiryDate instanceof Date) || Number.isNaN(expiryDate.getTime())) return '—';
  return expiryDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit'
  });
};

export default function ContractSelector({ contracts, selectedContract, onContractSelect }) {
  const normalizedSelected = normalizeContract(selectedContract);

  const upcomingContracts = React.useMemo(() => {
    if (!contracts || contracts.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalizedContracts = contracts
      .map(normalizeContract)
      .filter(Boolean)
      .filter(contract => !String(contract.tradingsymbol || contract.instrumentToken || '').toUpperCase().includes('NXT'))
      .sort((a, b) => a.expiryDate - b.expiryDate);

    const futureContracts = normalizedContracts.filter(contract => contract.expiryDate >= today);

    return futureContracts.slice(0, 3);
  }, [contracts]);

  if (!upcomingContracts.length) {
    return null;
  }

  return (
    <div className="bg-white rounded border p-3 mb-4">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">Contract Expiry</h3>
      <div className="space-y-2">
        {upcomingContracts.map((contract, index) => {
          const isSelected = normalizedSelected &&
            normalizedSelected.expiryDate.getTime() === contract.expiryDate.getTime();
          const status = getContractStatus(contract.expiryDate);
          const label = getRelativeLabel(contract.expiryDate, index);

          return (
            <button
              key={`${contract.tradingsymbol || contract.instrumentToken}-${index}`}
              onClick={() => onContractSelect(contract)}
              className={`w-full text-left p-2 rounded text-xs transition-colors ${
                isSelected
                  ? 'bg-blue-100 border border-blue-300 text-blue-800'
                  : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-gray-500 text-xs">{contract.tradingsymbol || contract.instrumentToken}</div>
                  <div className="text-gray-400 text-xs">{formatExpiryDate(contract.expiryDate)}</div>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    status === 'expiring-soon'
                      ? 'bg-red-500'
                      : status === 'expiring-month'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  title={
                    status === 'expiring-soon'
                      ? 'Expires within 7 days'
                      : status === 'expiring-month'
                        ? 'Expires within 30 days'
                        : 'Expires later'
                  }
                ></div>
              </div>
            </button>
          );
        })}
      </div>

      {normalizedSelected && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <div className="font-medium">Selected Contract:</div>
            <div className="text-gray-500">
              {normalizedSelected.tradingsymbol || normalizedSelected.instrumentToken}
            </div>
            <div className="text-gray-400 text-xs">
              Expiry: {formatExpiryDate(normalizedSelected.expiryDate)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
