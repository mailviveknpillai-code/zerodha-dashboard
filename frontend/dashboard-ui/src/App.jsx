import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import DashboardLayout from './components/DashboardLayout';
import DerivativesTable from './components/DerivativesTable';
import StrikePriceMonitoring from './components/StrikePriceMonitoring';
import RequireZerodhaSession from './components/RequireZerodhaSession';
import ZerodhaLogin from './components/ZerodhaLogin';

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/zerodha-login" element={<ZerodhaLogin />} />
        <Route
          path="/"
          element={
            <RequireZerodhaSession>
              <DashboardLayout />
            </RequireZerodhaSession>
          }
        />
        <Route
          path="/derivatives"
          element={
            <RequireZerodhaSession>
              <DerivativesTable />
            </RequireZerodhaSession>
          }
        />
        <Route
          path="/strike-monitoring"
          element={
            <RequireZerodhaSession>
              <StrikePriceMonitoring />
            </RequireZerodhaSession>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
