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
      {/* Toast notifications — top-right, 5 second auto-close by default.
          This default is what success/info/warn toasts actually use.
          Error toasts do NOT use this default any more: every call site
          imports `toast` from src/utils/toast.ts instead of directly from
          'react-toastify', and that wrapper forces `autoClose: false` on
          every .error() call — a failed/erred/no-response outcome stays
          on screen until manually closed, rather than timing out, so it
          can't be missed. ToastContainer itself doesn't need a
          `autoClose={false}` override for this — it only sets the
          shared default that success/info/warn still use.
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