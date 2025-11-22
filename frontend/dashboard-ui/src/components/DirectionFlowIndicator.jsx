import React, { useState } from 'react';
import { useDirectionFlow } from '../hooks/useDirectionFlow';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Direction Flow Indicator Component - Non-Intrusive Design
 * 
 * Designed to NOT cramp values - uses hover tooltip or subtle placement
 * 
 * @param {number|null} currentPrice - Current price value
 * @param {string} variant - Display variant: 'tooltip' | 'above' | 'below' | 'separate-line' | 'minimal-icon'
 * @param {boolean} showConfidence - Whether to show confidence percentage
 * @param {boolean} showHighsLows - Whether to show recent highs/lows (detailed mode only)
 */
export default function DirectionFlowIndicator({
  currentPrice,
  variant = 'tooltip', // Default to tooltip to avoid cramping
  showConfidence = true,
  showHighsLows = false,
  className = '',
}) {
  const { direction, confidence, highs, lows } = useDirectionFlow(currentPrice);
  const { isDarkMode } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);

  // Don't render if no valid price
  if (currentPrice === null || currentPrice === undefined || isNaN(Number(currentPrice))) {
    return null;
  }

  const getDirectionColors = () => {
    if (direction === 'UP') {
      return {
        bg: isDarkMode ? 'bg-green-900/30' : 'bg-green-50',
        border: isDarkMode ? 'border-green-600/50' : 'border-green-300',
        text: isDarkMode ? 'text-green-400' : 'text-green-700',
        icon: isDarkMode ? 'text-green-400' : 'text-green-600',
      };
    } else if (direction === 'DOWN') {
      return {
        bg: isDarkMode ? 'bg-red-900/30' : 'bg-red-50',
        border: isDarkMode ? 'border-red-600/50' : 'border-red-300',
        text: isDarkMode ? 'text-red-400' : 'text-red-700',
        icon: isDarkMode ? 'text-red-400' : 'text-red-600',
      };
    } else {
      return {
        bg: isDarkMode ? 'bg-slate-700/30' : 'bg-gray-50',
        border: isDarkMode ? 'border-slate-600/50' : 'border-gray-300',
        text: isDarkMode ? 'text-slate-400' : 'text-gray-600',
        icon: isDarkMode ? 'text-slate-400' : 'text-gray-500',
      };
    }
  };

  const colors = getDirectionColors();
  const confidenceInt = Math.round(confidence);

  // TOOLTIP VARIANT (Recommended - Non-intrusive)
  // Shows small dot/icon that reveals info on hover - doesn't take space
  if (variant === 'tooltip') {
    return (
      <span
        className={`relative inline-block ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Small subtle dot indicator */}
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ml-1 ${
            direction === 'UP' ? 'bg-green-500' :
            direction === 'DOWN' ? 'bg-red-500' :
            'bg-gray-400'
          }`}
          title={`${direction} (${confidenceInt}%)`}
        />
        
        {/* Tooltip on hover */}
        {showTooltip && (
          <div
            className={`absolute z-50 bottom-full right-0 mb-1 px-2 py-1 rounded text-xs whitespace-nowrap ${colors.bg} ${colors.border} border ${colors.text} shadow-lg`}
            style={{ minWidth: '120px' }}
          >
            <div className="font-semibold">
              {direction === 'UP' && '↑'} {direction === 'DOWN' && '↓'} {direction === 'NEUTRAL' && '→'} {direction}
            </div>
            {showConfidence && confidenceInt > 0 && (
              <div className="text-xs opacity-75">Confidence: {confidenceInt}%</div>
            )}
            {showHighsLows && highs.length > 0 && (
              <div className="text-xs mt-1 opacity-75">
                Highs: {highs.slice(-2).map(h => h.toFixed(2)).join(', ')}
              </div>
            )}
            {showHighsLows && lows.length > 0 && (
              <div className="text-xs opacity-75">
                Lows: {lows.slice(-2).map(l => l.toFixed(2)).join(', ')}
              </div>
            )}
          </div>
        )}
      </span>
    );
  }

  // ABOVE VARIANT - Places indicator above the value (separate line)
  if (variant === 'above') {
    return (
      <div className={`flex flex-col items-end ${className}`}>
        <div className={`text-[10px] leading-none mb-0.5 ${colors.text}`}>
          {direction === 'UP' && '↑'} {direction === 'DOWN' && '↓'} {direction === 'NEUTRAL' && '→'}
          {showConfidence && confidenceInt > 0 && ` ${confidenceInt}%`}
        </div>
      </div>
    );
  }

  // BELOW VARIANT - Places indicator below the value (separate line)
  if (variant === 'below') {
    return (
      <div className={`flex flex-col items-end ${className}`}>
        <div className={`text-[10px] leading-none mt-0.5 ${colors.text}`}>
          {direction === 'UP' && '↑'} {direction === 'DOWN' && '↓'} {direction === 'NEUTRAL' && '→'}
          {showConfidence && confidenceInt > 0 && ` ${confidenceInt}%`}
        </div>
      </div>
    );
  }

  // SEPARATE LINE VARIANT - Full separate line above value
  if (variant === 'separate-line') {
    return (
      <div className={`block w-full ${className}`}>
        <div className={`text-[10px] leading-tight mb-0.5 ${colors.text} text-right`}>
          <span className="font-semibold">
            {direction === 'UP' && '↑'} {direction === 'DOWN' && '↓'} {direction === 'NEUTRAL' && '→'} {direction}
          </span>
          {showConfidence && confidenceInt > 0 && (
            <span className="opacity-75 ml-1">{confidenceInt}%</span>
          )}
        </div>
      </div>
    );
  }

  // MINIMAL ICON - Very small icon that doesn't take much space
  if (variant === 'minimal-icon') {
    return (
      <span
        className={`inline-block text-[10px] leading-none ml-0.5 ${colors.icon} ${className}`}
        title={`${direction} (${confidenceInt}%)`}
      >
        {direction === 'UP' && '↑'}
        {direction === 'DOWN' && '↓'}
        {direction === 'NEUTRAL' && '→'}
      </span>
    );
  }

  return null;
}

