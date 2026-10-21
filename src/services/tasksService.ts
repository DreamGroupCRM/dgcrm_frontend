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
  assigned_by_name?: string | null; // who logged it (GET /tasks only)
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
  /** V_26.0 — 'general': tasks with no customer (Tasks / My Tasks pages);
   * 'follow_up': customer follow-ups (Payment Due). */
  kind?: 'general' | 'follow_up';
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
  if (filters?.kind) params.kind = filters.kind;
  const res = await axiosInstance.get('/tasks', { params });
  return (res.data.data ?? []) as Task[];
};

/** POST /api/tasks */
export const createTask = async (payload: CreateTaskPayload): Promise<Task> => {
  const res = await axiosInstance.post('/tasks', payload);
  return res.data.data as Task;
};

export interface UpdateTaskPayload {
  title: string;
  description?: string | null;
  status?: string;
  due_date?: string | null;
  // Honoured for admins only (server-side); leave out to keep the assignee.
  assigned_to?: string | number | null;
}

/** PUT /api/tasks/:id */
export const updateTask = async (id: string | number, payload: UpdateTaskPayload): Promise<Task> => {
  const res = await axiosInstance.put(`/tasks/${id}`, payload);
  return res.data.data as Task;
};

export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export const TASK_PRIORITY_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };

/** V_26.0 — an employee an Admin may assign a general task to. */
export interface TaskAssignee {
  id: number | string;
  employee_code: string | null;
  name: string;
  departments: string | null;
  designations: string | null;
}

/** GET /api/tasks/assignees (admin only) */
export const fetchTaskAssignees = async (): Promise<TaskAssignee[]> => {
  const res = await axiosInstance.get('/tasks/assignees');
  return (res.data.data ?? []) as TaskAssignee[];
};

/** DELETE /api/tasks/:id (admin only) */
export const deleteTask = async (id: string | number): Promise<void> => {
  await axiosInstance.delete(`/tasks/${id}`);
};

export const tasksService = {
  fetchTasks,
  createTask,
  updateTask,
  fetchTaskAssignees,
  deleteTask,
};

export default tasksService;
