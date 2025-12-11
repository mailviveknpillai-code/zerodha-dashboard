import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Eaten Delta Cell Component
 * Displays:
 * - Top: Oval bubble with "+X" or "-X" indicator
 * - Bottom: Main numeric value (absolute value of eaten delta)
 */
const EatenDeltaCell = ({
  value,
  className = '',
  displayValue,
  title = null,
}) => {
  const { isDarkMode } = useTheme();

  // Parse the eaten delta value
  let numericValue = null;
  if (value !== null && value !== undefined) {
    const num = Number(value);
    if (!isNaN(num) && isFinite(num)) {
      numericValue = num;
    } else if (displayValue) {
      const parsed = Number(displayValue.toString().replace(/[^\d.-]/g, ''));
      if (!isNaN(parsed) && isFinite(parsed)) {
        numericValue = parsed;
      }
    }
  }

  // Determine sign and absolute value
  const isPositive = numericValue !== null && numericValue > 0;
  const isNegative = numericValue !== null && numericValue < 0;
  const absValue = numericValue !== null ? Math.abs(numericValue) : null;

  // Format the value for display (compact for bubble, full for main value)
  const formatValueCompact = (val) => {
    if (val === null || val === undefined) return '';
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toString();
  };
  
  const formatValueFull = (val) => {
    if (val === null || val === undefined) return '—';
    if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(2) + 'K';
    return val.toLocaleString();
  };

  // Bubble colors based on sign
  const bubbleBgColor = isPositive
    ? isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
    : isNegative
    ? isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
    : isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100';

  const bubbleTextColor = isPositive
    ? isDarkMode ? 'text-green-400' : 'text-green-700'
    : isNegative
    ? isDarkMode ? 'text-red-400' : 'text-red-700'
    : isDarkMode ? 'text-slate-400' : 'text-gray-600';

  const baseClasses = [
    'border-r',
    'last:border-r-0',
    isDarkMode ? 'border-slate-700/50' : 'border-slate-200/60',
  ];

  const composedClassName = [...baseClasses, className]
    .filter(Boolean)
    .join(' ');

  return (
    <td className={composedClassName} title={title || undefined}>
      <div className="flex flex-col items-center justify-center h-full py-1.5 min-h-[3.5rem]">
        {/* Top: Oval Bubble with +/- indicator */}
        {numericValue !== null && (
          <div
            className={`flex items-center justify-center rounded-full px-2 py-0.5 mb-1.5 flex-shrink-0 ${bubbleBgColor} ${bubbleTextColor}`}
            style={{
              minWidth: '2.5rem',
              height: '1.5rem',
              borderRadius: '9999px', // Oval shape
            }}
          >
            <span className="text-xs font-bold leading-none">
              {isPositive ? '+' : isNegative ? '−' : '0'}
              {absValue !== null && absValue > 0 ? formatValueCompact(absValue) : ''}
            </span>
          </div>
        )}
        {/* Bottom: Main numeric value (centered, larger) - shows absolute value */}
        <div className={`text-center leading-tight w-full flex-1 flex items-center justify-center text-xs sm:text-sm overflow-hidden`}>
          <span className="block truncate w-full text-center font-semibold tabular-nums">
            {absValue !== null ? formatValueFull(absValue) : (displayValue ?? '—')}
          </span>
        </div>
      </div>
    </td>
  );
};

export default EatenDeltaCell;

