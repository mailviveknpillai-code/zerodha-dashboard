import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { RefreshIntervalProvider } from './contexts/RefreshIntervalContext';
import { VolumeWindowProvider } from './contexts/VolumeWindowContext';
import { TrendAveragingProvider } from './contexts/TrendAveragingContext';
import DashboardLayout from './components/DashboardLayout';
import FnOChain from './components/FnOChain';
import RequireZerodhaSession from './components/RequireZerodhaSession';
import ZerodhaLogin from './components/ZerodhaLogin';
import { setRealViewportHeight } from './utils/viewport';

const wrapWithSession = (element) => <RequireZerodhaSession>{element}</RequireZerodhaSession>;

export default function App() {
  useEffect(() => {
    setRealViewportHeight();
  }, []);

  return (
    <ThemeProvider>
      <RefreshIntervalProvider>
        <VolumeWindowProvider>
          <TrendAveragingProvider>
            <Routes>
              <Route path="/zerodha-login" element={<ZerodhaLogin />} />
              <Route path="/" element={wrapWithSession(<DashboardLayout />)} />
              <Route path="/fno-chain" element={wrapWithSession(<FnOChain />)} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TrendAveragingProvider>
        </VolumeWindowProvider>
      </RefreshIntervalProvider>
    </ThemeProvider>
  );
}