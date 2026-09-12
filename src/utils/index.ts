// ==========================================
// DREAM GROUP CRM - UTILITY FUNCTIONS
// ==========================================
import Swal from 'sweetalert2';
import { BaseRole, isAdminRole, isCustomerRole } from '../types';
import { ROUTES } from '../constants';

// Single source of truth for "where does this role land" — used by
// PublicRoute/ProtectedRoute/LoginPage/Header/Sidebar so a new role (e.g.
// 'customer') only needs to be taught here once, instead of in every
// isAdminRole(role) ? ADMIN : EMPLOYEE ternary that used to be scattered
// across those files.
export const homeRouteForRole = (role: BaseRole | null): string => {
  if (isAdminRole(role)) return ROUTES.ADMIN.DASHBOARD;
  if (isCustomerRole(role)) return ROUTES.CUSTOMER.DASHBOARD;
  return ROUTES.EMPLOYEE.DASHBOARD;
};

// Human-readable label for a BaseRole — shared by loginSuccess/logoutSuccess
// below and Sidebar.tsx's own role display.
export const roleLabelFor = (role: BaseRole | null): string =>
  role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin' : role === 'customer' ? 'Customer' : 'Employee';

// V_22.0 — the backend now stores uploaded file URLs (customer/employee
// photos, ID scans, company logos) as relative paths ('/files/...') instead
// of an absolute URL baked in at upload time — that absolute-URL approach
// silently produced `http://` links on the live HTTPS site whenever a
// reverse proxy sat in front of the app (req.protocol reports the proxy's
// internal connection, not what the browser actually used), and browsers
// refuse to load `http://` images as mixed content on an `https://` page —
// the "images not showing" bug. A relative path has no scheme/host to get
// wrong on the production site itself (VITE_API_BASE_URL is also relative
// there, '/api', same origin as the page). This resolver exists only for
// local dev, where the frontend (Vite) and backend run on different
// origins/ports, so a bare relative path would otherwise resolve against
// the frontend dev server instead of the API. Also passes through any
// already-absolute URL unchanged, so legacy rows saved before this fix
// keep working until they're backfilled.
export const resolveFileUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  // Only a root-relative path ('/files/...') needs resolving — anything
  // else (an already-absolute http(s) URL from a legacy row, a blob: URL
  // from a freshly-picked local file preview, a data: URI, or a
  // protocol-relative '//host/...') is left exactly as it is.
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  if (/^https?:\/\//i.test(apiBase)) return new URL(apiBase).origin + url;
  return url;
};

/**
 * SweetAlert2 notifications
 */
export const showAlert = {
  success: (message: string, title = 'Success') => {
    return Swal.fire({
      icon: 'success',
      title,
      text: message,
      timer: 2500,
      showConfirmButton: false,
      position: 'top',
      toast: true,
      timerProgressBar: true,
    });
  },
  error: (message: string, title = 'Error') => {
    return Swal.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonColor: '#1a5c38',
    });
  },
  warning: (message: string, title = 'Warning') => {
    return Swal.fire({
      icon: 'warning',
      title,
      text: message,
      confirmButtonColor: '#1a5c38',
    });
  },
  info: (message: string, title = 'Info') => {
    return Swal.fire({
      icon: 'info',
      title,
      text: message,
      confirmButtonColor: '#1a5c38',
    });
  },
  confirm: (message: string, title = 'Are you sure?') => {
    return Swal.fire({
      icon: 'question',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonColor: '#1a5c38',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
    });
  },
  /**
   * Warn-but-allow confirm: shows the base confirm message plus a scrollable
   * list of affected items (e.g. employees currently assigned to a
   * department/designation being deleted). The admin can still confirm and
   * proceed — this is a warning, not a hard block.
   */
  confirmWithList: (message: string, title: string, items: string[]) => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const listHtml = items.length
      ? `<div style="text-align:left;max-height:180px;overflow-y:auto;margin-top:10px;padding:8px 12px;background:#fff7e6;border:1px solid #ffd591;border-radius:6px;font-size:13px;">${items
          .map((i) => `<div style="padding:2px 0;">• ${esc(i)}</div>`)
          .join('')}</div>`
      : '';
    return Swal.fire({
      icon: 'warning',
      title,
      html: `<div>${esc(message)}</div>${listHtml}`,
      showCancelButton: true,
      confirmButtonColor: '#d9822b',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Continue Anyway',
      cancelButtonText: 'Cancel',
    });
  },
  /** Shows "Super Admin/Admin/Employee Logged in Successfully" based on base_role */
  loginSuccess: (baseRole: BaseRole) => {
    const roleLabel = roleLabelFor(baseRole);
    return Swal.fire({
      icon: 'success',
      title: `${roleLabel} Logged in Successfully`,
      text: 'Welcome to Dream Group CRM!',
      timer: 1500,
      showConfirmButton: false,
      position: 'top',
      toast: true,
      timerProgressBar: true,
    });
  },
  /** Shows "Super Admin/Admin/Employee Logged out Successfully" based on base_role */
  logoutSuccess: (baseRole: BaseRole) => {
    const roleLabel = roleLabelFor(baseRole);
    return Swal.fire({
      icon: 'success',
      title: `${roleLabel} Logged out Successfully`,
      text: 'You have been safely logged out.',
      timer: 1500,
      showConfirmButton: false,
      position: 'top',
      toast: true,
      timerProgressBar: true,
    });
  },
};

/**
 * Format date string
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Formats last_login_at from ISO string → "20th June 2026, 08:30:54 AM"
export const formatLastLogin = (isoString: string | null): string => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';

  // Get ordinal suffix: 1st, 2nd, 3rd, 4th...
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? 'st'
    : day % 10 === 2 && day !== 12 ? 'nd'
    : day % 10 === 3 && day !== 13 ? 'rd'
    : 'th';

  const month = date.toLocaleString('en-IN', { month: 'long' });
  const year  = date.getFullYear();
  const time  = date.toLocaleString('en-IN', {
    hour  : '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).toUpperCase();

  return `${day}${suffix} ${month} ${year}, ${time}`;
};


// ── Indian-numbering amount-in-words (Crore/Lakh/Thousand, not
// Million/Billion) — shared by the Payment Receipt PDF/view and any other
// place that needs to spell out a rupee amount the way a printed receipt
// does ("Eighty Thousand Only"). Whole rupees only — payment amounts here
// are always whole numbers, so no paise handling is needed.
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const threeDigitsToWords = (n: number): string => {
  let words = '';
  if (n >= 100) { words += `${ONES[Math.floor(n / 100)]} Hundred `; n %= 100; }
  if (n >= 20) { words += `${TENS[Math.floor(n / 10)]} `; n %= 10; }
  if (n > 0) words += `${ONES[n]} `;
  return words.trim();
};

export const numberToIndianWords = (amount: number): string => {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return 'Zero Rupees Only';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (rest) parts.push(threeDigitsToWords(rest));

  return `${parts.join(' ')} Only`.replace(/\s+/g, ' ').trim();
};

/**
 * Get user initials for avatar
 */
export const getInitials = (name: string): string => {
  if (!name) return 'DG';
  const parts = name.trim().split(' ');
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
};
