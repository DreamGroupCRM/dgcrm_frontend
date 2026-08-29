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
