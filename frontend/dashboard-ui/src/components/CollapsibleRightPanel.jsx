import React, { useState } from 'react';
import ToggleSwitch from './ToggleSwitch';
import { useTheme } from '../contexts/ThemeContext';

export default function CollapsibleRightPanel({ 
  blinkEnabled, 
  onBlinkToggle, 
  animateEnabled, 
  onAnimateToggle 
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className={`bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-gray-600 transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-12' : 'w-80'
    }`}>
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
              >
                <svg 
                  className={`w-5 h-5 text-gray-600 dark:text-gray-300 transition-transform duration-200 ${
                    isCollapsed ? '' : 'rotate-180'
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
        {!isCollapsed && (
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Settings</h3>
        )}
      </div>
      
      {!isCollapsed && (
        <div className="p-4 space-y-1">
          <ToggleSwitch
            enabled={isDarkMode}
            onChange={toggleDarkMode}
            label="Dark Mode"
            description="Switch between light and dark themes"
            className="border-b border-gray-200 dark:border-gray-600"
          />
          
          <ToggleSwitch
            enabled={blinkEnabled}
            onChange={onBlinkToggle}
            label="Blink Alerts"
            description="Blink when price goes below strike"
            className="border-b border-gray-200 dark:border-gray-600"
          />
          
          <ToggleSwitch
            enabled={animateEnabled}
            onChange={onAnimateToggle}
            label="Animate Deltas"
            description="Animate price change indicators"
          />
        </div>
      )}
    </div>
  );
}
