// ==========================================
// DGCRM — DOCUMENT FETCH / DOWNLOAD
// ==========================================
// Fetches an uploaded document through the SAME authenticated axios
// instance every other API call uses, so the session token is attached by
// the existing request interceptor and the existing 401 handling applies.
// Nothing here invents its own auth, and nothing here puts a credential in
// a URL.
//
// The response is read as a blob and handed to the viewer as an object
// URL. That is what lets Quick View show a protected document without the
// file ever needing to be publicly reachable: the bytes arrive over an
// authenticated XHR, not via a guessable link.
import axiosInstance from './axiosConfig';

/** What kind of preview a file supports, decided from its extension. */
export type PreviewKind = 'image' | 'pdf' | 'office' | 'unsupported';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i;
const PDF_EXT = /\.pdf(\?|$)/i;
// The formats the application accepts but cannot render in a browser —
// see the backend's shared/uploadTypes.ts for the accepted list.
const OFFICE_EXT = /\.(docx?|xlsx?|pptx?)(\?|$)/i;

export function previewKindFor(urlOrName: string | null | undefined): PreviewKind {
  const v = String(urlOrName ?? '');
  if (IMAGE_EXT.test(v)) return 'image';
  if (PDF_EXT.test(v)) return 'pdf';
  if (OFFICE_EXT.test(v)) return 'office';
  return 'unsupported';
}

/** The extension, upper-cased for display ("PDF", "DOCX"). '' if none. */
export function extensionLabel(urlOrName: string | null | undefined): string {
  const m = /\.([a-z0-9]+)(?:\?|$)/i.exec(String(urlOrName ?? ''));
  return m ? m[1].toUpperCase() : '';
}

/** Human-readable size, for the fallback card on formats we cannot render. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/**
 * The name a download should be saved as. The stored filename is a
 * server-generated `<epoch>-<random>.<ext>`, which is meaningless to a
 * user, so the document's label is used instead — sanitised, because it
 * becomes a filename on the user's disk.
 */
export function downloadNameFor(label: string, url: string): string {
  const ext = /\.([a-z0-9]+)(?:\?|$)/i.exec(url)?.[1]?.toLowerCase() ?? '';
  // Strip path separators, traversal sequences and anything else that has
  // no business in a filename. The label comes from our own UI, but it is
  // written to the user's filesystem, so it is not trusted on the way out.
  const safe = label
    .replace(/[/\\]/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'document';
  return ext ? `${safe}.${ext}` : safe;
}

export interface FetchedDocument {
  /** Object URL for the blob. The caller MUST revoke it when done. */
  objectUrl: string;
  blob: Blob;
  /** The server's declared type, which is what the viewer should trust. */
  contentType: string;
  size: number;
}

/**
 * Fetches a document as a blob over the authenticated axios instance.
 *
 * `url` is the already-resolved served path (what resolveFileUrl returns).
 * Any `fk=` query token on it is stripped: that token exists only for
 * <img src>, and this request carries the real session header instead —
 * no reason to send a second credential.
 */
export async function fetchDocument(url: string, signal?: AbortSignal): Promise<FetchedDocument> {
  // Rebuild the query without `fk` rather than splicing it out with a
  // regex, which would leave a dangling '?&' if any other parameter were
  // ever present.
  const [base, query] = url.split('?');
  const kept = (query ?? '')
    .split('&')
    .filter((pair) => pair && !pair.startsWith('fk='))
    .join('&');
  const clean = kept ? `${base}?${kept}` : base;
  const response = await axiosInstance.get(clean, {
    responseType: 'blob',
    signal,
    // Documents can be several MB; the instance default is tuned for JSON.
    timeout: 120000,
    // This is an absolute-or-root-relative served path, not an API route
    // under the axios baseURL.
    baseURL: '',
  });
  const blob: Blob = response.data;
  return {
    objectUrl: URL.createObjectURL(blob),
    blob,
    contentType: blob.type || String(response.headers?.['content-type'] ?? ''),
    size: blob.size,
  };
}

/**
 * Saves an already-fetched blob to disk under a readable name. Used by the
 * viewer's Download button so the file is fetched once and can be both
 * previewed and saved.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the save before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** Download without opening the viewer first — the list-row "Download"
 *  action. Same authenticated fetch, so it is subject to the same checks. */
export async function downloadDocument(url: string, label: string): Promise<void> {
  const { blob, objectUrl } = await fetchDocument(url);
  try {
    saveBlob(blob, downloadNameFor(label, url));
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
