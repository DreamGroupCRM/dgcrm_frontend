// V_22.0 — 20-minute idle-based auto-logout. Any user activity (mouse
// move/click, keypress, scroll, touch) resets the timer; if none of those
// fire for 20 minutes straight while a session is active, the user is
// logged out and hard-redirected to /login with a "Session expired" toast.
// Rendered once, inside <BrowserRouter> (needs router context for
// useNavigate) — see routes/index.tsx.
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { logoutThunk } from '../../redux/thunks/authThunks';

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

const IdleLogoutWatcher: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const handleIdleTimeout = async () => {
      await dispatch(logoutThunk());
      toast.error('Session expired. Please log in again.');
      navigate('/login', { replace: true });
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleIdleTimeout, IDLE_TIMEOUT_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return null;
};

export default IdleLogoutWatcher;
