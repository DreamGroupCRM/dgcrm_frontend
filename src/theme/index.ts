// ==========================================
// DREAM GROUP CRM — MUI THEME
// ==========================================
// Light: full white (#ffffff), black text (#000000)
// Dark:  full black (#000000), white text (#ffffff)
// Hover: blue (light) / gray (dark)
// Font:  Inter, Arial, serif — globally applied

import { createTheme } from '@mui/material/styles';

export const createAppTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary:   { main: '#2563eb', contrastText: '#ffffff' },
      secondary: { main: '#64748b', contrastText: '#ffffff' },
      background: {
        default: mode === 'dark' ? '#000000' : '#ffffff',
        paper  : mode === 'dark' ? '#0d0d0d' : '#ffffff',
      },
      text: {
        primary  : mode === 'dark' ? '#ffffff' : '#000000',
        secondary: mode === 'dark' ? '#a3a3a3' : '#4b5563',
        disabled : mode === 'dark' ? '#525252' : '#9ca3af',
      },
      divider: mode === 'dark' ? '#1a1a1a' : '#e5e7eb',
      action: {
        hover        : mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(37,99,235,0.06)',
        selected     : mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(37,99,235,0.10)',
        hoverOpacity : 0.05,
      },
    },
    typography: {
      fontFamily: '"Roboto", "Inter", "Arial", sans-serif',
      h1: { fontFamily: '"Roboto", "Inter", "Arial", sans-serif', fontWeight: 700 },
      h2: { fontFamily: '"Roboto", "Inter", "Arial", sans-serif', fontWeight: 700 },
      h3: { fontFamily: '"Roboto", "Inter", "Arial", sans-serif', fontWeight: 700 },
      h4: { fontFamily: '"Roboto", "Inter", "Arial", sans-serif', fontWeight: 600 },
      h5: { fontFamily: '"Roboto", "Inter", "Arial", sans-serif', fontWeight: 600 },
      h6: { fontFamily: '"Roboto", "Inter", "Arial", sans-serif', fontWeight: 600 },
      body1    : { fontFamily: '"Roboto", "Inter", "Arial", sans-serif' },
      body2    : { fontFamily: '"Roboto", "Inter", "Arial", sans-serif' },
      subtitle1: { fontFamily: '"Roboto", "Inter", "Arial", sans-serif' },
      subtitle2: { fontFamily: '"Roboto", "Inter", "Arial", sans-serif' },
      button   : { fontFamily: '"Roboto", "Inter", "Arial", sans-serif', textTransform: 'none', fontWeight: 600 },
      caption  : { fontFamily: '"Roboto", "Inter", "Arial", sans-serif' },
      overline : { fontFamily: '"Roboto", "Inter", "Arial", sans-serif' },
    },
    shape: { borderRadius: 12 },
    components: {
      // ── CssBaseline — Inter on body + scrollbar ──────────────────────
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          '*': { fontFamily: '"Roboto", "Inter", "Arial", sans-serif', boxSizing: 'border-box' },
          'html, body': {
            margin: 0,
            padding: 0,
            fontFamily: '"Roboto", "Inter", "Arial", sans-serif',
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
          },
          '::-webkit-scrollbar'      : { width: 5, height: 5 },
          '::-webkit-scrollbar-track': { background: 'transparent' },
          '::-webkit-scrollbar-thumb': {
            background    : mode === 'dark' ? '#2a2a2a' : '#d1d5db',
            borderRadius  : 999,
          },
          '::-webkit-scrollbar-thumb:hover': {
            background: mode === 'dark' ? '#3a3a3a' : '#9ca3af',
          },
        }),
      },
      // ── TextField / OutlinedInput ──────────────────────────────────────
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontFamily: '"Roboto", "Inter", "Arial", sans-serif',
            backgroundColor: theme.palette.mode === 'dark' ? '#0d0d0d' : '#ffffff',
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
            '& fieldset': { borderColor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#d1d5db' },
            '&:hover fieldset': { borderColor: theme.palette.mode === 'dark' ? '#404040' : '#2563eb' },
            '&.Mui-focused fieldset': { borderColor: theme.palette.mode === 'dark' ? '#525252' : '#2563eb' },
          }),
          input: { fontFamily: '"Roboto", "Inter", "Arial", sans-serif' },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontFamily: '"Roboto", "Inter", "Arial", sans-serif',
            color: theme.palette.mode === 'dark' ? '#a3a3a3' : '#4b5563',
            '&.Mui-focused': { color: theme.palette.mode === 'dark' ? '#d4d4d4' : '#2563eb' },
          }),
        },
      },
      MuiFormHelperText: {
        styleOverrides: { root: { fontFamily: '"Roboto", "Inter", "Arial", sans-serif' } },
      },
      // ── Button ────────────────────────────────────────────────────────
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily: '"Roboto", "Inter", "Arial", sans-serif',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
          },
        },
      },
      // ── Paper / Card ──────────────────────────────────────────────────
      MuiPaper: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            backgroundColor: theme.palette.mode === 'dark' ? '#0d0d0d' : '#ffffff',
            borderColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#e5e7eb',
          }),
        },
      },
      // ── Table ─────────────────────────────────────────────────────────
      MuiTableHead: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f9fafb',
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontFamily: '"Roboto", "Inter", "Arial", sans-serif',
            borderColor: theme.palette.mode === 'dark' ? '#141414' : '#f3f4f6',
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
          }),
          head: ({ theme }) => ({
            color: theme.palette.mode === 'dark' ? '#a3a3a3' : '#4b5563',
            fontWeight: 600,
          }),
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: ({ theme }) => ({
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? '#0d0d0d' : '#eff6ff',
            },
          }),
        },
      },
      // ── Menu / MenuItem ───────────────────────────────────────────────
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#0d0d0d' : '#ffffff',
            border: `1px solid ${theme.palette.mode === 'dark' ? '#1a1a1a' : '#e5e7eb'}`,
          }),
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontFamily: '"Roboto", "Inter", "Arial", sans-serif',
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#eff6ff',
              color: theme.palette.mode === 'dark' ? '#d4d4d4' : '#2563eb',
            },
          }),
        },
      },
      // ── Dialog ────────────────────────────────────────────────────────
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#0d0d0d' : '#ffffff',
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
          }),
        },
      },
      // ── Chip ──────────────────────────────────────────────────────────
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontFamily: '"Roboto", "Inter", "Arial", sans-serif',
            backgroundColor: theme.palette.mode === 'dark' ? '#141414' : '#eff6ff',
            color: theme.palette.mode === 'dark' ? '#a3a3a3' : '#2563eb',
          }),
        },
      },
      // ── Tooltip ───────────────────────────────────────────────────────
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontFamily: '"Roboto", "Inter", "Arial", sans-serif',
            backgroundColor: '#000000',
            color: '#ffffff',
            fontSize: 12,
          },
        },
      },
      // ── Divider ───────────────────────────────────────────────────────
      MuiDivider: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#e5e7eb',
          }),
        },
      },
    },
  });
