// ==========================================
// DGCRM — PROTECTED FILE ACCESS (client side)
// ==========================================
// Uploaded documents (Aadhaar and PAN scans, application and declaration
// forms, resumes, passbooks) used to be served from a completely public
// URL — anyone who knew or guessed one could fetch an ID proof without
// logging in. The server now requires a credential; see the backend's
// shared/fileAccess.ts.
//
// Two shapes of request need that credential, and they can't both use the
// same one:
//
//   • axios calls (the document viewer, Download) already send
//     `Authorization: Bearer <session token>`. Nothing to do.
//   • <img src> and <iframe src> CANNOT send a header. Those carry a
//     short-lived, file-only token in the query string instead. That is
//     what this module holds.
//
// The token is stored next to the session token and cleared with it. It is
// NOT a session token: it is scoped to reading files and nothing else will
// accept it.
import axiosInstance from './axiosConfig';
import { STORAGE_KEYS } from '../constants';

/** Read synchronously — resolveFileUrl() runs during render and cannot
 *  await. Returns '' when there is none, which simply yields the old
 *  un-tokenised URL rather than a broken one. */
export const getFileToken = (): string => {
  try { return localStorage.getItem(STORAGE_KEYS.FILE_TOKEN) || ''; } catch { return ''; }
};

export const setFileToken = (token: string | null | undefined): void => {
  try {
    if (token) localStorage.setItem(STORAGE_KEYS.FILE_TOKEN, token);
    else localStorage.removeItem(STORAGE_KEYS.FILE_TOKEN);
  } catch { /* private mode — images will just 401 rather than crash */ }
};

export const clearFileToken = (): void => setFileToken(null);

// Guards against a burst of components all mounting at once and each
// firing its own request.
let inFlight: Promise<string> | null = null;

/** Refresh once the token has less than this long to live, so an image
 *  never renders against a token that expires while the page is open. */
const REFRESH_WHEN_REMAINING_MS = 60 * 60 * 1000; // 1 hour

/**
 * Seconds-since-epoch expiry from a JWT's payload, or null if it cannot be
 * read. Decode only — the signature is the server's business; this is just
 * "is it worth sending?", never a trust decision.
 */
function expiryOf(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = JSON.parse(json)?.exp;
    return typeof exp === 'number' ? exp : null;
  } catch { return null; }
}

/** True when the stored token is missing, unreadable or about to expire. */
function needsRefresh(token: string): boolean {
  if (!token) return true;
  const exp = expiryOf(token);
  // Unreadable: leave it alone rather than hammering the endpoint. If it is
  // genuinely bad the image 401s, which is no worse than refetching.
  if (exp === null) return false;
  return exp * 1000 - Date.now() < REFRESH_WHEN_REMAINING_MS;
}

/**
 * Makes sure a file token is available, fetching one if not.
 *
 * Logging in already returns a token alongside the session token, so this
 * normally does nothing. It exists for the sessions that were ALREADY OPEN
 * when protected file access shipped: those hold a valid session token but
 * no file token, and would otherwise see broken images until they logged
 * out and back in. Called once when an authenticated shell mounts.
 *
 * Returns '' on failure rather than throwing — a missing file token must
 * never be able to take a page down.
 */
export async function ensureFileToken(): Promise<string> {
  const existing = getFileToken();
  // Also refreshes a token that is about to expire. A session can stay
  // active far longer than a file token's lifetime, and a silently expired
  // token shows up as every image on the page breaking at once — with
  // nothing for the app to catch, because an <img> error never reaches
  // axios.
  if (existing && !needsRefresh(existing)) return existing;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await axiosInstance.get('/uploads/file-token');
      const token: string = res.data?.data?.fileToken || '';
      if (token) setFileToken(token);
      return token || existing;
    } catch {
      // Keep whatever we already had — a failed refresh must not turn a
      // working page into one with no images at all.
      return existing;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
