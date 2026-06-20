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
  /** Shows "Admin Logged in Successfully" or "Employee Logged in Successfully" based on base_role */
  loginSuccess: (baseRole: 'admin' | 'employee') => {
    const roleLabel = baseRole === 'admin' ? 'Admin' : 'Employee';
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
  logoutSuccess: (baseRole: 'admin' | 'employee') => {
    const roleLabel = baseRole === 'admin' ? 'Admin' : 'Employee';
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
