// ==========================================
// DGCRM — INACTIVITY LOGOUT
// ==========================================
// Signs a user out after an hour with no activity. Three bugs in the
// previous 20-minute version made it fire on people who WERE active:
//
//   1. The last-activity time lived only in this tab's memory. A second
//      tab left open in the background reached the timeout on its own,
//      logged out, and wiped the token out of localStorage — which is
//      shared — killing the tab the user was actually working in. Activity
//      is now written to localStorage and read back, so ANY tab being used
//      keeps EVERY tab alive.
//
//   2. Listeners were bubble-phase, so anything calling stopPropagation()
//      (modals and dropdown menus in this app do) swallowed the event
//      before it reached window. They are capture-phase now, which fires
//      before any handler can stop it, and `click`, `input` and `wheel`
//      were added — typing into a form with a still mouse is activity.
//
//   3. A timer alone cannot survive the machine sleeping or the tab being
//      throttled. Idle time is now derived from a stored timestamp and
//      re-checked on a short interval and whenever the tab becomes
//      visible, so elapsed wall-clock time is always what counts.
//
// This is only the client half. The server enforces the same window
// independently (backend shared/session.ts) and is the real authority —
// a timer here could otherwise be bypassed simply by not running it.
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { logoutThunk } from '../../redux/thunks/authThunks';

/** Must match IDLE_TIMEOUT_MS in the backend's shared/session.ts. */
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
/** How often elapsed idle time is re-checked. */
const CHECK_INTERVAL_MS = 30 * 1000;
/**
 * Activity is only written this often. Without it, mousemove would write
 * to localStorage on essentially every frame.
 */
const WRITE_THROTTLE_MS = 5 * 1000;

const LAST_ACTIVITY_KEY = 'dgcrm.last_activity';

const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'click', 'keydown', 'input',
  'scroll', 'wheel', 'touchstart',
] as const;

const readLastActivity = (): number => {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  } catch {
    // Private mode / storage disabled — fall back to "active now" rather
    // than logging the user out over a storage error.
    return Date.now();
  }
};

const writeLastActivity = (at: number): void => {
  try { localStorage.setItem(LAST_ACTIVITY_KEY, String(at)); } catch { /* ignore */ }
};

const IdleLogoutWatcher: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  // Guards against two timers racing to log out at once (e.g. the interval
  // firing while a visibilitychange check is already handling it).
  const loggingOutRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    loggingOutRef.current = false;
    let lastWrite = 0;
    writeLastActivity(Date.now());

    const markActive = () => {
      const now = Date.now();
      if (now - lastWrite < WRITE_THROTTLE_MS) return;
      lastWrite = now;
      writeLastActivity(now);
    };

    const handleIdleTimeout = async () => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      try { localStorage.removeItem(LAST_ACTIVITY_KEY); } catch { /* ignore */ }
      await dispatch(logoutThunk());
      toast.error('Your session expired due to inactivity. Please log in again.');
      navigate('/login', { replace: true });
    };

    const check = () => {
      if (Date.now() - readLastActivity() >= IDLE_TIMEOUT_MS) void handleIdleTimeout();
    };

    // Capture phase: fires before any component handler can stopPropagation.
    // Passive: these listeners never preventDefault, so this keeps
    // scrolling smooth on touch devices.
    const options: AddEventListenerOptions = { capture: true, passive: true };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActive, options));

    // Coming back to a backgrounded tab re-checks immediately — the
    // interval may have been throttled to a crawl while it was hidden.
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    const interval = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActive, options));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return null;
};

export default IdleLogoutWatcher;
