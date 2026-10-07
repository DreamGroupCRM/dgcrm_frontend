// V_25.0 — the logged-in employee's access (pages, Head team, "Can Add
// Customer"), from GET /api/access/me. Fetched fresh once per page load
// (not stored with the login), so a Super Admin's Department Setup change
// shows up on the employee's next page load without logging out.
// Admin / Super Admin: everything allowed, no request made.
import { useEffect, useState } from 'react';
import { useAppSelector } from './index';
import { isAdminRole } from '../types';
import { ACCESS_AREAS, AccessArea, AccessProfile, fetchMyAccess } from '../services/accessService';

const FULL: AccessProfile = {
  full: true, legacy: false, employee_id: null, areas: [...ACCESS_AREAS], departments: [],
  head_of: [], can_add_customer: true, customer_team: [], lead_team: [],
};

let cached: { token: string | null; promise: Promise<AccessProfile> } | null = null;

export function useAccessProfile(): { profile: AccessProfile | null; loading: boolean; has: (area: AccessArea) => boolean } {
  const role = useAppSelector((s) => s.auth.role);
  const token = useAppSelector((s) => s.auth.token);
  const admin = isAdminRole(role);
  const [profile, setProfile] = useState<AccessProfile | null>(admin ? FULL : null);

  useEffect(() => {
    if (admin) { setProfile(FULL); return; }
    if (!token) { setProfile(null); return; }
    if (!cached || cached.token !== token) {
      cached = { token, promise: fetchMyAccess() };
      cached.promise.catch(() => { cached = null; });
    }
    let alive = true;
    cached.promise.then((p) => { if (alive) setProfile(p); }).catch(() => { /* keep null: pages fall back to server checks */ });
    return () => { alive = false; };
  }, [admin, token]);

  return {
    profile,
    loading: !admin && profile == null,
    has: (area) => admin || Boolean(profile?.areas.includes(area)),
  };
}
