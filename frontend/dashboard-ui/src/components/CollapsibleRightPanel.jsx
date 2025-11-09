import React, { useState } from 'react';
import ToggleSwitch from './ToggleSwitch';
import { useTheme } from '../contexts/ThemeContext';
import { useRefreshInterval } from '../contexts/RefreshIntervalContext';
import { logoutZerodhaSession } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function CollapsibleRightPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { intervalMs, setIntervalMs, minIntervalMs, maxIntervalMs, stepMs } = useRefreshInterval();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const navigate = useNavigate();

  const handleIntervalChange = (event) => {
    const seconds = Number(event.target.value);
    if (!Number.isFinite(seconds)) return;
    setIntervalMs(seconds * 1000);
  };

  const handleLogoutClick = () => {
    setLogoutError(null);
    setShowLogoutConfirm(true);
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
      console.error('CollapsibleRightPanel: failed to logout from Zerodha', error);
      setLogoutError('Failed to log out. Please try again.');
    } finally {
      setLogoutLoading(false);
    }
  };

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

          <div className="py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Auto Refresh Rate</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Adjust poll frequency for live data</p>
              </div>
              <span className="text-sm font-semibold text-blue-600">{(intervalMs / 1000).toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min={minIntervalMs / 1000}
              max={maxIntervalMs / 1000}
              step={stepMs / 1000}
              value={intervalMs / 1000}
              onChange={handleIntervalChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-2">
              <span>{(minIntervalMs / 1000).toFixed(2)}s</span>
              <span>{(maxIntervalMs / 1000).toFixed(2)}s</span>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-300 dark:hover:bg-red-900/30 transition-colors"
            >
              Logout Zerodha
            </button>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                !
              </span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Confirm Logout</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Logging out will stop live Zerodha data until you sign in again.
                </p>
              </div>
            </div>

            {logoutError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                {logoutError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeLogoutModal}
                disabled={logoutLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
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
    </div>
  );
}
