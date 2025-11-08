import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isMockMode, logoutZerodhaSession } from '../api/client';

export default function TopNavbar({ onToggleRightPanel }) {
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const navigate = useNavigate();

  const handleToggleRightPanel = () => {
    const newState = !isRightPanelOpen;
    setIsRightPanelOpen(newState);
    onToggleRightPanel(newState);
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
      setShowLogoutConfirm(false);
      navigate('/zerodha-login', { replace: true });
    } catch (error) {
      console.error('TopNavbar: failed to logout from Zerodha', error);
      setLogoutError('Failed to log out. Please try again.');
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
      <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
          {/* Left side - Dashboard name */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:hidden">
                DASHBOARD
              </span>
              <span className="hidden dark:inline">
                DASHBOARD
              </span>
            </h1>
            {isMockMode && (
              <span className="px-3 py-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full border border-yellow-300 dark:border-yellow-700">
                🎭 MOCK MODE
              </span>
            )}
          </div>

            {/* Right side - Navigation and controls */}
            <div className="flex items-center space-x-8 ml-8">
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link 
                to="/derivatives" 
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
              >
                NIFTY Derivatives
              </Link>
              <Link 
                to="/strike-monitoring" 
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
              >
                Strike Price Monitoring
              </Link>
              </div>

              <div className="flex items-center space-x-3">
                {/* Right Panel Toggle */}
                <button
                  onClick={handleToggleRightPanel}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
                  title={isRightPanelOpen ? 'Hide right panel' : 'Show right panel'}
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

                <button
                  onClick={handleLogoutClick}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 dark:text-red-300 dark:border-red-500/60 dark:hover:border-red-400 rounded-lg transition-all duration-200"
                >
                  Logout Zerodha
                </button>
              </div>
          </div>
        </div>
      </div>
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
    </nav>
  );
}
