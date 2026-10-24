// V_25.0 — the logged-in employee's access (pages, Head team, "Can Add
// Customer"), from GET /api/access/me. Fetched fresh once per page load
// (not stored with the login), so a Super Admin's Department Setup change
// shows up on the employee's next page load without logging out. V_26.0 —
// also fetched again when the tab comes back into focus and every few
// minutes, so a new page shows in the menu without reloading.
// Admin / Super Admin: everything allowed, no request made.
import { useEffect, useState } from 'react';
import { useAppSelector } from './index';
import { isAdminRole } from '../types';
import { ACCESS_AREAS, AccessArea, AccessProfile, fetchMyAccess } from '../services/accessService';

const FULL: AccessProfile = {
  full: true, legacy: false, employee_id: null, areas: [...ACCESS_AREAS], departments: [],
  head_of: [], can_add_customer: true, customer_team: [], lead_team: [],
};

const REFRESH_MS = 5 * 60 * 1000;
const FOCUS_MIN_MS = 60 * 1000;
let cached: { token: string | null; promise: Promise<AccessProfile>; at: number } | null = null;

function load(token: string, force = false): Promise<AccessProfile> {
  if (force || !cached || cached.token !== token) {
    const promise = fetchMyAccess();
    cached = { token, promise, at: Date.now() };
    promise.catch(() => { if (cached?.promise === promise) cached = null; });
  }
  return cached.promise;
}

export function useAccessProfile(): { profile: AccessProfile | null; loading: boolean; failed: boolean; has: (area: AccessArea) => boolean } {
  const role = useAppSelector((s) => s.auth.role);
  const token = useAppSelector((s) => s.auth.token);
  const admin = isAdminRole(role);
  const [profile, setProfile] = useState<AccessProfile | null>(admin ? FULL : null);
  // V_26.0 — the request failed: pages fall back to the server's own checks.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (admin) { setProfile(FULL); return; }
    if (!token) { setProfile(null); return; }
    let alive = true;
    const apply = (force: boolean) => load(token, force)
      .then((p) => { if (alive) { setProfile(p); setFailed(false); } })
      .catch(() => { if (alive && !force) setFailed(true); /* keep the last profile; pages fall back to server checks */ });
    apply(false);
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      // Several hooks are mounted (menu, page): the first one fetches, the
      // others pick up that same fresh request.
      apply(!(cached && Date.now() - cached.at < FOCUS_MIN_MS));
    };
    const timer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [admin, token]);

  return {
    profile,
    loading: !admin && profile == null && !failed,
    failed,
    has: (area) => admin || Boolean(profile?.areas.includes(area)),
  };
}
