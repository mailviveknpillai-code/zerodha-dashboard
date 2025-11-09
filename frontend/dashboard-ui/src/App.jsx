import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { RefreshIntervalProvider } from './contexts/RefreshIntervalContext';
import DashboardLayout from './components/DashboardLayout';
import DerivativesTable from './components/DerivativesTable';
import StrikePriceMonitoring from './components/StrikePriceMonitoring';
import RequireZerodhaSession from './components/RequireZerodhaSession';
import ZerodhaLogin from './components/ZerodhaLogin';

const wrapWithSession = (element) => <RequireZerodhaSession>{element}</RequireZerodhaSession>;

export default function App() {
  return (
    <ThemeProvider>
      <RefreshIntervalProvider>
        <Routes>
          <Route path="/zerodha-login" element={<ZerodhaLogin />} />
          <Route path="/" element={wrapWithSession(<DashboardLayout />)} />
          <Route path="/derivatives" element={wrapWithSession(<DerivativesTable />)} />
          <Route path="/strike-monitoring" element={wrapWithSession(<StrikePriceMonitoring />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RefreshIntervalProvider>
    </ThemeProvider>
  );
}
