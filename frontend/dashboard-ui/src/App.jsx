import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { RefreshIntervalProvider } from './contexts/RefreshIntervalContext';
import { VolumeWindowProvider } from './contexts/VolumeWindowContext';
import { TrendAveragingProvider } from './contexts/TrendAveragingContext';
import { TrendThresholdProvider } from './contexts/TrendThresholdContext';
import { EatenDeltaWindowProvider } from './contexts/EatenDeltaWindowContext';
import { ApiPollingIntervalProvider } from './contexts/ApiPollingIntervalContext';
import { DebugModeProvider } from './contexts/DebugModeContext';
import { LtpMovementCacheSizeProvider } from './contexts/LtpMovementCacheSizeContext';
import { LtpMovementWindowProvider } from './contexts/LtpMovementWindowContext';
import { SpotLtpIntervalProvider } from './contexts/SpotLtpIntervalContext';
import DashboardLayout from './components/DashboardLayout';
import FnOChain from './components/FnOChain';
import RequireZerodhaSession from './components/RequireZerodhaSession';
import ZerodhaLogin from './components/ZerodhaLogin';
import ErrorBoundary from './components/ErrorBoundary';
import { setRealViewportHeight } from './utils/viewport';

const wrapWithSession = (element) => <RequireZerodhaSession>{element}</RequireZerodhaSession>;

export default function App() {
  useEffect(() => {
    setRealViewportHeight();
  }, []);

  return (
    <ThemeProvider>
      <DebugModeProvider>
        <RefreshIntervalProvider>
          <VolumeWindowProvider>
            <TrendAveragingProvider>
              <TrendThresholdProvider>
                <EatenDeltaWindowProvider>
                  <LtpMovementCacheSizeProvider>
                    <LtpMovementWindowProvider>
                      <SpotLtpIntervalProvider>
                      <ApiPollingIntervalProvider>
                        <ErrorBoundary>
                          <Routes>
                            <Route path="/zerodha-login" element={<ZerodhaLogin />} />
                            <Route path="/" element={wrapWithSession(<DashboardLayout />)} />
                            <Route path="/fno-chain" element={wrapWithSession(<FnOChain />)} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </ErrorBoundary>
                      </ApiPollingIntervalProvider>
                    </SpotLtpIntervalProvider>
                    </LtpMovementWindowProvider>
                  </LtpMovementCacheSizeProvider>
                </EatenDeltaWindowProvider>
              </TrendThresholdProvider>
            </TrendAveragingProvider>
          </VolumeWindowProvider>
        </RefreshIntervalProvider>
      </DebugModeProvider>
    </ThemeProvider>
  );
}