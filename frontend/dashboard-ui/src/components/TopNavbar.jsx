import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import SettingsDropdown from './SettingsDropdown';

export default function TopNavbar() {
  const { isDarkMode } = useTheme();
  const location = useLocation();

  const navClasses = isDarkMode
    ? 'bg-gradient-to-r from-slate-800 via-indigo-900/30 to-slate-800 border-slate-600 text-slate-100'
    : 'bg-gradient-to-r from-blue-50/80 via-purple-50/60 to-blue-50/80 border-gray-200 text-gray-900';

  const linkBase =
    'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200';

  const navLink = (isPrimary) =>
    [
      linkBase,
      isDarkMode
        ? 'text-slate-200 hover:text-blue-300 hover:bg-slate-700'
        : `text-gray-700 hover:${isPrimary ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'} hover:bg-opacity-80`,
    ].join(' ');

  const buttonClasses = [
    'p-2 rounded-lg transition-all duration-200 group',
    isDarkMode
      ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700'
      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
  ].join(' ');

  const dashTextClasses = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
      <nav className={`border-b shadow-sm ${navClasses}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
          {/* Left side - Dashboard name */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              <span className={isDarkMode 
                ? "text-blue-300" 
                : "bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              }>
                DASHBOARD
              </span>
            </h1>
          </div>

            {/* Right side - Navigation and controls */}
            <div className="flex items-center space-x-8 ml-8">
              <div className="flex items-center space-x-3">
                <Link
                  to="/"
                  className={navLink(location.pathname === '/')}
                >
                  Dashboard
                </Link>
                <Link
                  to="/fno-chain"
                  className={navLink(location.pathname === '/fno-chain')}
                >
                  F&O Chain
                </Link>
              </div>

              <div className="flex items-center space-x-3">
                {/* Settings Dropdown */}
                <SettingsDropdown />
              </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
