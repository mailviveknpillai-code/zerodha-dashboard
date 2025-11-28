import React from 'react';
import { useContractColoring } from '../../contexts/ContractColorContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDirectionFlow } from '../../hooks/useDirectionFlow';

/**
 * LTP Cell Component
 * Displays:
 * - Top: Direction flow indicator (arrow + percentage) from HH/HL/LL/LH analysis
 * - Bottom: LTP value (with more space)
 */
const LTPCell = ({
  value,
  className = '',
  displayValue,
  coloringMeta = null,
  title = null,
}) => {
  const { isDarkMode } = useTheme();
  const { backgroundClass, haloClass } = useContractColoring(coloringMeta, value);

  const baseClasses = [
    'border-r',
    'last:border-r-0',
    isDarkMode ? 'border-slate-700/50' : 'border-slate-200/60',
  ];

  const composedClassName = [...baseClasses, className, backgroundClass, haloClass]
    .filter(Boolean)
    .join(' ');

  // Check if we have a valid numeric value for direction flow
  // Handle both raw numbers and formatted strings
  let numericValue = null;
  if (value !== null && value !== undefined) {
    const num = Number(value);
    if (!isNaN(num) && isFinite(num) && num > 0) {
      numericValue = num;
    } else if (displayValue) {
      // Fallback: try to parse displayValue if value is not numeric
      // Remove all non-numeric characters except decimal point and minus
      const cleaned = displayValue.toString().replace(/[^\d.-]/g, '');
      const parsed = Number(cleaned);
      if (!isNaN(parsed) && isFinite(parsed) && parsed > 0) {
        numericValue = parsed;
      }
    }
  }

  // Get direction flow data - use very low threshold (0.01%) for sensitive detection
  // This ensures even small price movements are detected
  const { direction, confidence } = useDirectionFlow(numericValue, 0.01);
  const confidenceInt = Math.round(confidence);

  // No color coding - use neutral text color
  const indicatorColor = isDarkMode ? 'text-slate-300' : 'text-gray-600';
  const arrowSymbol = direction === 'UP' ? '↑' : direction === 'DOWN' ? '↓' : '→';

  // Extract text size classes from className prop to apply to LTP value
  const hasTextXs = className.includes('text-xs');
  const hasTextSm = className.includes('text-sm');
  const hasTextBase = className.includes('text-base');
  const hasTextLg = className.includes('text-lg');
  
  // Determine text size for LTP value (inherit from className, default to text-xs sm:text-sm)
  const ltpTextSize = hasTextLg ? 'text-lg' : 
                      hasTextBase ? 'text-base' : 
                      hasTextSm ? 'text-sm' : 
                      'text-xs sm:text-sm';

  return (
    <td className={composedClassName} title={title || undefined}>
      <div className="ltp-cell-container flex flex-col items-end justify-start h-full py-1.5 min-h-[3.5rem]">
        {/* Top: Direction Flow Indicator (Arrow + Percentage) - Always show if we have a value */}
        {numericValue !== null && (
          <div className={`ltp-indicator flex items-center justify-end gap-1 text-[11px] leading-none ${indicatorColor} mb-1.5 flex-shrink-0 h-4`}>
            <span className="font-bold text-sm leading-none">{arrowSymbol}</span>
            {confidenceInt > 0 && (
              <span className="opacity-90 font-semibold text-[10px] leading-none">{confidenceInt}%</span>
            )}
          </div>
        )}
        {/* Bottom: LTP Value (with more space - main content) - uses same font size as other cells */}
        <div className={`ltp-value text-right leading-tight w-full flex-1 flex items-end justify-end ${ltpTextSize} overflow-hidden`}>
          <span className="block truncate w-full text-right">{displayValue ?? (value ?? '')}</span>
        </div>
      </div>
    </td>
  );
};

export default LTPCell;

