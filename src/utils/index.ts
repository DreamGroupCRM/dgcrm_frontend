// ==========================================
// DREAM GROUP CRM - UTILITY FUNCTIONS
// ==========================================
import Swal from 'sweetalert2';
import { BaseRole, isAdminRole, isCustomerRole } from '../types';
import { ROUTES } from '../constants';
import { getFileToken } from '../services/fileAccessService';

// Single source of truth for "where does this role land" — used by
// PublicRoute/ProtectedRoute/LoginPage/Header/Sidebar so a new role (e.g.
// 'customer') only needs to be taught here once, instead of in every
// isAdminRole(role) ? ADMIN : EMPLOYEE ternary that used to be scattered
// across those files.
export const homeRouteForRole = (role: BaseRole | null): string => {
  if (isAdminRole(role)) return ROUTES.ADMIN.DASHBOARD;
  if (isCustomerRole(role)) return ROUTES.CUSTOMER.HOME;
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
// Uploaded files are served from `/api/files/...`, NOT `/files/...`. The
// production IIS site reverse-proxies only `^api/(.*)` to the Node backend
// (dgcrm_frontend/public/web.config); any other path falls through to the
// SPA catch-all and is rewritten to /index.html. A browser asking for
// `/files/customers/x.jpg` therefore received index.html with a 200 — the
// image rendered broken and a "download" saved an HTML page. That is the
// "uploaded files are not visible" bug, and it was never a permissions,
// folder or disk problem: the files live in MySQL's file_blobs table and
// were always there.
//
// Rows written before the fix still hold the legacy `/files/...` value, so
// that shape is remapped HERE, at render time, rather than by rewriting
// the database. That keeps old and new uploads working side by side with
// no migration to run and nothing to undo on a rollback.
const LEGACY_FILES_PREFIX = '/files/';
const FILES_PREFIX = '/api/files/';

const toServedPath = (path: string): string =>
  path.startsWith(LEGACY_FILES_PREFIX)
    ? FILES_PREFIX + path.slice(LEGACY_FILES_PREFIX.length)
    : path;

export const resolveFileUrl = (url: string | null | undefined): string => {
  if (!url) return '';

  // blob: (a freshly-picked local file preview) and data: URIs are already
  // complete and must never be rewritten.
  if (/^(blob|data):/i.test(url)) return url;

  // An absolute http(s) URL from a legacy row, saved back when fileUrl()
  // baked in scheme+host. Its host may well be wrong (that was the earlier
  // mixed-content bug), so keep only the path and let it resolve against
  // the page's own origin — the same normalisation scripts/fix-absolute-
  // file-urls.ts performs in the database, applied at render time so it
  // works whether or not that script has been run.
  if (/^https?:\/\//i.test(url)) {
    try {
      const { pathname, search } = new URL(url);
      if (pathname.startsWith(LEGACY_FILES_PREFIX) || pathname.startsWith(FILES_PREFIX)) {
        return resolveFileUrl(toServedPath(pathname) + search);
      }
    } catch { /* not parseable — fall through and use it as-is */ }
    return url;
  }

  // Protocol-relative '//host/...' — someone else's origin, leave alone.
  if (url.startsWith('//')) return url;
  // Anything else that isn't root-relative isn't ours to resolve.
  if (!url.startsWith('/')) return url;

  const path = toServedPath(url);

  // Production: VITE_API_BASE_URL is '/api' (same origin as the page), so
  // the relative path is already correct and is returned untouched. Local
  // dev: it is an absolute 'http://localhost:5000/api', because Vite and
  // the API run on different ports — there the path has to be pinned to
  // the API's origin or it would resolve against the dev server.
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const base = /^https?:\/\//i.test(apiBase) ? new URL(apiBase).origin + path : path;

  // Uploaded files are no longer public (see the backend's
  // shared/fileAccess.ts). A browser will not put an Authorization header
  // on an <img>/<iframe> request, so the credential rides in the query
  // string instead — a short-lived token scoped to reading files and
  // nothing else. Requests made through axios (the document viewer,
  // Download) already send the session header and do not need this.
  //
  // Appended only to paths this app actually serves, and only when a token
  // is present: with no token the URL is exactly what it was before, so
  // nothing here can break a page on its own.
  if (!path.startsWith(FILES_PREFIX)) return base;
  const fk = getFileToken();
  if (!fk) return base;
  return base + (base.includes('?') ? '&' : '?') + 'fk=' + encodeURIComponent(fk);
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
  /**
   * Confirm + require a free-text reason in the same dialog — used by the
   * Cancelled Booking flow (cancelling a customer's booking must never
   * submit without a reason). Returns the typed reason on confirm, or
   * isConfirmed:false if the admin backs out; SweetAlert2's own
   * inputValidator blocks the Confirm button until non-blank text is
   * entered, so a caller never has to re-check for an empty reason itself.
   */
  confirmWithReason: async (message: string, title: string, confirmButtonText = 'Confirm'): Promise<{ isConfirmed: boolean; reason: string }> => {
    const result = await Swal.fire({
      icon: 'warning',
      title,
      text: message,
      input: 'textarea',
      inputPlaceholder: 'Enter a reason...',
      inputValidator: (value) => (!value || !value.trim() ? 'A reason is required.' : undefined),
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText,
      cancelButtonText: 'Back',
    });
    return { isConfirmed: !!result.isConfirmed, reason: (result.value as string | undefined)?.trim() || '' };
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
 * Format a date for display as DD/MM/YYYY (V_23.0 item 16 — one date
 * format everywhere; this previously produced "20 Jun 2026").
 *
 * Built from the local-time parts rather than toLocaleDateString: the
 * en-IN locale already yields DD/MM/YYYY, but the output is only as
 * reliable as the runtime's ICU data, and a plain 'yyyy-mm-dd' string
 * (what every date input and most API fields carry here) is parsed as UTC
 * by `new Date`, which then reports the previous day for anyone behind
 * UTC. Splitting a date-only string by hand avoids that shift entirely;
 * a full timestamp still goes through Date and is shown in local time,
 * which is what a timestamp should do.
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';

  const dateOnly = DATE_ONLY.exec(dateString.trim());
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${parsed.getFullYear()}`;
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
