// ==========================================
// DREAM GROUP CRM - UTILITY FUNCTIONS
// ==========================================
import Swal from 'sweetalert2';

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
  /** Shows "Admin/Super Admin/Employee Logged in Successfully" based on base_role */
  loginSuccess: (baseRole: 'admin' | 'employee' | 'superadmin') => {
    const roleLabel = baseRole === 'superadmin' ? 'Super Admin' : baseRole === 'admin' ? 'Admin' : 'Employee';
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
  /** Shows "Admin Logged out Successfully" or "Employee Logged out Successfully" based on base_role */
  logoutSuccess: (baseRole: 'admin' | 'employee' | 'superadmin') => {
    const roleLabel = baseRole === 'superadmin' ? 'Super Admin' : baseRole === 'admin' ? 'Admin' : 'Employee';
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
