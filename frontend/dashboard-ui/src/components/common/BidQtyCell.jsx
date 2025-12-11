import React from 'react';
import { useContractColoring } from '../../contexts/ContractColorContext';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Bid Quantity Cell Component
 * Displays:
 * - Top: Bid Eaten bubble (oval, showing consumed bid quantity)
 * - Bottom: Bid Qty value
 * 
 * The bubble is not affected by color coding - it uses neutral colors.
 */
const BidQtyCell = ({
  bidQtyValue,
  bidQtyDisplay,
  bidEatenValue,
  className = '',
  coloringMeta = null,
  title = null,
}) => {
  const { isDarkMode } = useTheme();
  const { backgroundClass, haloClass } = useContractColoring(coloringMeta, bidQtyValue);

  const baseClasses = [
    'border-r',
    'last:border-r-0',
    isDarkMode ? 'border-slate-700/50' : 'border-slate-200/60',
  ];

  const composedClassName = [...baseClasses, className, backgroundClass, haloClass]
    .filter(Boolean)
    .join(' ');

  // Parse bid eaten value
  // IMPORTANT: 0 is a valid value (means no eaten quantity), null/undefined means no data
  let numericBidEaten = null;
  if (bidEatenValue !== null && bidEatenValue !== undefined) {
    const num = typeof bidEatenValue === 'number' 
      ? bidEatenValue 
      : Number(bidEatenValue);
    // Check for NaN explicitly - 0 is valid, so we check isNaN separately
    if (!isNaN(num) && isFinite(num)) {
      numericBidEaten = num; // 0 is a valid calculated value
    }
    // If NaN or not finite, keep as null (no data)
  }

  const hasValue = numericBidEaten !== null && numericBidEaten !== undefined && numericBidEaten > 0;
  const isZero = numericBidEaten !== null && numericBidEaten !== undefined && numericBidEaten === 0;

  // Format bid eaten for bubble (compact)
  const formatEaten = (val) => {
    if (val === null || val === undefined) return '0';
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toString();
  };

  // Bubble colors - neutral, not affected by cell coloring
  // Zero case: white background, black text
  const bubbleBgColor = isZero
    ? 'bg-white'
    : hasValue
    ? isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
    : isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100';

  const bubbleTextColor = isZero
    ? 'text-black'
    : hasValue
    ? isDarkMode ? 'text-red-400' : 'text-red-700'
    : isDarkMode ? 'text-slate-400' : 'text-gray-400';

  return (
    <td className={composedClassName} title={title || undefined}>
      <div className="flex flex-col items-end justify-center h-full py-1.5 min-h-[3.5rem]">
        {/* Top: Bid Eaten Bubble - Show when we have a value (including 0), show "-" when null */}
        {numericBidEaten !== null && numericBidEaten !== undefined ? (
          <div
            className={`flex items-center justify-center rounded-full px-2 py-0.5 mb-1.5 flex-shrink-0 ${bubbleBgColor} ${bubbleTextColor}`}
            style={{
              minWidth: '2.5rem',
              height: '1.5rem',
              borderRadius: '9999px',
            }}
          >
            <span className="text-xs font-bold leading-none">
              {formatEaten(numericBidEaten)}
            </span>
          </div>
        ) : (
          <div
            className={`flex items-center justify-center rounded-full px-2 py-0.5 mb-1.5 flex-shrink-0 ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'} ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}
            style={{
              minWidth: '2.5rem',
              height: '1.5rem',
              borderRadius: '9999px',
            }}
          >
            <span className="text-xs font-bold leading-none">—</span>
          </div>
        )}
        {/* Bottom: Bid Qty Value */}
        <div className={`text-right leading-tight w-full flex-1 flex items-end justify-end text-xs sm:text-sm overflow-hidden`}>
          <span className="block truncate w-full text-right font-semibold tabular-nums font-mono">
            {bidQtyDisplay ?? ''}
          </span>
        </div>
      </div>
    </td>
  );
};

export default BidQtyCell;

