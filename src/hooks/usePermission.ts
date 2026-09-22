// ==========================================
// DGCRM — GRANULAR MODULE/ACTION PERMISSION CHECK (V_24.0)
// ==========================================
// The backend has resolved a per-module/action permission matrix
// (EmployeePermission override, else RolePermission, else deny — see
// backend's permissions.repository.ts's getEffectivePermission) and
// shipped it on login as state.auth.permissions (authSlice.ts) ever
// since that existed — but nothing on the frontend actually read it
// until now: every checkPermission()-gated backend route just let the
// button/action show unconditionally and relied on a 403 to stop a
// caller without the permission. This hook is the first frontend
// consumer, added so the Assign action can be hidden (not just
// rejected after the fact) for an employee who lacks it — matching the
// backend's own bypass rule so admin/superadmin never need this check
// at all.
import { useAppSelector } from './index';
import { isAdminRole } from '../types';

/** True if the current login may perform `action` on `module` — either
 *  because they're admin/superadmin (who bypass every granular check,
 *  same as the backend's checkPermission middleware), or because
 *  state.auth.permissions[module][action] was resolved true at login. */
export function usePermission(module: string, action: string): boolean {
  const role = useAppSelector((s) => s.auth.role);
  const permissions = useAppSelector((s) => s.auth.permissions);
  if (isAdminRole(role)) return true;
  return Boolean(permissions?.[module]?.[action]);
}
