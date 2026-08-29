// src/services/userManagementService.ts
// ==========================================
// DGCRM SUPER ADMIN — USER MANAGEMENT SERVICE
// ==========================================
// Talks to /api/user-management/* (see modules/userManagement/ in
// dgcrm_backend). Manages LOGIN ACCOUNTS only — enable/disable/delete/
// set-password never touches the linked Employee/Customer business record
// (see that module's own repository header for why). SuperAdmin-only,
// enforced server-side.
import axiosInstance from './axiosConfig';

export interface UserManagementRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string | null;
  base_role: string;
  is_active: boolean;
  allow_login: boolean;
  must_change_password: boolean;
  is_locked: boolean;
  last_login_at: string | null;
  created_at: string;
  linked_employee_id: number | null;
  linked_employee_name: string | null;
  linked_customer_id: number | null;
  linked_customer_name: string | null;
}

/** GET /api/user-management/users */
export const fetchUsers = async (): Promise<UserManagementRow[]> => {
  const res = await axiosInstance.get('/user-management/users');
  return res.data.data;
};

/** PATCH /api/user-management/users/:id/active-status */
export const setUserActiveStatus = async (id: number, is_active: boolean): Promise<void> => {
  await axiosInstance.patch(`/user-management/users/${id}/active-status`, { is_active });
};

/** DELETE /api/user-management/users/:id */
export const deleteUser = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/user-management/users/${id}`);
};

/** POST /api/user-management/users/:id/set-password */
export const adminSetPassword = async (id: number, new_password: string): Promise<void> => {
  await axiosInstance.post(`/user-management/users/${id}/set-password`, { new_password });
};
