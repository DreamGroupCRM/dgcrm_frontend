// ==========================================
// DREAM GROUP CRM - ENTRY POINT
// ==========================================

// CRITICAL: Must be the FIRST import — runs before Redux store initializes.
// Clears localStorage if Vite server was restarted, so authSlice starts clean.
import './utils/serverRestartGuard';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';
import './styles/Responsive.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
  </Provider>
);