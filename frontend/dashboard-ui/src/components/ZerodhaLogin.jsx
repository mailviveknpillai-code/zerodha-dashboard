import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchZerodhaSession, fetchZerodhaAuthUrl } from '../api/client';

export default function ZerodhaLogin() {
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    authLoading: false,
    authUrl: null,
    message: '',
    error: null
  });

  const loadSession = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetchZerodhaSession();
      if (result?.active) {
        navigate('/', { replace: true });
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        message: result?.message || 'Please sign in with your Zerodha account to continue.',
        authUrl: prev.authUrl,
        error: null
      }));
    } catch (error) {
      console.error('ZerodhaLogin: failed to check session', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Unable to verify Zerodha session. Please retry.'
      }));
    }
  }, [navigate]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const requestAuthUrl = useCallback(async () => {
    setState(prev => ({ ...prev, authLoading: true, error: null }));
    try {
      const authData = await fetchZerodhaAuthUrl();
      setState(prev => ({
        ...prev,
        authLoading: false,
        authUrl: authData?.auth_url || null,
        message: authData?.message || prev.message || 'Authenticate with Zerodha to continue.'
      }));
    } catch (error) {
      console.error('ZerodhaLogin: failed to fetch auth URL', error);
      setState(prev => ({
        ...prev,
        authLoading: false,
        error: 'Unable to fetch Zerodha login link. Please retry.'
      }));
    }
  }, []);

  const handleLoginClick = () => {
    if (state.authUrl) {
      window.open(state.authUrl, '_blank', 'noopener');
    } else {
      requestAuthUrl();
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Checking Zerodha session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-blue-200 dark:border-slate-700 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 text-xl">
            🔐
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Zerodha Login Required</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {state.message || 'Authenticate with Zerodha to access live derivatives data.'}
            </p>
          </div>
        </div>

        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            {state.error}
          </div>
        )}

        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>Steps to continue:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click “Log in to Zerodha” to open the secure Zerodha Connect page.</li>
            <li>Complete the Zerodha login and PIN verification.</li>
            <li>When redirected back, this dashboard will load automatically.</li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            type="button"
            onClick={handleLoginClick}
            disabled={state.authLoading}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {state.authLoading ? 'Preparing link…' : 'Log in to Zerodha'}
          </button>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <button
              type="button"
              onClick={requestAuthUrl}
              disabled={state.authLoading}
              className="px-4 py-2 rounded-full border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Refresh Link
            </button>
            <button
              type="button"
              onClick={loadSession}
              className="px-4 py-2 rounded-full border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Recheck Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


