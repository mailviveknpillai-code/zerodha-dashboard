import React from 'react';
import { useContractColoring } from '../../contexts/ContractColorContext';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Delta Bid/Ask Quantity Cell Component
 * Displays:
 * - Top: Eaten Delta bubble (oval, with +/- indicator)
 * - Bottom: ΔB/A QTY value (bidQty - askQty)
 * 
 * The bubble is not affected by color coding - it uses neutral colors.
 */
const DeltaBACell = ({
  deltaBAValue,
  deltaBADisplay,
  eatenDeltaValue,
  className = '',
  coloringMeta = null,
  title = null,
}) => {
  const { isDarkMode } = useTheme();
  const { backgroundClass, haloClass } = useContractColoring(coloringMeta, deltaBAValue);

  const baseClasses = [
    'border-r',
    'last:border-r-0',
    isDarkMode ? 'border-slate-700/50' : 'border-slate-200/60',
  ];

  // Color coding applies to the cell background, not the bubble
  const composedClassName = [...baseClasses, className, backgroundClass, haloClass]
    .filter(Boolean)
    .join(' ');

  // Parse eaten delta value
  // IMPORTANT: 0 is a valid value (means no eaten quantity), null/undefined means no data
  let numericEatenDelta = null;
  if (eatenDeltaValue !== null && eatenDeltaValue !== undefined) {
    // Handle both number and string inputs
    const num = typeof eatenDeltaValue === 'number' 
      ? eatenDeltaValue 
      : Number(eatenDeltaValue);
    // Check for NaN explicitly - 0 is valid, so we check isNaN separately
    if (!isNaN(num) && isFinite(num)) {
      // Valid number (including 0) - 0 is a valid calculated value
      numericEatenDelta = num;
    }
    // If NaN or not finite, keep as null (no data)
  }
  
  // Debug logging - log to help diagnose (only in development or when value is unexpected)
  if (process.env.NODE_ENV === 'development' || (eatenDeltaValue !== null && eatenDeltaValue !== undefined && numericEatenDelta === null)) {
    console.debug('[DeltaBACell] eatenDeltaValue:', eatenDeltaValue, 'numericEatenDelta:', numericEatenDelta, 'type:', typeof eatenDeltaValue, 'shouldShow:', numericEatenDelta !== null);
  }

  // Determine sign and absolute value for eaten delta
  const isPositive = numericEatenDelta !== null && numericEatenDelta > 0;
  const isNegative = numericEatenDelta !== null && numericEatenDelta < 0;
  const isZero = numericEatenDelta !== null && numericEatenDelta === 0;
  const absEatenDelta = numericEatenDelta !== null ? Math.abs(numericEatenDelta) : null;

  // Format eaten delta for bubble (compact)
  const formatEatenDelta = (val) => {
    if (val === null || val === undefined) return '0';
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toString();
  };

  // Bubble colors - neutral, not affected by cell coloring
  // Zero case: white background, black text
  const bubbleBgColor = isZero
    ? 'bg-white'
    : isPositive
    ? isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
    : isNegative
    ? isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
    : isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100';

  const bubbleTextColor = isZero
    ? 'text-black'
    : isPositive
    ? isDarkMode ? 'text-green-400' : 'text-green-700'
    : isNegative
    ? isDarkMode ? 'text-red-400' : 'text-red-700'
    : isDarkMode ? 'text-slate-400' : 'text-gray-600';

  // Always show bubble if we have a value (including 0)
  // Debug: Log to verify value is received
  if (eatenDeltaValue !== null && eatenDeltaValue !== undefined) {
    console.debug('[DeltaBACell] eatenDeltaValue received:', eatenDeltaValue, 'numericEatenDelta:', numericEatenDelta);
  }

  return (
    <td className={composedClassName} title={title || undefined}>
      <div className="flex flex-col items-end justify-center h-full py-1.5 min-h-[3.5rem]">
        {/* Top: Eaten Delta Bubble (not affected by cell coloring) */}
        {/* Show bubble only when we have a valid value (including 0) */}
        {/* Show "-" placeholder when value is null/undefined (no data) */}
        {numericEatenDelta !== null && numericEatenDelta !== undefined ? (
          <div
            className={`flex items-center justify-center rounded-full px-2 py-0.5 mb-1.5 flex-shrink-0 ${bubbleBgColor} ${bubbleTextColor}`}
            style={{
              minWidth: '2.5rem',
              height: '1.5rem',
              borderRadius: '9999px', // Oval shape
            }}
          >
            <span className="text-xs font-bold leading-none">
              {isZero 
                ? '0' 
                : isPositive 
                ? '+' + formatEatenDelta(absEatenDelta) 
                : '−' + formatEatenDelta(absEatenDelta)}
            </span>
          </div>
        ) : (
          // Show placeholder bubble when value is null/undefined (no data available)
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
        {/* Bottom: ΔB/A QTY Value (main content) */}
        <div className={`text-right leading-tight w-full flex-1 flex items-end justify-end text-xs sm:text-sm overflow-hidden`}>
          <span className="block truncate w-full text-right font-semibold tabular-nums font-mono">
            {deltaBADisplay ?? ''}
          </span>
        </div>
      </div>
    </td>
  );
};

export default DeltaBACell;

