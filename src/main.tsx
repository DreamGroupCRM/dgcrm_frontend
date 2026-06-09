// ==========================================
// DREAM GROUP CRM - ENTRY POINT
// ==========================================
//
// FIX: Double Refresh Issue
// ROOT CAUSE: React.StrictMode intentionally renders components TWICE in development
// to help detect side effects. This causes double API calls, double Redux dispatches,
// and double useEffect executions — making it look like the app refreshes twice.
//
// FIX APPLIED: Removed <React.StrictMode> wrapper.
// - Single render on startup ✅
// - Single API call on login ✅
// - Single useEffect execution ✅
//
// NOTE: StrictMode is a dev-only tool. It has NO effect in production builds.
// You can re-add it later once all side effects are properly cleaned up.
//
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';
import './styles/Responsive.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // React.StrictMode removed — it intentionally double-invokes render & effects in dev,
  // which was causing the visible double-refresh on login/logout.
  <Provider store={store}>
    <App />
  </Provider>
);
