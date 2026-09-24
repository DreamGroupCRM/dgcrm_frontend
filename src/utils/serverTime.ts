// ==========================================
// DREAM GROUP CRM - SERVER TIME
// ==========================================
// Every calendar/date default in the app takes "today" from the SERVER's
// clock (GET /api/server-time), never the user's system clock — a PC with a
// wrong or deliberately changed date must not shift what the app considers
// today. We keep the offset between the server's clock and this browser's,
// plus the server's timezone, and derive dates from those. Until the first
// sync lands (or if it fails) this falls back to the browser clock.
import axiosInstance from '../services/axiosConfig';

const RESYNC_INTERVAL_MS = 10 * 60 * 1000;

let offsetMs = 0;
let serverTzOffsetMinutes: number | null = null;
let resyncTimer: ReturnType<typeof setInterval> | null = null;

const pad = (n: number) => String(n).padStart(2, '0');

export async function syncServerTime(): Promise<void> {
  try {
    const sentAt = Date.now();
    const res = await axiosInstance.get('/server-time');
    const receivedAt = Date.now();
    const data = res.data?.data as { now: number; tz_offset_minutes: number } | undefined;
    if (!data || !Number.isFinite(data.now)) return;
    offsetMs = data.now - Math.round((sentAt + receivedAt) / 2);
    serverTzOffsetMinutes = Number.isFinite(data.tz_offset_minutes) ? data.tz_offset_minutes : null;
  } catch {
    // keep the last known offset (or the browser clock before any sync)
  }
}

// Syncs now, then keeps re-syncing. Resolves after the first attempt or
// after `timeoutMs`, whichever comes first, so a slow/unreachable API never
// blocks the app from rendering.
export function startServerTimeSync(timeoutMs = 3000): Promise<void> {
  if (!resyncTimer) resyncTimer = setInterval(() => { void syncServerTime(); }, RESYNC_INTERVAL_MS);
  return Promise.race([syncServerTime(), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}

/** The current instant according to the server's clock. */
export const serverNow = (): Date => new Date(Date.now() + offsetMs);

/** Today's date on the server's calendar, as YYYY-MM-DD. */
export const serverTodayYmd = (): string => {
  const ms = Date.now() + offsetMs;
  if (serverTzOffsetMinutes == null) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const d = new Date(ms - serverTzOffsetMinutes * 60000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** Local-midnight Date whose Y/M/D is the server's today — safe for
 * calendar arithmetic (setDate, setMonth) and local getters. */
export const serverToday = (): Date => {
  const [y, m, d] = serverTodayYmd().split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Local YYYY-MM-DD of a Date (no UTC conversion). */
export const toYmd = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Server's today shifted by `days` (negative for the past), as YYYY-MM-DD. */
export const serverYmdPlusDays = (days: number): string => {
  const d = serverToday();
  d.setDate(d.getDate() + days);
  return toYmd(d);
};
