// ==========================================
// DREAM GROUP CRM - SERVER RESTART GUARD
// ==========================================
//
// CRITICAL: This file must have NO imports from the project.
// It is imported first in main.tsx so it executes BEFORE the Redux store
// is created. This ensures authSlice reads already-cleaned localStorage
// instead of stale auth data from the previous session.
//
// EXECUTION ORDER IN main.tsx:
//   1. This file runs   → clears localStorage if server restarted
//   2. Store initializes → authSlice reads clean localStorage → isAuthenticated: false
//   3. ProtectedRoute   → sees unauthenticated → redirects to /login ✅
//
const VITE_START_KEY  = 'dgcrm_vite_start';
const currentStart    = (window as any).__VITE_START__ as string | undefined;
const storedStart     = sessionStorage.getItem(VITE_START_KEY);

if (currentStart && storedStart && storedStart !== currentStart) {
  // Server was restarted — clear all stale auth data before Redux initializes
  localStorage.removeItem('dgcrm_token');
  localStorage.removeItem('dgcrm_user');
  localStorage.removeItem('dgcrm_role');
  localStorage.removeItem('dgcrm_permissions');
}

// Store current server start time for next comparison
if (currentStart) {
  sessionStorage.setItem(VITE_START_KEY, currentStart);
}