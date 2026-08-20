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
// master.css must load BEFORE Responsive.css: Responsive.css's job is to
// override master.css's rules inside @media blocks, but @media alone
// doesn't add specificity — for two same-specificity selectors the one
// later in the cascade wins regardless of which is inside a media query.
// With master.css second (the previous order), its unconditional base
// rules (e.g. `.master-table td { padding: 12px 16px; }`) were silently
// winning over Responsive.css's mobile-narrower overrides on every phone
// width, since master.css's own rule always appeared later in the
// concatenated stylesheet. Same reasoning applies to DashboardLayout.tsx's
// separate Responsive.css import — Vite dedupes the module by resolved
// path, so it keeps the position of this first import below and doesn't
// reintroduce the ordering problem.
import './styles/master.css';
import './styles/Responsive.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
  </Provider>
);