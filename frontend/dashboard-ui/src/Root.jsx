import React from 'react';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

export default function Root() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
