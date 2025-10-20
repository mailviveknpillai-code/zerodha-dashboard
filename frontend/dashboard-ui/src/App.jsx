import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import DashboardLayout from './components/DashboardLayout';
import AlphaDemo from './components/AlphaDemo';
import DerivativesTable from './components/DerivativesTable';
import StrikePriceMonitoring from './components/StrikePriceMonitoring';

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<DashboardLayout />} />
        <Route path="/alpha-demo" element={<AlphaDemo />} />
        <Route path="/derivatives" element={<DerivativesTable />} />
        <Route path="/strike-monitoring" element={<StrikePriceMonitoring />} />
      </Routes>
    </ThemeProvider>
  );
}
