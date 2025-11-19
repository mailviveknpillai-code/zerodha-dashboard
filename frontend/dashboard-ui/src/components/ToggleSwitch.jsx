import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ToggleSwitch({ 
  enabled, 
  onChange, 
  label, 
  description,
  className = "" 
}) {
  const { isDarkMode } = useTheme();

  const toggleClasses = [
    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    enabled
      ? 'bg-blue-600'
      : isDarkMode
      ? 'bg-slate-600'
      : 'bg-gray-200',
  ].join(' ');

  const labelColor = isDarkMode ? 'text-slate-200' : 'text-gray-700';
  const descColor = isDarkMode ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className={`flex items-center justify-between py-3 ${className}`}>
      <div className="flex-1">
        <label className={`text-sm font-medium ${labelColor}`}>
          {label}
        </label>
        {description && (
          <p className={`text-xs mt-1 ${descColor}`}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        className={toggleClasses}
        onClick={onChange}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