/**
 * Non-intrusive inline indicator - uses tooltip by default
 * Recommended for table cells - doesn't cramp values
 */
export function InlineDirectionIndicator({ currentPrice, className = '' }) {
  return (
    <DirectionFlowIndicator
      currentPrice={currentPrice}
      variant="tooltip"
      className={className}
    />
  );
}

/**
 * Above value indicator - places above the number
 * Good for when you want visible indicator without horizontal space
 */
export function AboveValueIndicator({ currentPrice, showConfidence = false, className = '' }) {
  return (
    <DirectionFlowIndicator
      currentPrice={currentPrice}
      variant="above"
      showConfidence={showConfidence}
      className={className}
    />
  );
}

/**
 * Below value indicator - places below the number
 * Good for when you want visible indicator without horizontal space
 */
export function BelowValueIndicator({ currentPrice, showConfidence = false, className = '' }) {
  return (
    <DirectionFlowIndicator
      currentPrice={currentPrice}
      variant="below"
      showConfidence={showConfidence}
      className={className}
    />
  );
}

/**
 * Minimal icon - smallest possible indicator
 * Just a tiny arrow, no text
 */
export function MinimalDirectionIcon({ currentPrice, className = '' }) {
  return (
    <DirectionFlowIndicator
      currentPrice={currentPrice}
      variant="minimal-icon"
      className={className}
    />
  );
}

/**
 * Badge for headers - only use in headers, not cells
 */
export function DirectionBadge({ currentPrice, showConfidence = true, className = '' }) {
  const { direction, confidence } = useDirectionFlow(currentPrice);
  const { isDarkMode } = useTheme();
  const confidenceInt = Math.round(confidence);
  
  const colors = direction === 'UP' 
    ? (isDarkMode ? 'bg-green-900/30 border-green-600/50 text-green-400' : 'bg-green-50 border-green-300 text-green-700')
    : direction === 'DOWN'
    ? (isDarkMode ? 'bg-red-900/30 border-red-600/50 text-red-400' : 'bg-red-50 border-red-300 text-red-700')
    : (isDarkMode ? 'bg-slate-700/30 border-slate-600/50 text-slate-400' : 'bg-gray-50 border-gray-300 text-gray-600');
  
  if (currentPrice === null || currentPrice === undefined || isNaN(Number(currentPrice))) {
    return null;
  }
  
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors} ${className}`}
      title={`Direction: ${direction} (${confidenceInt}% confidence)`}
    >
      {direction === 'UP' && '↑'}
      {direction === 'DOWN' && '↓'}
      {direction === 'NEUTRAL' && '→'}
      <span className="font-semibold">{direction}</span>
      {showConfidence && confidenceInt > 0 && (
        <span className="opacity-70">{confidenceInt}%</span>
      )}
    </span>
  );
}
