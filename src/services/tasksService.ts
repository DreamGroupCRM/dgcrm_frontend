// src/services/tasksService.ts
// ==========================================
// DREAM GROUP CRM - TASKS SERVICE
// ==========================================
// Talks to the real backend `tasks` module (`/api/tasks` — bare CRUD, see
// tasks.routes.ts in dgcrm_backend). V_22.0 — backs the Payment Due page's
// per-row Follow-up action (a note + follow-up date + assigned employee,
// tied to the customer via customer_id).

import axiosInstance from './axiosConfig';

export interface Task {
  id: number | string;
  company_id: number | string;
  title: string;
  description: string | null;
  priority: string;
  assigned_to: number | string | null;
  assigned_to_name: string | null;
  assigned_by: number | string | null;
  customer_id: number | string | null;
  customer_name: string | null;
  due_date: string | null;
  status: string;
  is_active: boolean;
  is_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskListFilters {
  status?: string;
  assigned_to?: string | number;
  customer_id?: string | number;
  due_date?: string; // YYYY-MM-DD
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  priority?: string;
  assigned_to?: string | number | null;
  due_date?: string | null;
  customer_id?: string | number | null;
}

/** GET /api/tasks?... */
export const fetchTasks = async (filters?: TaskListFilters): Promise<Task[]> => {
  const params: Record<string, string | number> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.assigned_to) params.assigned_to = filters.assigned_to;
  if (filters?.customer_id) params.customer_id = filters.customer_id;
  if (filters?.due_date) params.due_date = filters.due_date;
  const res = await axiosInstance.get('/tasks', { params });
  return (res.data.data ?? []) as Task[];
};

/** POST /api/tasks */
export const createTask = async (payload: CreateTaskPayload): Promise<Task> => {
  const res = await axiosInstance.post('/tasks', payload);
  return res.data.data as Task;
};

export const tasksService = {
  fetchTasks,
  createTask,
};

export default tasksService;
