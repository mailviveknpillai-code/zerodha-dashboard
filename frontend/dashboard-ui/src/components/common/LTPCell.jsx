import React from 'react';
import { useContractColoring } from '../../contexts/ContractColorContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDirectionFlow } from '../../hooks/useDirectionFlow';

/**
 * LTP Cell Component
 * Displays:
 * - Top: LTP Movement bubble (oval, with arrow indicator and percentage) from frontend calculation
 * - Bottom: LTP value (with more space)
 * 
 * The movement calculation is done in the frontend using useDirectionFlow hook.
 */
const LTPCell = ({
  value,
  className = '',
  displayValue,
  coloringMeta = null,
  title = null,
  // Legacy props from backend - kept for backward compatibility, but not used in logic
  ltpMovementDirection = null,
  ltpMovementConfidence = null,
  ltpMovementIntensity = null,
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

  // Calculate movement using frontend hook based on current LTP value
  const numericValue = value !== null && value !== undefined ? Number(value) : null;
  const { direction, confidence, intensity } = useDirectionFlow(numericValue, 0.01);
  const confidenceInt = Math.round(confidence);

  // Determine arrow symbol based on direction and intensity
  // Single arrow for slow movement, double arrow for high movement
  let arrowSymbol = '→'; // Default: neutral
  if (direction === 'UP') {
    arrowSymbol = intensity === 'HIGH' ? '↑↑' : '↑';
  } else if (direction === 'DOWN') {
    arrowSymbol = intensity === 'HIGH' ? '↓↓' : '↓';
  }

  // Bubble colors - similar to eaten delta bubble
  const bubbleBgColor = direction === 'NEUTRAL'
    ? isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'
    : direction === 'UP'
    ? isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
    : isDarkMode ? 'bg-red-500/20' : 'bg-red-100';

  const bubbleTextColor = direction === 'NEUTRAL'
    ? isDarkMode ? 'text-slate-400' : 'text-gray-600'
    : direction === 'UP'
    ? isDarkMode ? 'text-green-400' : 'text-green-700'
    : isDarkMode ? 'text-red-400' : 'text-red-700';

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

  // Always show bubble - even if direction is NEUTRAL or data is not yet strong
  const shouldShowBubble = direction !== null || ltpMovementDirection !== null;

  return (
    <td className={composedClassName} title={title || undefined}>
      <div className="flex flex-col items-end justify-center h-full py-1.5 min-h-[3.5rem]">
        {/* Top: LTP Movement Bubble (oval, similar to eaten delta) - Always show */}
        {shouldShowBubble ? (
          <div
            className={`flex items-center justify-center rounded-full px-2 py-0.5 mb-1.5 flex-shrink-0 ${bubbleBgColor} ${bubbleTextColor}`}
            style={{
              minWidth: '2.5rem',
              height: '1.5rem',
              borderRadius: '9999px', // Oval shape
            }}
          >
            <span className="text-xs font-bold leading-none flex items-center gap-0.5">
              <span>{arrowSymbol}</span>
              {confidenceInt > 0 ? (
                <span className="opacity-90">{confidenceInt}%</span>
              ) : direction === 'NEUTRAL' ? (
                <span className="opacity-70">—</span>
              ) : null}
            </span>
          </div>
        ) : (
          // Placeholder bubble when data not available
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
        {/* Bottom: LTP Value (main content) */}
        <div className={`text-right leading-tight w-full flex-1 flex items-end justify-end ${ltpTextSize} overflow-hidden`}>
          <span className="block truncate w-full text-right">
            {displayValue || (value != null ? String(value) : '-')}
          </span>
        </div>
      </div>
    </td>
  );
};

export default LTPCell;

