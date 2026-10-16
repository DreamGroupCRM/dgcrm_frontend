// src/services/backupService.ts
// ==========================================
// DGCRM BACKUP SNAPSHOT SERVICE
// ==========================================
// Talks to GET/POST /api/backup/snapshots (see modules/backup/ in
// dgcrm_backend). Admin and Super Admin may list, create and download;
// Restore and Delete are Super Admin only — all enforced server-side.
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
// No timeout (same as download-sql): copying a large live database takes
// longer than the app-wide 10 s limit, which used to abort the request and
// show "Failed to create snapshot." while the server was still working.
export const createSnapshot = async (label?: string): Promise<BackupSnapshot> => {
  const res = await axiosInstance.post('/backup/snapshots', { label: label || undefined }, { timeout: 0 });
  return res.data.data;
};

export interface RestoreResult {
  safety_snapshot_id: number;
  restored: Record<string, number>;
  skipped: string[];
}

/** POST /api/backup/snapshots/:id/restore — confirm must be the literal string "RESTORE" */
export const restoreSnapshot = async (id: number): Promise<RestoreResult> => {
  // No timeout — a restore first takes a safety snapshot, then rewrites every table.
  const res = await axiosInstance.post(`/backup/snapshots/${id}/restore`, { confirm: 'RESTORE' }, { timeout: 0 });
  return res.data.data;
};

/** DELETE /api/backup/snapshots/:id */
export const deleteSnapshot = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/backup/snapshots/${id}`);
};

/**
 * GET /api/backup/download-sql — the current database as a .sql file
 * (Admin / Super Admin). Saved straight to the user's computer.
 */
export const downloadSqlBackup = async (): Promise<void> => {
  // No timeout: a full dump of a large database can take a while.
  const res = await axiosInstance.get('/backup/download-sql', { responseType: 'blob', timeout: 0 });
  const match = /filename="([^"]+)"/.exec(String(res.headers['content-disposition'] ?? ''));
  const name = match?.[1] ?? `dgcrm-backup-${new Date().toISOString().slice(0, 10)}.sql`;
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
