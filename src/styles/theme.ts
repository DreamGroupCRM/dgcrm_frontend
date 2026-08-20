// ==========================================
// DREAM GROUP CRM — CENTRAL THEME TOKENS
// ==========================================
// Single source of truth for ALL colors, backgrounds,
// typography, hover states across the entire application.
//
// Usage in any component:
//   import { getTheme } from '../../styles/theme';
//   const t = getTheme(isDark);
//   then use t.pageBg, t.textPrimary, t.hoverBg, etc.

export const getTheme = (isDark: boolean) => ({

  // ── Page / Layout backgrounds ────────────────────────────────────────────
  pageBg        : isDark ? '#000000' : '#ffffff',   // full black / full white
  surfaceBg     : isDark ? '#0d0d0d' : '#ffffff',   // cards, panels, modals
  subtleBg      : isDark ? '#0a0a0a' : '#fafafa',   // main content area
  insetBg       : isDark ? '#141414' : '#f5f5f5',   // table header, info rows
  surfaceBorder : isDark ? '#1f1f1f' : '#e5e7eb',   // card/panel borders
  divider       : isDark ? '#1a1a1a' : '#e5e7eb',   // horizontal lines

  // ── Typography ───────────────────────────────────────────────────────────
  fontFamily    : '"Inter", "Roboto", "Arial", sans-serif',
  textPrimary   : isDark ? '#ffffff' : '#000000',
  textSecondary : isDark ? '#a3a3a3' : '#111827',
  textMuted     : isDark ? '#525252' : '#374151',

  // ── Hover / Active states ────────────────────────────────────────────────
  hoverBg       : isDark ? '#1a1a1a' : '#eff6ff',   // dark=dark-gray, light=light-blue
  hoverText     : isDark ? '#d4d4d4' : '#2563eb',   // dark=light-gray, light=blue-600
  hoverBorder   : isDark ? '#2a2a2a' : '#bfdbfe',

  // ── Sidebar ──────────────────────────────────────────────────────────────
  sidebarBg     : isDark ? '#000000' : '#ffffff',
  sidebarBorder : isDark ? '#1a1a1a' : '#e5e7eb',
  sidebarText   : isDark ? '#c8c8c8' : '#111111',
  sidebarTextMuted : isDark ? '#4a4a4a' : '#6b7280',
  sidebarActiveBg : isDark ? '#1a1a1a' : '#eff6ff',
  sidebarActiveText: isDark ? '#ffffff' : '#2563eb',
  sidebarActiveBorder: isDark ? '#333333' : '#2563eb',
  sidebarHoverBg: isDark ? '#141414' : '#eff6ff',
  sidebarHoverText: isDark ? '#d4d4d4' : '#2563eb',

  // ── Header ───────────────────────────────────────────────────────────────
  headerBg      : isDark ? '#000000' : '#ffffff',
  headerBorder  : isDark ? '#1a1a1a' : '#e5e7eb',
  headerShadow  : isDark
    ? '0 1px 0 rgba(255,255,255,0.04)'
    : '0 1px 3px rgba(0,0,0,0.08)',

  // ── Inputs / Forms ───────────────────────────────────────────────────────
  inputBg       : isDark ? '#0d0d0d' : '#ffffff',
  inputBorder   : isDark ? '#2a2a2a' : '#d1d5db',
  inputFocusBorder: isDark ? '#404040' : '#2563eb',
  inputText     : isDark ? '#ffffff' : '#000000',

  // ── Buttons ──────────────────────────────────────────────────────────────
  btnSecondaryBg    : isDark ? '#141414' : '#f3f4f6',
  btnSecondaryText  : isDark ? '#d4d4d4' : '#374151',
  btnSecondaryHover : isDark ? '#1f1f1f' : '#e5e7eb',

  // ── Tables ───────────────────────────────────────────────────────────────
  tableHeaderBg : isDark ? '#0a0a0a' : '#f9fafb',
  tableRowHover : isDark ? '#0d0d0d' : '#eff6ff',
  tableRowBorder: isDark ? '#141414' : '#f3f4f6',

  // ── Profile Avatar gradient (kept intentional) ───────────────────────────
  avatarGradient: 'linear-gradient(135deg, #1e40af, #3b82f6)',
});

export type AppTheme = ReturnType<typeof getTheme>;
