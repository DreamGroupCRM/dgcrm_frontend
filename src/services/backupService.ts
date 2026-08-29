// src/services/backupService.ts
// ==========================================
// DGCRM BACKUP SNAPSHOT SERVICE
// ==========================================
// Talks to GET/POST /api/backup/snapshots (see modules/backup/ in
// dgcrm_backend). SuperAdmin-only — every call 403s for any other role,
// enforced server-side (requireSuperAdmin), not just by hiding the page.
import axiosInstance from './axiosConfig';

export interface BackupSnapshot {
  id: number;
  label: string;
  is_safety_snapshot: boolean;
  size_bytes: number;
  table_counts: Record<string, number>;
  created_at: string;
  created_by: number | null;
  created_by_name: string | null;
}

/** GET /api/backup/snapshots */
export const fetchSnapshots = async (): Promise<BackupSnapshot[]> => {
  const res = await axiosInstance.get('/backup/snapshots');
  return res.data.data;
};

/** POST /api/backup/snapshots */
export const createSnapshot = async (label?: string): Promise<BackupSnapshot> => {
  const res = await axiosInstance.post('/backup/snapshots', { label: label || undefined });
  return res.data.data;
};

export interface RestoreResult {
  safety_snapshot_id: number;
  restored: Record<string, number>;
  skipped: string[];
}

/** POST /api/backup/snapshots/:id/restore — confirm must be the literal string "RESTORE" */
export const restoreSnapshot = async (id: number): Promise<RestoreResult> => {
  const res = await axiosInstance.post(`/backup/snapshots/${id}/restore`, { confirm: 'RESTORE' });
  return res.data.data;
};

/** DELETE /api/backup/snapshots/:id */
export const deleteSnapshot = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/backup/snapshots/${id}`);
};
