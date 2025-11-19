import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchZerodhaAuthUrl, fetchZerodhaSession } from '../api/client';
import { useRefreshInterval } from '../contexts/RefreshIntervalContext';
import ToggleSwitch from './ToggleSwitch';
import { useTheme } from '../contexts/ThemeContext';

export default function ZerodhaLogin() {
  const [authUrl, setAuthUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const navigate = useNavigate();
  const { intervalMs } = useRefreshInterval();
  const { isDarkMode } = useTheme();

  const checkSession = async () => {
    try {
      const session = await fetchZerodhaSession();
      const active =
        session?.status === 'ACTIVE' ||
        session?.status === 'active' ||
        session?.active === true ||
        session?.session_cached === true;
      if (active) {
        setPolling(false);
        navigate('/', { replace: true });
        return true;
      }
    } catch (err) {
      console.error('Error verifying Zerodha session:', err);
    }
    return false;
  };

  const refreshAuthUrl = async () => {
    try {
      setLoading(true);
      setError(null);
      const { url } = await fetchZerodhaAuthUrl();
      if (!url) {
        setError('Zerodha login URL was not returned. Please confirm your API key configuration.');
        setAuthUrl(null);
        return false;
      }
      setAuthUrl(url);
      return true;
    } catch (err) {
      console.error('Error fetching Zerodha auth URL:', err);
      setError('Unable to fetch Zerodha login URL. Please check network connectivity and try again.');
      setAuthUrl(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prime = async () => {
      const alreadyActive = await checkSession();
      if (alreadyActive) {
        return;
      }
      await refreshAuthUrl();
    };

    prime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!polling) return;

    let cancelled = false;

    const pollSession = async () => {
      if (cancelled) return;
      const active = await checkSession();
      if (!active) {
        setPollCount(prev => prev + 1);
      }
    };

    pollSession();
    const timer = setInterval(pollSession, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [polling, intervalMs, navigate]);

  const startPolling = () => {
    setError(null);
    setPolling(true);
    setPollCount(0);
  };

  const stopPolling = () => {
    setPolling(false);
  };

  const openZerodhaLogin = async () => {
    if (!authUrl) {
      const fetched = await refreshAuthUrl();
      if (!fetched) {
        return;
      }
    }

    try {
      const popup = window.open(authUrl, 'kite-login', 'noopener,noreferrer,width=620,height=720,left=120,top=80');
      if (!popup) {
        setError('Popup blocked. Allow popups for this site and try again (look for a blocked-popup icon near the address bar).');
        return;
      }
      popup.focus();
      setError(null);
      startPolling();
    } catch (err) {
      console.error('Failed to open Zerodha login window:', err);
      setError('Unable to open Zerodha login window. Please check popup settings and try again.');
    }
  };

  const pageBackground = isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-gray-900';
  const cardBackground = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200';
  const mutedText = isDarkMode ? 'text-slate-300' : 'text-gray-600';
  const subtleText = isDarkMode ? 'text-slate-400' : 'text-gray-500';
  const buttonBorder = isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-200' : 'border-gray-300 hover:bg-gray-50 text-gray-700';
  const primaryButton = isDarkMode
    ? 'bg-blue-500 hover:bg-blue-600 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  const alertBox = isDarkMode
    ? 'border-red-500/60 bg-red-900/20 text-red-300'
    : 'border-red-200 bg-red-50 text-red-700';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${pageBackground}`}>
        <div className="text-center">
          <div className="w-10 h-10 border-b-2 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-sm ${mutedText}`}>Checking Zerodha session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-10 ${pageBackground}`}>
      <div
        className={`max-w-xl w-full rounded-2xl shadow-xl border p-8 space-y-6 ${cardBackground}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Zerodha Login Required</h1>
            <p className={`mt-1 ${mutedText}`}>
              Connect your Zerodha account to access live derivatives data.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshAuthUrl}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded border transition-colors ${buttonBorder}`}
            title="Refresh Zerodha login URL"
          >
            Refresh Link
          </button>
        </div>

        {error && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${alertBox}`}>
            {error}
          </div>
        )}

        <div className={`space-y-3 text-sm ${mutedText}`}>
          <p>
            Follow the steps below to authenticate your Zerodha session and start the live feed.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Allow popups for this site (check the address bar if blocked).</li>
            <li>Launch the Zerodha login window.</li>
            <li>Complete authentication in the popup.</li>
            <li>Return here; polling will automatically detect the active session.</li>
          </ol>
        </div>

        <div className={`space-y-6 text-xs ${subtleText}`}>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Attempts made: {pollCount}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Session polling is {polling ? 'active' : 'inactive'}.</span>
          </div>
        </div>

        <div className="space-y-3">
          <ToggleSwitch
            enabled={polling}
            onChange={polling ? stopPolling : startPolling}
            label="Session polling"
            description="Automatically check for active Zerodha session"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={openZerodhaLogin}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold shadow transition-colors ${primaryButton}`}
          >
            Open Zerodha Login
          </button>
          <button
            type="button"
            onClick={polling ? stopPolling : startPolling}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border font-semibold transition-colors ${buttonBorder}`}
          >
            {polling ? 'Stop Polling' : 'Start Polling'}
          </button>
        </div>

        {!authUrl && !loading && (
          <div className={`text-xs rounded-md border px-3 py-2 ${alertBox}`}>
            Zerodha login link is currently unavailable. Click "Refresh Link" and ensure your API credentials are correct.
          </div>
        )}

        <div className={`flex items-center gap-3 text-xs ${subtleText}`}>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-400 text-blue-500 font-semibold">i</span>
          <p>
            After logging in, polling checks for an active session and will automatically redirect to the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}



