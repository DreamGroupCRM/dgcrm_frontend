import React, { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAppSelector } from './hooks';
import { createAppTheme } from './theme';
import AppRoutes from './routes/AppRoutes';

const App: React.FC = () => {
  const { mode } = useAppSelector((s) => s.theme);
  const muiTheme = createAppTheme(mode);

  useEffect(() => {
    const html = document.documentElement;
    if (mode === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
  }, [mode]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AppRoutes />
      {/* Toast notifications — top-right, 5 second auto-close for both
          success and error (the stale comment above said "3 second" but
          the value was actually 1000ms/1s; ~26 individual toast.success()
          call sites also explicitly overrode it back to ~1s, which would
          have silently fought this default — those overrides have been
          removed so every toast now genuinely gets 5s).
          closeButton is react-toastify's own default (true) — made
          explicit here since a related fix was needed for its visibility:
          the button itself was rendering white-on-white in this app's
          light toast theme (see index.css's Toastify__close-button
          override) and is unrelated to this prop, which only controls
          whether it renders at all. z-index/position are also index.css
          concerns (--toastify-z-index, .Toastify__toast-container's own
          `position: fixed`, which already tracks the viewport rather than
          the page's scroll position — no override needed for that part). */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        closeButton
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme={mode === 'dark' ? 'dark' : 'light'}
      />
    </ThemeProvider>
  );
};

export default App;