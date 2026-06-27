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
      {/* Toast notifications — top-right, 3 second auto-close */}
      <ToastContainer
        position="top-right"
        autoClose={1000}
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