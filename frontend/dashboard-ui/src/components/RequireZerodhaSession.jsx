import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchZerodhaSession } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';

export default function RequireZerodhaSession({ children }) {
  const [checking, setChecking] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const verify = async () => {
      try {
        const session = await fetchZerodhaSession();
        const active =
          session?.status === 'ACTIVE' ||
          session?.status === 'active' ||
          session?.active === true ||
          session?.session_cached === true;

        if (active) {
          setSessionActive(true);
        } else {
          navigate('/zerodha-login', { replace: true });
        }
      } catch (error) {
        console.error('Error verifying Zerodha session:', error);
        navigate('/zerodha-login', { replace: true });
      } finally {
        setChecking(false);
      }
    };

    verify();
  }, [navigate]);

  if (checking) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-gray-900'}`}>
        <div className="text-center">
          <div className="w-10 h-10 border-b-2 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Verifying Zerodha session…</p>
        </div>
      </div>
    );
  }

  if (!sessionActive) {
    return null;
  }

  return <>{children}</>;
}



