import { createTheme } from '@mui/material/styles';

export const createAppTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#1a5c38', contrastText: '#ffffff' },
      secondary: { main: '#d97706', contrastText: '#ffffff' },
      background: {
        default: mode === 'dark' ? '#0f0f1a' : '#f8fafc',
        paper: mode === 'dark' ? '#1a1a2e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"DM Sans", sans-serif',
      h1: { fontFamily: '"Playfair Display", serif' },
      h2: { fontFamily: '"Playfair Display", serif' },
      h3: { fontFamily: '"Playfair Display", serif' },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
        },
      },
    },
  });