// V_26.0 — "who is opening this page": the employee's department and
// designation for the page they are on (on Leads a Sales Executive, on
// Customer Details the same person may be the Recovery Head). Shown in the
// top bar on every page.
import { AccessArea, AccessDepartment, AccessProfile } from '../services/accessService';
import { ROUTES } from '../constants';

const E = ROUTES.EMPLOYEE;
const PAGE_AREA: [string, AccessArea][] = [
  [E.LEADS, 'leads'], [E.CALL_REPORT, 'leads'],
  [E.CUSTOMER_DETAILS, 'customers'], [E.PAYMENT_DUES, 'payment_dues'], [E.PAYMENT_RECEIVED, 'payment_received'],
  [E.CANCELLED_BOOKING, 'cancelled_booking'], [E.CUSTOMIZE_SCHEME, 'customize_scheme'], [E.BUILDING_2D_VIEW, 'building_view'],
  [E.EMPLOYEE_DETAILS, 'employee_details'], [E.TEAM_ATTENDANCE, 'attendance_all'],
];

const label = (d: AccessDepartment): string =>
  `${d.department_name} · ${d.designation_name || (d.level === 'head' ? 'Head' : d.level === 'executive' ? 'Executive' : 'Staff')}`;

/** "Recovery · Recovery Head" for this page, or null (no department). */
export function pageRoleLabel(profile: AccessProfile | null, pathname: string): string | null {
  if (!profile || profile.full || profile.departments.length === 0) return null;
  const area = PAGE_AREA.find(([p]) => pathname.startsWith(p))?.[1];
  const grants = (d: AccessDepartment) => !area || (d.areas ?? []).includes(area);
  const candidates = profile.departments.filter(grants);
  const pick = candidates.find((d) => d.level === 'head') ?? candidates[0] ?? profile.departments.find((d) => d.level === 'head') ?? profile.departments[0];
  return label(pick);
}
