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
  // Dark value was '#525252', which is 2.5:1 against the dark page/card —
  // below the 3:1 floor for ANY text and well below the 4.5:1 needed for
  // normal-size text, so helper text, captions, "Not uploaded" labels,
  // empty-state lines and disabled-field values were effectively
  // unreadable in black theme. '#8f8f8f' is the same neutral grey, one
  // step lighter, and clears 4.5:1 on all three dark surfaces. The LIGHT
  // value is untouched.
  textMuted     : isDark ? '#8f8f8f' : '#374151',
  // Accent color that is safe as TEXT or an ICON.
  //
  // --brand-gradient is tuned to be a BUTTON FILL with white text on it,
  // so every appearance palette picks a deep, saturated hue. Used as a
  // text color on the black theme those all land around 2.3-3.5:1 —
  // section headings, required-field asterisks, links and icons drawn in
  // "brand color" faded into the background. Buttons must keep the deep
  // fill, so ink is a SEPARATE token: use accentText (or the CSS variable
  // it aliases) wherever the accent is the INK, and --brand-gradient
  // wherever it is the PAINT.
  //
  // Deliberately the CSS variable rather than a literal, so it follows the
  // user's selected Appearance exactly like every other brand surface —
  // appearanceTokens.ts computes it per palette and per theme, and
  // master.css carries the fallback for pages rendered before login.
  accentText    : 'var(--brand-ink)',

  // ── Hover / Active states ────────────────────────────────────────────────
  hoverBg       : isDark ? '#1a1a1a' : '#efebe9',   // dark=dark-gray, light=light-brown
  hoverText     : isDark ? '#d4d4d4' : '#0000FF',
  hoverBorder   : isDark ? '#2a2a2a' : '#d7ccc8',

  // ── Sidebar ──────────────────────────────────────────────────────────────
  sidebarBg     : isDark ? '#000000' : '#ffffff',
  sidebarBorder : isDark ? '#1a1a1a' : '#e5e7eb',
  sidebarText   : isDark ? '#c8c8c8' : '#111111',
  // Dark value was '#4a4a4a' — 2.2:1 on the black sidebar, i.e. section
  // captions in the nav were barely there. Same hue, lightened to clear
  // 4.5:1. Light value untouched.
  sidebarTextMuted : isDark ? '#8a8a8a' : '#6b7280',
  sidebarActiveBg : isDark ? '#1a1a1a' : '#efebe9',
  sidebarActiveText: isDark ? '#ffffff' : '#0000FF',
  sidebarActiveBorder: isDark ? '#333333' : '#0000FF',
  sidebarHoverBg: isDark ? '#141414' : '#efebe9',
  sidebarHoverText: isDark ? '#d4d4d4' : '#0000FF',

  // ── Header ───────────────────────────────────────────────────────────────
  headerBg      : isDark ? '#000000' : '#ffffff',
  headerBorder  : isDark ? '#1a1a1a' : '#e5e7eb',
  headerShadow  : isDark
    ? '0 1px 0 rgba(255,255,255,0.04)'
    : '0 1px 3px rgba(0,0,0,0.08)',

  // ── Inputs / Forms ───────────────────────────────────────────────────────
  inputBg       : isDark ? '#0d0d0d' : '#ffffff',
  inputBorder   : isDark ? '#2a2a2a' : '#d1d5db',
  inputFocusBorder: isDark ? '#404040' : '#0000FF',
  inputText     : isDark ? '#ffffff' : '#000000',

  // ── Buttons ──────────────────────────────────────────────────────────────
  btnSecondaryBg    : isDark ? '#141414' : '#f3f4f6',
  btnSecondaryText  : isDark ? '#d4d4d4' : '#374151',
  btnSecondaryHover : isDark ? '#1f1f1f' : '#e5e7eb',

  // ── Tables ───────────────────────────────────────────────────────────────
  tableHeaderBg : isDark ? '#0a0a0a' : '#f9fafb',
  tableRowHover : isDark ? '#0d0d0d' : '#efebe9',
  tableRowBorder: isDark ? '#141414' : '#f3f4f6',

  // ── Profile Avatar fill color (kept intentional) ─────────────────────────
  avatarGradient: '#0000FF',
});

export type AppTheme = ReturnType<typeof getTheme>;
