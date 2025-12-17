import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Glassmorphism-styled right-edge toggle button for fullscreen mode
 * Appears as a vertical half-circle on the right edge of the screen
 */
export default function RightPanelToggleButton({ onClick, isExpanded }) {
  const { isDarkMode } = useTheme();

  if (isExpanded) {
    return null; // Hide when panel is expanded
  }

  return (
    <button
      onClick={onClick}
      className="right-panel-edge-toggle fixed right-0 top-1/2 -translate-y-1/2 z-40 group"
      title="Open information panel"
      aria-label="Open information panel"
    >
      {/* Glassmorphism Container */}
      <div className={`
        relative flex items-center justify-center
        w-12 h-24
        glassmorphism-toggle
        transition-all duration-300
        group-hover:w-14
        ${isDarkMode ? 'glassmorphism-dark' : 'glassmorphism-light'}
      `}>
        {/* Left-pointing arrow icon */}
        <svg 
          className={`
            w-6 h-6 -ml-2
            transition-all duration-300
            group-hover:scale-110
            group-hover:-ml-3
            ${isDarkMode ? 'text-white/90' : 'text-gray-900/80'}
          `}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M15 19l-7-7 7-7" 
          />
        </svg>
      </div>

      {/* Hover glow effect */}
      <div className={`
        absolute inset-0 -z-10
        rounded-l-full
        opacity-0 group-hover:opacity-100
        transition-opacity duration-300
        ${isDarkMode 
          ? 'bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
          : 'bg-blue-400/20 shadow-[0_0_20px_rgba(96,165,250,0.3)]'
        }
      `} />
    </button>
  );
}

