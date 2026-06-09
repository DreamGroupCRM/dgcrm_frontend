import React, { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
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
    </ThemeProvider>
  );
};

export default App;