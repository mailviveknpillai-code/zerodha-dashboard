import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import AlphaDemo from './components/AlphaDemo';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />} />
      <Route path="/alpha-demo" element={<AlphaDemo />} />
    </Routes>
  );
}
