// src/services/draftsService.ts
// ==========================================
// DGCRM — SAVE AS DRAFT (V_25.0)
// ==========================================
// Talks to /api/drafts/:module (dgcrm_backend modules/drafts). A draft is a
// half-filled Add Employee / Add Customer form kept aside — not an
// employee/customer — so saving one never validates, takes an ID or goes
// for approval. Submitting it goes through the normal create call with
// ?draft_id=, which re-uses the draft's uploaded files and removes it.
import axiosInstance from './axiosConfig';
import { compressImageFile } from '../utils/imageCompression';

export type DraftModule = 'employee' | 'customer';

export interface FormDraft {
  id: number;
  module: DraftModule;
  title: string | null;
  data: Record<string, unknown>;
  /** backend upload field → stored file URL */
  files: Record<string, string>;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchDrafts(module: DraftModule): Promise<FormDraft[]> {
  const res = await axiosInstance.get(`/drafts/${module}`);
  return res.data.data;
}

export async function fetchDraft(module: DraftModule, id: number | string): Promise<FormDraft> {
  const res = await axiosInstance.get(`/drafts/${module}/${id}`);
  return res.data.data;
}

/** Creates (id null) or updates a draft. `files` = [backend field name, file] pairs. */
export async function saveDraft(
  module: DraftModule, id: number | null, title: string, data: Record<string, unknown>, files: [string, File][],
): Promise<FormDraft> {
  const fd = new FormData();
  fd.append('title', title);
  fd.append('data', JSON.stringify(data));
  const compressed = await Promise.all(files.map(([, f]) => compressImageFile(f)));
  files.forEach(([field], i) => fd.append(field, compressed[i]));
  const res = id == null
    ? await axiosInstance.post(`/drafts/${module}`, fd)
    : await axiosInstance.put(`/drafts/${module}/${id}`, fd);
  return res.data.data;
}

export async function deleteDraft(module: DraftModule, id: number): Promise<void> {
  await axiosInstance.delete(`/drafts/${module}/${id}`);
}
