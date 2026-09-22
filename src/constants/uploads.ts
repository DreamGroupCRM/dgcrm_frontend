// ==========================================
// DGCRM — UPLOAD RULES (client side)
// ==========================================
// Mirrors the server's defaults in dgcrm_backend/src/shared/uploadTypes.ts.
//
// The SERVER is authoritative: it re-checks every upload by extension, mime
// and real magic bytes, and its rejection message is what the user is
// shown. These constants exist so the file picker only offers types that
// will actually be accepted, and so an obviously-wrong pick can be refused
// before a large file is uploaded and rejected.
//
// They used to disagree: the Employee form's Offer Letter and Resume
// fields offered ".pdf,.doc,.docx" while the backend accepted only images
// and PDF, so every DOC/DOCX upload failed with a 500. If the allowed list
// is ever narrowed on the server via UPLOAD_ALLOWED_* environment
// variables, GET /api/uploads/config returns the live rules.

/** Images only — company logos, profile photos. */
export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif';
export const IMAGE_TYPE_LABELS = 'JPG, JPEG, PNG, WEBP, GIF';
export const IMAGE_MAX_MB = 5;

/** Images + documents — ID proofs, offer letters, resumes, forms. */
export const DOCUMENT_ACCEPT =
  '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
export const DOCUMENT_TYPE_LABELS =
  'JPG, JPEG, PNG, WEBP, GIF, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX';
// V_23.0 item 1 — unified to 5 MB for every upload type (was 10 for
// documents; matches the backend's own maxBytesFor() default in
// uploadTypes.ts, which this constant must be kept in sync with).
export const DOCUMENT_MAX_MB = 5;

export const unsupportedTypeMessage = (labels: string): string =>
  `This file type is not supported. Allowed file types: ${labels}.`;

export const tooLargeMessage = (maxMb: number): string =>
  `That file is too large. Maximum size is ${maxMb} MB.`;

/**
 * Client-side pre-check, so a wrong pick is caught instantly instead of
 * after a slow upload. Returns an error message, or null when the file
 * looks acceptable. Never a substitute for the server's own validation —
 * it only sees the name and the browser-reported size.
 *
 * Extension matching is case-insensitive, so .JPG/.JPEG/.PDF behave
 * exactly like their lowercase forms.
 */
export function validateFileSelection(
  file: File,
  accept: string,
  labels: string,
  maxMb: number
): string | null {
  const name = file.name || '';
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
  if (!ext) return unsupportedTypeMessage(labels);
  const allowed = accept.split(',').map((e) => e.trim().toLowerCase());
  if (!allowed.includes(ext)) return unsupportedTypeMessage(labels);
  if (file.size > maxMb * 1024 * 1024) return tooLargeMessage(maxMb);
  if (file.size === 0) return 'That file is empty. Please choose a different file.';
  return null;
}
