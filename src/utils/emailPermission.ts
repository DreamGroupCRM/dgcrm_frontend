// ==========================================
// DGCRM — WHO MAY CHANGE AN EMAIL ADDRESS
// ==========================================
// An email address is a login credential, not an ordinary profile field:
// users.email is what the login form matches and what every outbound
// notification is addressed to. Only an Admin (or Super Admin) may change
// one, so the field renders read-only for everyone else.
//
// This is the client half of a rule the server enforces independently —
// see employees.service.ts's EMAIL_ADMIN_ONLY_MESSAGE and its
// updateEmployee guard. The message is defined once, here and there, so
// the user is told exactly the same thing whichever half stops them.
import { useAppSelector } from '../hooks';

export const EMAIL_ADMIN_ONLY_MESSAGE = 'Email can only be changed by an Admin.';

export function canChangeEmail(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function useCanChangeEmail(): boolean {
  const role = useAppSelector((s) => s.auth.role);
  return canChangeEmail(role);
}
