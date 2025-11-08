import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchZerodhaSession } from '../api/client';

export default function RequireZerodhaSession({ children }) {
  const [state, setState] = useState({ loading: true, active: false });

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const result = await fetchZerodhaSession();
        if (!mounted) return;

        if (result?.active) {
          setState({ loading: false, active: true });
        } else {
          setState({ loading: false, active: false });
        }
      } catch (error) {
        console.error('RequireZerodhaSession: failed to verify session', error);
        if (mounted) {
          setState({ loading: false, active: false });
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Verifying Zerodha session…</p>
        </div>
      </div>
    );
  }

  if (!state.active) {
    return <Navigate to="/zerodha-login" replace />;
  }

  return <>{children}</>;
}


