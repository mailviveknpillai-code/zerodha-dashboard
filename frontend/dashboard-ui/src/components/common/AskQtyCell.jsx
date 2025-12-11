import React from 'react';
import { useContractColoring } from '../../contexts/ContractColorContext';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Ask Quantity Cell Component
 * Displays:
 * - Top: Ask Eaten bubble (oval, showing consumed ask quantity)
 * - Bottom: Ask Qty value
 * 
 * The bubble is not affected by color coding - it uses neutral colors.
 */
const AskQtyCell = ({
  askQtyValue,
  askQtyDisplay,
  askEatenValue,
  className = '',
  coloringMeta = null,
  title = null,
}) => {
  const { isDarkMode } = useTheme();
  const { backgroundClass, haloClass } = useContractColoring(coloringMeta, askQtyValue);

  const baseClasses = [
    'border-r',
    'last:border-r-0',
    isDarkMode ? 'border-slate-700/50' : 'border-slate-200/60',
  ];

  const composedClassName = [...baseClasses, className, backgroundClass, haloClass]
    .filter(Boolean)
    .join(' ');

  // Parse ask eaten value
  // IMPORTANT: 0 is a valid value (means no eaten quantity), null/undefined means no data
  let numericAskEaten = null;
  if (askEatenValue !== null && askEatenValue !== undefined) {
    const num = typeof askEatenValue === 'number' 
      ? askEatenValue 
      : Number(askEatenValue);
    // Check for NaN explicitly - 0 is valid, so we check isNaN separately
    if (!isNaN(num) && isFinite(num)) {
      numericAskEaten = num; // 0 is a valid calculated value
    }
    // If NaN or not finite, keep as null (no data)
  }

  const hasValue = numericAskEaten !== null && numericAskEaten !== undefined && numericAskEaten > 0;
  const isZero = numericAskEaten !== null && numericAskEaten !== undefined && numericAskEaten === 0;

  // Format ask eaten for bubble (compact)
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
    ? isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
    : isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100';

  const bubbleTextColor = isZero
    ? 'text-black'
    : hasValue
    ? isDarkMode ? 'text-green-400' : 'text-green-700'
    : isDarkMode ? 'text-slate-400' : 'text-gray-400';

  return (
    <td className={composedClassName} title={title || undefined}>
      <div className="flex flex-col items-end justify-center h-full py-1.5 min-h-[3.5rem]">
        {/* Top: Ask Eaten Bubble - Show when we have a value (including 0), show "-" when null */}
        {numericAskEaten !== null && numericAskEaten !== undefined ? (
          <div
            className={`flex items-center justify-center rounded-full px-2 py-0.5 mb-1.5 flex-shrink-0 ${bubbleBgColor} ${bubbleTextColor}`}
            style={{
              minWidth: '2.5rem',
              height: '1.5rem',
              borderRadius: '9999px',
            }}
          >
            <span className="text-xs font-bold leading-none">
              {formatEaten(numericAskEaten)}
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
        {/* Bottom: Ask Qty Value */}
        <div className={`text-right leading-tight w-full flex-1 flex items-end justify-end text-xs sm:text-sm overflow-hidden`}>
          <span className="block truncate w-full text-right font-semibold tabular-nums font-mono">
            {askQtyDisplay ?? ''}
          </span>
        </div>
      </div>
    </td>
  );
};

export default AskQtyCell;

