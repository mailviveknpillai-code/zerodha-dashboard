import React, { useState, useRef, useEffect, useMemo } from 'react';
import ToggleSwitch from './ToggleSwitch';
import { useTheme } from '../contexts/ThemeContext';
import { useRefreshInterval } from '../contexts/RefreshIntervalContext';
import { useVolumeWindow } from '../contexts/VolumeWindowContext';
import { useTrendAveraging } from '../contexts/TrendAveragingContext';
import { logoutZerodhaSession } from '../api/client';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger';

export default function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const dropdownRef = useRef(null);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { intervalMs, setIntervalMs, options } = useRefreshInterval();
  const { volumeWindowMinutes, setVolumeWindow } = useVolumeWindow();
  const { averagingWindowSeconds, setAveragingWindow } = useTrendAveraging();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogoutClick = () => {
    setLogoutError(null);
    setShowLogoutConfirm(true);
    setIsOpen(false);
  };

  const closeLogoutModal = () => {
    if (!logoutLoading) {
      setShowLogoutConfirm(false);
    }
  };

  const confirmLogout = async () => {
    setLogoutLoading(true);
    setLogoutError(null);
    try {
      await logoutZerodhaSession();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('SettingsDropdown: failed to logout from Zerodha', error);
      setLogoutError('Failed to log out. Please try again.');
    } finally {
      setLogoutLoading(false);
    }
  };

  const buttonClasses = [
    'p-2 rounded-lg transition-all duration-200 group relative',
    isDarkMode
      ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700'
      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
  ].join(' ');

  const dropdownClasses = [
    'absolute right-0 mt-2 w-80 rounded-xl shadow-2xl border z-50',
    isDarkMode
      ? 'bg-slate-800 border-slate-600 text-slate-200'
      : 'bg-white border-gray-200 text-gray-900',
  ].join(' ');

  const sectionDivider = isDarkMode ? 'border-slate-600' : 'border-gray-200';
  const sliderLabels = isDarkMode ? 'text-slate-400' : 'text-gray-400';
  const sliderHelper = isDarkMode ? 'text-slate-300' : 'text-gray-600';

  // Find current interval index
  const currentIntervalIndex = useMemo(() => {
    const index = options.findIndex(opt => opt.value === intervalMs);
    return index >= 0 ? index : Math.floor(options.length / 2);
  }, [intervalMs, options]);

  const handleIntervalChange = async (event) => {
    const selectedIndex = Number(event.target.value);
    const selectedOption = options[selectedIndex];
    if (selectedOption) {
      logger.info('[SettingsDropdown] Refresh rate changed', { 
        selectedIndex, 
        newIntervalMs: selectedOption.value,
        label: selectedOption.label 
      });
      await setIntervalMs(selectedOption.value);
    } else {
      logger.error('[SettingsDropdown] No option found for index', { selectedIndex, totalOptions: options.length });
    }
  };

  const logoutButton = [
    'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
    isDarkMode
      ? 'border-red-500/60 text-red-300 hover:bg-red-900/30'
      : 'border-red-200 text-red-600 hover:bg-red-50',
  ].join(' ');

  const cancelButton = [
    'px-4 py-2 rounded-lg border transition-colors',
    isDarkMode
      ? 'border-slate-600 text-slate-200 hover:bg-slate-700'
      : 'border-gray-300 text-gray-700 hover:bg-gray-100',
  ].join(' ');

  const modalClasses = [
    'rounded-xl shadow-2xl border max-w-sm w-full p-6 space-y-4',
    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900',
  ].join(' ');

  const overlayClasses = isDarkMode ? 'bg-black/50' : 'bg-black/40';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={buttonClasses}
          title="Settings"
        >
          <svg 
            className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" 
            />
          </svg>
        </button>

        {isOpen && (
          <div className={dropdownClasses}>
            <div className="p-4 space-y-1">
              <ToggleSwitch
                enabled={isDarkMode}
                onChange={toggleDarkMode}
                label="Dark Mode"
                description="Switch between light and dark themes"
                className={`border-b ${sectionDivider}`}
              />

              <div className={`py-4 border-b ${sectionDivider}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Refresh Rate</p>
                    <p className={`text-xs ${sliderHelper}`}>Poll frequency for live data (0.75 - 7)</p>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={currentIntervalIndex}
                    onChange={handleIntervalChange}
                    className={`refresh-rate-selector w-full px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-700'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:bg-white'
                    }`}
                  >
                    {options.map((option, index) => (
                      <option 
                        key={option.value} 
                        value={index}
                        className={`
                          ${index === currentIntervalIndex 
                            ? isDarkMode 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-500 text-white'
                            : ''
                          }
                          ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-gray-900'}
                        `}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`py-4 border-b ${sectionDivider}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Volume Window</p>
                    <p className={`text-xs ${sliderHelper}`}>Time window for volume change tracking (1-10 minutes)</p>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={volumeWindowMinutes}
                    onChange={(e) => setVolumeWindow(Number(e.target.value))}
                    className={`refresh-rate-selector w-full px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-700'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:bg-white'
                    }`}
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((minutes) => (
                      <option 
                        key={minutes} 
                        value={minutes}
                        className={`
                          ${minutes === volumeWindowMinutes 
                            ? isDarkMode 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-500 text-white'
                            : ''
                          }
                          ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-gray-900'}
                        `}
                      >
                        {minutes} minute{minutes !== 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`py-4 border-b ${sectionDivider}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Trend Averaging Window</p>
                    <p className={`text-xs ${sliderHelper}`}>Time window for trend calculation (3-15 seconds)</p>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={averagingWindowSeconds}
                    onChange={(e) => setAveragingWindow(Number(e.target.value))}
                    className={`refresh-rate-selector w-full px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-700'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:bg-white'
                    }`}
                  >
                    {[3, 6, 9, 12, 15].map((seconds) => (
                      <option 
                        key={seconds} 
                        value={seconds}
                        className={`
                          ${seconds === averagingWindowSeconds 
                            ? isDarkMode 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-500 text-white'
                            : ''
                          }
                          ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-gray-900'}
                        `}
                      >
                        {seconds} second{seconds !== 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button type="button" onClick={handleLogoutClick} className={logoutButton}>
                  Logout Zerodha
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${overlayClasses} backdrop-blur-sm px-4`}>
          <div className={modalClasses}>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                !
              </span>
              <div>
                <h2 className="text-lg font-semibold">Confirm Logout</h2>
                <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  Logging out will stop live Zerodha data until you sign in again.
                </p>
              </div>
            </div>

            {logoutError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                {logoutError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={closeLogoutModal} disabled={logoutLoading} className={cancelButton}>
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                disabled={logoutLoading}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {logoutLoading ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



