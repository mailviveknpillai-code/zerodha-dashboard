import React, { useState, useRef, useEffect, useMemo } from 'react';
import ToggleSwitch from './ToggleSwitch';
import { useTheme } from '../contexts/ThemeContext';
import { useRefreshInterval } from '../contexts/RefreshIntervalContext';
import { useApiPollingInterval } from '../contexts/ApiPollingIntervalContext';
import { useVolumeWindow } from '../contexts/VolumeWindowContext';
import { useTrendAveraging } from '../contexts/TrendAveragingContext';
import { useTrendThreshold } from '../contexts/TrendThresholdContext';
import { useEatenDeltaWindow } from '../contexts/EatenDeltaWindowContext';
import { useLtpMovementCacheSize } from '../contexts/LtpMovementCacheSizeContext';
import { useLtpMovementWindow } from '../contexts/LtpMovementWindowContext';
import { useSpotLtpInterval } from '../contexts/SpotLtpIntervalContext';
import { useDebugMode } from '../contexts/DebugModeContext';
import { logoutZerodhaSession } from '../api/client';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger';

export default function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const [showApiPollingConfirm, setShowApiPollingConfirm] = useState(false);
  const [pendingApiPollingValue, setPendingApiPollingValue] = useState(null);
  const [showUiRefreshConfirm, setShowUiRefreshConfirm] = useState(false);
  const [pendingUiRefreshValue, setPendingUiRefreshValue] = useState(null);
  const dropdownRef = useRef(null);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { intervalMs, setIntervalMs, options } = useRefreshInterval();
  const { intervalMs: apiPollingIntervalMs, setIntervalMs: setApiPollingIntervalMs, options: apiPollingOptions } = useApiPollingInterval();
  const { volumeWindowMinutes, setVolumeWindow } = useVolumeWindow();
  const { averagingWindowSeconds, setAveragingWindow } = useTrendAveraging();
  const { bullishThreshold, bearishThreshold, setBullishThreshold, setBearishThreshold } = useTrendThreshold();
  const { windowSeconds, updateWindowSeconds } = useEatenDeltaWindow();
  const { cacheSize: ltpMovementCacheSize, setCacheSize: setLtpMovementCacheSize } = useLtpMovementCacheSize();
  const { windowSeconds: ltpMovementWindowSeconds, updateWindowSeconds: updateLtpMovementWindowSeconds } = useLtpMovementWindow();
  const { intervalSeconds: spotLtpInterval, setIntervalSeconds: setSpotLtpInterval } = useSpotLtpInterval();
  const { debugMode, setDebugMode } = useDebugMode();
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
    'absolute right-0 mt-2 w-80 rounded-xl shadow-2xl border z-50 max-h-[66vh] overflow-y-auto',
    isDarkMode
      ? 'bg-slate-800 border-slate-600 text-slate-200'
      : 'bg-white border-gray-200 text-gray-900',
  ].join(' ');

  const settingItemClasses = [
    'py-4 border-b transition-all duration-200',
    isDarkMode
      ? 'border-slate-600 hover:border-blue-500/50 rounded-lg hover:bg-slate-700/30'
      : 'border-gray-200 hover:border-blue-400/50 rounded-lg hover:bg-blue-50/30',
  ].join(' ');

  const sectionDivider = isDarkMode ? 'border-slate-600' : 'border-gray-200';
  const sliderLabels = isDarkMode ? 'text-slate-400' : 'text-gray-400';
  const sliderHelper = isDarkMode ? 'text-slate-300' : 'text-gray-600';

  // Find current interval index for UI refresh rate
  const currentIntervalIndex = useMemo(() => {
    const index = options.findIndex(opt => opt.value === intervalMs);
    return index >= 0 ? index : Math.floor(options.length / 2);
  }, [intervalMs, options]);

  // Find current interval index for API polling interval
  const currentApiPollingIndex = useMemo(() => {
    const index = apiPollingOptions.findIndex(opt => opt.value === apiPollingIntervalMs);
    return index >= 0 ? index : Math.floor(apiPollingOptions.length / 2);
  }, [apiPollingIntervalMs, apiPollingOptions]);

  const handleIntervalChange = (event) => {
    const selectedIndex = Number(event.target.value);
    const selectedOption = options[selectedIndex];
    if (selectedOption) {
      // Show confirmation before changing UI refresh rate
      setPendingUiRefreshValue(selectedOption.value);
      setShowUiRefreshConfirm(true);
      setIsOpen(false);
    } else {
      logger.error('[SettingsDropdown] No option found for index', { selectedIndex, totalOptions: options.length });
    }
  };

  const confirmUiRefreshChange = async () => {
    if (pendingUiRefreshValue !== null) {
      logger.info('[SettingsDropdown] UI Refresh rate changed', { 
        newIntervalMs: pendingUiRefreshValue,
        oldIntervalMs: intervalMs
      });
      await setIntervalMs(pendingUiRefreshValue);
      setPendingUiRefreshValue(null);
    }
    setShowUiRefreshConfirm(false);
  };

  const cancelUiRefreshChange = () => {
    setPendingUiRefreshValue(null);
    setShowUiRefreshConfirm(false);
  };

  const handleApiPollingIntervalChange = (event) => {
    const selectedIndex = Number(event.target.value);
    const selectedOption = apiPollingOptions[selectedIndex];
    if (selectedOption) {
      // Show confirmation before changing API polling interval
      setPendingApiPollingValue(selectedOption.value);
      setShowApiPollingConfirm(true);
      setIsOpen(false);
    } else {
      logger.error('[SettingsDropdown] No option found for API polling index', { selectedIndex, totalOptions: apiPollingOptions.length });
    }
  };

  const confirmApiPollingChange = async () => {
    if (pendingApiPollingValue !== null) {
      const intervalSeconds = pendingApiPollingValue / 1000;
      logger.info('[SettingsDropdown] API Polling interval changed', { 
        newIntervalMs: pendingApiPollingValue,
        newIntervalSeconds: intervalSeconds,
        oldIntervalMs: apiPollingIntervalMs,
        isLowValue: intervalSeconds < 1.5
      });
      await setApiPollingIntervalMs(pendingApiPollingValue);
      setPendingApiPollingValue(null);
    }
    setShowApiPollingConfirm(false);
  };

  const cancelApiPollingChange = () => {
    setPendingApiPollingValue(null);
    setShowApiPollingConfirm(false);
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
              <div className={settingItemClasses}>
                <ToggleSwitch
                  enabled={isDarkMode}
                  onChange={toggleDarkMode}
                  label="Dark Mode"
                  description="Switch between light and dark themes"
                />
              </div>

              <div className={settingItemClasses}>
                <ToggleSwitch
                  enabled={debugMode}
                  onChange={() => setDebugMode(!debugMode)}
                  label="Debug Mode"
                  description={`Enable detailed logging for troubleshooting (currently ${debugMode ? 'ON' : 'OFF'})`}
                />
              </div>

                     {/* API Polling Interval - Backend polls Zerodha API */}
                     <div className={settingItemClasses}>
                       <div className="flex items-center justify-between mb-3">
                         <div>
                           <p className="text-sm font-medium">API Polling Interval</p>
                           <p className={`text-xs ${sliderHelper}`}>How often backend polls Zerodha API to fetch new data (0.75 - 7s)</p>
                         </div>
                       </div>
                <div className="relative">
                  <select
                    value={currentApiPollingIndex}
                    onChange={handleApiPollingIntervalChange}
                    className={`refresh-rate-selector w-full px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-700'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:bg-white'
                    }`}
                  >
                    {apiPollingOptions.map((option, index) => (
                      <option 
                        key={option.value} 
                        value={index}
                        className={`
                          ${index === currentApiPollingIndex
                            ? isDarkMode 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-500 text-white'
                            : ''
                          }
                          ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-gray-900'}
                        `}
                      >
                        {option.label}s
                      </option>
                    ))}
                  </select>
                </div>
              </div>

                     {/* UI Refresh Rate - Frontend polls backend /latest endpoint */}
                     <div className={settingItemClasses}>
                       <div className="flex items-center justify-between mb-3">
                         <div>
                           <p className="text-sm font-medium">UI Refresh Rate</p>
                           <p className={`text-xs ${sliderHelper}`}>How often UI updates values from backend cache (0.75 - 7s)</p>
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
                        {option.label}s
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={settingItemClasses}>
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

              <div className={settingItemClasses}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Trend Calculation Window</p>
                    <p className={`text-xs ${sliderHelper}`}>FIFO window size for trend calculation (uses API polled values, updated at UI refresh rate)</p>
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

              <div className={settingItemClasses}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Bullish Threshold</p>
                    <p className={`text-xs ${sliderHelper}`}>Minimum score for Bullish classification (1-10)</p>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={bullishThreshold}
                    onChange={(e) => setBullishThreshold(Number(e.target.value))}
                    className={`refresh-rate-selector w-full px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-700'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:bg-white'
                    }`}
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                      <option 
                        key={value} 
                        value={value}
                        className={`
                          ${value === bullishThreshold 
                            ? isDarkMode 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-500 text-white'
                            : ''
                          }
                          ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-gray-900'}
                        `}
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={settingItemClasses}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Bearish Threshold</p>
                    <p className={`text-xs ${sliderHelper}`}>Maximum score for Bearish classification (-1 to -10)</p>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={bearishThreshold}
                    onChange={(e) => setBearishThreshold(Number(e.target.value))}
                    className={`refresh-rate-selector w-full px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-700'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:bg-white'
                    }`}
                  >
                    {Array.from({ length: 10 }, (_, i) => -(i + 1)).map((value) => (
                      <option 
                        key={value} 
                        value={value}
                        className={`
                          ${value === bearishThreshold 
                            ? isDarkMode 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-500 text-white'
                            : ''
                          }
                          ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-gray-900'}
                        `}
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={settingItemClasses}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Spot LTP Trend Window</p>
                    <p className={`text-xs ${sliderHelper}`}>Time window for spot LTP trend calculation (3-50s)</p>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={spotLtpInterval}
                    onChange={(e) => setSpotLtpInterval(Number(e.target.value))}
                    className={`refresh-rate-selector w-full px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-700'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:bg-white'
                    }`}
                  >
                    {[3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((seconds) => (
                      <option 
                        key={seconds} 
                        value={seconds}
                        className={`
                          ${seconds === spotLtpInterval 
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

              <div className={settingItemClasses}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Eaten Δ Window</p>
                    <p className={`text-xs ${sliderHelper}`}>Rolling window for Eaten Delta calculation (1-20s with 2s intervals)</p>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={windowSeconds}
                    onChange={(e) => updateWindowSeconds(Number(e.target.value))}
                    className={`refresh-rate-selector w-full px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-700'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:bg-white'
                    }`}
                  >
                    {[1, 3, 5, 7, 9, 11, 13, 15, 17, 19].map((seconds) => (
                      <option 
                        key={seconds} 
                        value={seconds}
                        className={`
                          ${seconds === windowSeconds 
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

              <div className={settingItemClasses}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">LTP Movement Window</p>
                    <p className={`text-xs ${sliderHelper}`}>Time window for LTP movement calculation (1-15s: 3s intervals, 15-60s: 5-10s intervals)</p>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={ltpMovementWindowSeconds}
                    onChange={(e) => updateLtpMovementWindowSeconds(Number(e.target.value))}
                    className={`refresh-rate-selector w-full px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-700'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:bg-white'
                    }`}
                  >
                    {[1, 4, 7, 10, 13, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((seconds) => (
                      <option 
                        key={seconds} 
                        value={seconds}
                        className={`
                          ${seconds === ltpMovementWindowSeconds 
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

      {/* API Polling Interval Confirmation Modal */}
      {showApiPollingConfirm && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${overlayClasses} backdrop-blur-sm px-4`}>
          <div className={modalClasses}>
            <h3 className="text-lg font-semibold mb-2">
              {pendingApiPollingValue && (pendingApiPollingValue / 1000) < 1.5
                ? '⚠️ Warning: Low Polling Interval'
                : 'Confirm API Polling Interval Change'}
            </h3>
            {pendingApiPollingValue && (pendingApiPollingValue / 1000) < 1.5 ? (
              <>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  <strong>Warning:</strong> Setting API polling interval below 1.5 seconds may cause application crashes or API rate limiting issues.
                </p>
                <p className="text-sm mb-4">
                  Current: <strong>{apiPollingIntervalMs / 1000}s</strong> → New: <strong>{pendingApiPollingValue / 1000}s</strong>
                </p>
                <p className="text-sm mb-4">
                  Are you sure you want to proceed?
                </p>
              </>
            ) : (
              <>
                <p className="text-sm mb-4">
                  Change API polling interval from <strong>{apiPollingIntervalMs / 1000}s</strong> to <strong>{pendingApiPollingValue ? pendingApiPollingValue / 1000 : ''}s</strong>?
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                  This controls how often the backend polls the Zerodha API and updates the cache.
                </p>
              </>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelApiPollingChange}
                className={cancelButton}
                disabled={false}
              >
                Cancel
              </button>
              <button
                onClick={confirmApiPollingChange}
                className={[
                  'px-4 py-2 rounded-lg border transition-colors font-semibold',
                  pendingApiPollingValue && (pendingApiPollingValue / 1000) < 1.5
                    ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
                    : isDarkMode
                    ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600'
                    : 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600',
                ].join(' ')}
              >
                {pendingApiPollingValue && (pendingApiPollingValue / 1000) < 1.5 ? 'Proceed Anyway' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UI Refresh Rate Confirmation Modal */}
      {showUiRefreshConfirm && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${overlayClasses} backdrop-blur-sm px-4`}>
          <div className={modalClasses}>
            <h3 className="text-lg font-semibold mb-2">Confirm UI Refresh Rate Change</h3>
            <p className="text-sm mb-4">
              Change UI refresh rate from <strong>{intervalMs / 1000}s</strong> to <strong>{pendingUiRefreshValue ? pendingUiRefreshValue / 1000 : ''}s</strong>?
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
              This controls how often the UI polls the backend /latest endpoint to update the display.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelUiRefreshChange}
                className={cancelButton}
                disabled={false}
              >
                Cancel
              </button>
              <button
                onClick={confirmUiRefreshChange}
                className={[
                  'px-4 py-2 rounded-lg border transition-colors font-semibold',
                  isDarkMode
                    ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600'
                    : 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600',
                ].join(' ')}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

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



