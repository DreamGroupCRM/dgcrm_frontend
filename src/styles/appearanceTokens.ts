// src/styles/appearanceTokens.ts
// ==========================================
// DREAM GROUP CRM — APPEARANCE PALETTES & DENSITY SCALES (Phase 4 pilot)
// ==========================================
// Common file every page's "look" should read from instead of hardcoding
// hex/px literals inline — the exact gap Phase 1 flagged (~660 hardcoded
// colors, ~900 hardcoded spacing/font-size literals across the app). The
// Lead List page (src/components/leads/LeadListView.tsx) is the pilot
// consumer; nothing else in the app reads this file yet, so nothing else
// changes.
//
// Design choice worth flagging explicitly: "Light Professional" and
// "Dark Professional" are NOT tied to the app's existing light/dark toggle
// (themeSlice.mode) — that mechanism is untouched, per the Phase 2-3
// backward-compatibility commitment. Instead every appearance below
// (including 'existing') defines both a light-mode and a dark-mode token
// set, exactly like the current getTheme(isDark) already does — so any
// appearance composes correctly with whichever mode the user has toggled,
// rather than silently overriding it. If "Dark Professional" was meant to
// force dark mode regardless of the toggle, that's a different, larger
// decision (merging two independent state slices) that should be made
// explicitly, not assumed here.
//
// How this reaches the DOM: master.css's shared classes (.master-btn-
// primary, .master-search-box-accent, .master-table th/td — used by EVERY
// list page, not just Leads) now read their color/spacing from CSS custom
// properties with :root defaults equal to today's exact literals (see
// master.css). useAppearanceTokens() returns a `cssVars` object that a
// page spreads onto its own root element to LOCALLY override those
// variables — CSS custom properties cascade to descendants only, so a page
// that never sets them (i.e. every page except the pilot) keeps rendering
// through the unchanged :root defaults. This is the mechanism a later pass
// extends to more pages: import this file, call the hook, spread cssVars.
import type { CSSProperties } from 'react';
import { useAppSelector } from '../hooks';
import { getTheme } from './theme';
import { AppearanceId, DensityId } from '../redux/slices/appearanceSlice';

// ── Status "family" — the semantic bucket a badge-style status belongs to,
// independent of which literal appearance is active. Lead statuses map to
// families once; each appearance then only needs to color 10 families
// instead of every individual status value. Reusable for any future
// badge-like status (Customer active/inactive, payment approval, etc.). ──
export type StatusFamily =
  | 'accentInfo' | 'info' | 'infoSky' | 'warning' | 'warningAmber'
  | 'neutral' | 'neutralMuted' | 'danger' | 'violet' | 'success';

export const LEAD_STATUS_FAMILY: Record<string, StatusFamily> = {
  new: 'accentInfo',
  follow_up: 'info',
  call_back: 'infoSky',
  ringing: 'warning',
  switched_off: 'neutral',
  wrong_number: 'danger',
  not_interested: 'danger',
  site_visit_scheduled: 'warningAmber',
  visited: 'violet',
  not_booked: 'neutral',
  booked: 'success',
  cancelled: 'neutralMuted',
};

interface FamilyColorPair { bg: string; fg: string; bgDark: string; fgDark: string; }
type FamilyColors = Record<StatusFamily, FamilyColorPair>;

export interface AppearancePalette {
  label: string;
  // Accent — replaces the pill/pagination-active #4338ca literal.
  accent: string; accentDark: string;
  accentHover: string; accentHoverDark: string;
  // Search-box focus glow border (.master-search-box-accent:focus-within).
  accentFocus: string; accentFocusDark: string;
  // "Add Lead" button (.master-btn-primary background).
  btnPrimaryGradient: string; btnPrimaryGradientDark: string;
  // Table header band (.master-table-header-gradient, var(--grad-table-header)).
  tableHeaderGradient: string; tableHeaderGradientDark: string;
  // "Possible duplicate" marker icon — kept as its own token rather than
  // reusing families.danger.fg: the two were never the same literal in the
  // original hardcoded code (#dc2626 vs #b91c1c), and reusing danger.fg
  // would silently shift 'existing' by one shade.
  duplicateIcon: string;
  // Neutral marker for a "system" timeline entry (e.g. an automatic
  // status-change log line) as opposed to a human comment, which uses
  // `accent` instead — see LeadCrudView.tsx's activity timeline.
  systemBorder: string;
  families: FamilyColors;
}

// ── 'existing' — copied verbatim from the literals that were previously
// hardcoded directly in LeadStatusBadge.tsx / LeadListView.tsx / master.css,
// so selecting "Existing / Current" renders pixel-identical to before this
// pilot. This is the baseline every other palette is judged against, not a
// recreation of it. ─────────────────────────────────────────────────────
const EXISTING: AppearancePalette = {
  label: 'Existing / Current',
  accent: '#4338ca', accentDark: '#4338ca',
  accentHover: '#3730a3', accentHoverDark: '#4f46e5',
  accentFocus: '#4f46e5', accentFocusDark: '#4f46e5',
  btnPrimaryGradient: 'linear-gradient(135deg, #0284c7, #7c3aed)',
  btnPrimaryGradientDark: 'linear-gradient(135deg, #0284c7, #7c3aed)',
  tableHeaderGradient: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 50%, #8b5cf6 100%)',
  tableHeaderGradientDark: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 50%, #8b5cf6 100%)',
  duplicateIcon: '#dc2626',
  systemBorder: '#a1a1aa',
  families: {
    accentInfo:   { bg: '#e0e7ff', fg: '#4338ca', bgDark: 'rgba(99,102,241,0.18)',  fgDark: '#a5b4fc' },
    info:         { bg: '#dbeafe', fg: '#1d4ed8', bgDark: 'rgba(59,130,246,0.18)',  fgDark: '#93c5fd' },
    infoSky:      { bg: '#e0f2fe', fg: '#0369a1', bgDark: 'rgba(14,165,233,0.18)',  fgDark: '#7dd3fc' },
    warning:      { bg: '#fef9c3', fg: '#a16207', bgDark: 'rgba(234,179,8,0.18)',   fgDark: '#fde047' },
    warningAmber: { bg: '#fef3c7', fg: '#b45309', bgDark: 'rgba(245,158,11,0.18)',  fgDark: '#fcd34d' },
    neutral:      { bg: '#f3f4f6', fg: '#4b5563', bgDark: 'rgba(148,163,184,0.18)', fgDark: '#cbd5e1' },
    neutralMuted: { bg: '#f3f4f6', fg: '#6b7280', bgDark: 'rgba(148,163,184,0.18)', fgDark: '#94a3b8' },
    danger:       { bg: '#fee2e2', fg: '#b91c1c', bgDark: 'rgba(239,68,68,0.18)',   fgDark: '#fca5a5' },
    violet:       { bg: '#ede9fe', fg: '#6d28d9', bgDark: 'rgba(139,92,246,0.18)',  fgDark: '#c4b5fd' },
    success:      { bg: '#dcfce7', fg: '#15803d', bgDark: 'rgba(34,197,94,0.18)',   fgDark: '#86efac' },
  },
};

// ── 'light-professional' — restrained corporate steel-blue. Lower
// saturation than 'existing' across the board; reads as understated/
// enterprise rather than product-marketing bright. ──────────────────────
const LIGHT_PROFESSIONAL: AppearancePalette = {
  label: 'Light Professional',
  accent: '#2c5282', accentDark: '#63b3ed',
  accentHover: '#234876', accentHoverDark: '#90cdf4',
  accentFocus: '#2b6cb0', accentFocusDark: '#63b3ed',
  btnPrimaryGradient: 'linear-gradient(135deg, #2c5282, #4a7bab)',
  btnPrimaryGradientDark: 'linear-gradient(135deg, #1a365d, #2c5282)',
  tableHeaderGradient: 'linear-gradient(90deg, #2c5282 0%, #4a7bab 100%)',
  tableHeaderGradientDark: 'linear-gradient(90deg, #1a365d 0%, #2c5282 100%)',
  duplicateIcon: '#9b2c2c',
  systemBorder: '#a0aec0',
  families: {
    accentInfo:   { bg: '#ebf4ff', fg: '#2c5282', bgDark: 'rgba(99,179,237,0.16)',  fgDark: '#90cdf4' },
    info:         { bg: '#e6f0fa', fg: '#2b6cb0', bgDark: 'rgba(66,153,225,0.16)',  fgDark: '#90cdf4' },
    infoSky:      { bg: '#e6fffa', fg: '#0987a0', bgDark: 'rgba(56,178,172,0.16)',  fgDark: '#81e6d9' },
    warning:      { bg: '#fffbea', fg: '#975a16', bgDark: 'rgba(214,158,46,0.16)',  fgDark: '#f6e05e' },
    warningAmber: { bg: '#fff5e6', fg: '#9a5b13', bgDark: 'rgba(221,142,42,0.16)',  fgDark: '#fbd38d' },
    neutral:      { bg: '#f0f2f5', fg: '#4a5568', bgDark: 'rgba(160,174,192,0.16)', fgDark: '#cbd5e0' },
    neutralMuted: { bg: '#eef1f4', fg: '#718096', bgDark: 'rgba(160,174,192,0.14)', fgDark: '#a0aec0' },
    danger:       { bg: '#fff0f0', fg: '#9b2c2c', bgDark: 'rgba(229,62,62,0.16)',   fgDark: '#feb2b2' },
    violet:       { bg: '#f3f0fb', fg: '#553c9a', bgDark: 'rgba(128,90,213,0.16)',  fgDark: '#d6bcfa' },
    success:      { bg: '#eefaf1', fg: '#276749', bgDark: 'rgba(56,161,105,0.16)',  fgDark: '#9ae6b4' },
  },
};

// ── 'dark-professional' — deep teal/slate identity. Not "forced dark
// mode" (see file header) — a moodier, higher-contrast accent family that
// happens to read especially well once the user is also in dark mode. ───
const DARK_PROFESSIONAL: AppearancePalette = {
  label: 'Dark Professional',
  accent: '#0f766e', accentDark: '#2dd4bf',
  accentHover: '#0d5f58', accentHoverDark: '#5eead4',
  accentFocus: '#0f766e', accentFocusDark: '#2dd4bf',
  btnPrimaryGradient: 'linear-gradient(135deg, #134e4a, #0f766e)',
  btnPrimaryGradientDark: 'linear-gradient(135deg, #0f766e, #115e59)',
  tableHeaderGradient: 'linear-gradient(90deg, #134e4a 0%, #0f766e 100%)',
  tableHeaderGradientDark: 'linear-gradient(90deg, #042f2e 0%, #115e59 100%)',
  duplicateIcon: '#b91c1c',
  systemBorder: '#94a3b8',
  families: {
    accentInfo:   { bg: '#e6fffa', fg: '#0f766e', bgDark: 'rgba(45,212,191,0.18)',  fgDark: '#5eead4' },
    info:         { bg: '#e0f2fe', fg: '#0369a1', bgDark: 'rgba(56,189,248,0.18)',  fgDark: '#7dd3fc' },
    infoSky:      { bg: '#ecfeff', fg: '#0e7490', bgDark: 'rgba(34,211,238,0.18)',  fgDark: '#67e8f9' },
    warning:      { bg: '#fefce8', fg: '#a16207', bgDark: 'rgba(234,179,8,0.18)',   fgDark: '#fde047' },
    warningAmber: { bg: '#fff7ed', fg: '#c2410c', bgDark: 'rgba(251,146,60,0.18)',  fgDark: '#fdba74' },
    neutral:      { bg: '#f1f5f9', fg: '#334155', bgDark: 'rgba(100,116,139,0.2)',  fgDark: '#cbd5e1' },
    neutralMuted: { bg: '#f1f5f9', fg: '#64748b', bgDark: 'rgba(100,116,139,0.16)', fgDark: '#94a3b8' },
    danger:       { bg: '#fef2f2', fg: '#b91c1c', bgDark: 'rgba(248,113,113,0.18)', fgDark: '#fca5a5' },
    violet:       { bg: '#f5f3ff', fg: '#5b21b6', bgDark: 'rgba(167,139,250,0.18)', fgDark: '#c4b5fd' },
    success:      { bg: '#ecfdf5', fg: '#047857', bgDark: 'rgba(52,211,153,0.18)',  fgDark: '#6ee7b7' },
  },
};

// ── 'modern' — vibrant, saturated single-hue-forward indigo. More
// consistently "on-brand" across statuses than 'existing' (fewer distinct
// hue families), pill-forward. ───────────────────────────────────────────
const MODERN: AppearancePalette = {
  label: 'Modern',
  accent: '#6d28d9', accentDark: '#a78bfa',
  accentHover: '#5b21b6', accentHoverDark: '#c4b5fd',
  accentFocus: '#7c3aed', accentFocusDark: '#a78bfa',
  btnPrimaryGradient: 'linear-gradient(135deg, #6d28d9, #db2777)',
  btnPrimaryGradientDark: 'linear-gradient(135deg, #7c3aed, #ec4899)',
  tableHeaderGradient: 'linear-gradient(90deg, #6d28d9 0%, #a855f7 50%, #db2777 100%)',
  tableHeaderGradientDark: 'linear-gradient(90deg, #4c1d95 0%, #7c3aed 50%, #be185d 100%)',
  duplicateIcon: '#be123c',
  systemBorder: '#a1a1aa',
  families: {
    accentInfo:   { bg: '#f3e8ff', fg: '#6d28d9', bgDark: 'rgba(167,139,250,0.2)',  fgDark: '#d8b4fe' },
    info:         { bg: '#e0e7ff', fg: '#4338ca', bgDark: 'rgba(129,140,248,0.2)', fgDark: '#a5b4fc' },
    infoSky:      { bg: '#fae8ff', fg: '#a21caf', bgDark: 'rgba(232,121,249,0.2)', fgDark: '#f0abfc' },
    warning:      { bg: '#fef3c7', fg: '#b45309', bgDark: 'rgba(251,191,36,0.2)',  fgDark: '#fcd34d' },
    warningAmber: { bg: '#ffe4e6', fg: '#be123c', bgDark: 'rgba(251,113,133,0.2)', fgDark: '#fda4af' },
    neutral:      { bg: '#f4f4f5', fg: '#52525b', bgDark: 'rgba(161,161,170,0.2)', fgDark: '#d4d4d8' },
    neutralMuted: { bg: '#f4f4f5', fg: '#71717a', bgDark: 'rgba(161,161,170,0.16)', fgDark: '#a1a1aa' },
    danger:       { bg: '#fee2e2', fg: '#be123c', bgDark: 'rgba(251,113,133,0.2)', fgDark: '#fda4af' },
    violet:       { bg: '#ede9fe', fg: '#7e22ce', bgDark: 'rgba(192,132,252,0.2)', fgDark: '#d8b4fe' },
    success:      { bg: '#d1fae5', fg: '#047857', bgDark: 'rgba(52,211,153,0.2)', fgDark: '#6ee7b7' },
  },
};

// ── 'executive' — deep navy + bronze/gold. Premium/boardroom feel;
// jewel-tone status colors instead of pastels. ──────────────────────────
const EXECUTIVE: AppearancePalette = {
  label: 'Executive',
  accent: '#92722a', accentDark: '#d4af61',
  accentHover: '#7a5e20', accentHoverDark: '#e6c98a',
  accentFocus: '#92722a', accentFocusDark: '#d4af61',
  btnPrimaryGradient: 'linear-gradient(135deg, #1e293b, #92722a)',
  btnPrimaryGradientDark: 'linear-gradient(135deg, #0f172a, #7a5e20)',
  tableHeaderGradient: 'linear-gradient(90deg, #1e293b 0%, #334155 60%, #92722a 100%)',
  tableHeaderGradientDark: 'linear-gradient(90deg, #0f172a 0%, #1e293b 60%, #7a5e20 100%)',
  duplicateIcon: '#7f1d1d',
  systemBorder: '#6b7280',
  families: {
    accentInfo:   { bg: '#f5f0e0', fg: '#92722a', bgDark: 'rgba(212,175,97,0.18)',  fgDark: '#e6c98a' },
    info:         { bg: '#e2e8f0', fg: '#1e293b', bgDark: 'rgba(148,163,184,0.18)', fgDark: '#cbd5e1' },
    infoSky:      { bg: '#e0f2fe', fg: '#075985', bgDark: 'rgba(56,189,248,0.16)',  fgDark: '#7dd3fc' },
    warning:      { bg: '#fef3c7', fg: '#854d0e', bgDark: 'rgba(202,138,4,0.18)',   fgDark: '#facc15' },
    warningAmber: { bg: '#fde8d7', fg: '#9a3412', bgDark: 'rgba(194,65,12,0.18)',   fgDark: '#fb923c' },
    neutral:      { bg: '#e5e7eb', fg: '#374151', bgDark: 'rgba(107,114,128,0.2)',  fgDark: '#d1d5db' },
    neutralMuted: { bg: '#e5e7eb', fg: '#6b7280', bgDark: 'rgba(107,114,128,0.16)', fgDark: '#9ca3af' },
    danger:       { bg: '#fbe2e2', fg: '#7f1d1d', bgDark: 'rgba(153,27,27,0.24)',   fgDark: '#f87171' },
    violet:       { bg: '#e9e4f0', fg: '#4c1d95', bgDark: 'rgba(109,40,217,0.2)',   fgDark: '#c4b5fd' },
    success:      { bg: '#dcefe0', fg: '#14532d', bgDark: 'rgba(21,128,61,0.2)',    fgDark: '#4ade80' },
  },
};

export const APPEARANCE_PALETTES: Record<AppearanceId, AppearancePalette> = {
  existing: EXISTING,
  'light-professional': LIGHT_PROFESSIONAL,
  'dark-professional': DARK_PROFESSIONAL,
  modern: MODERN,
  executive: EXECUTIVE,
};

// ── Density scales — spacing/type-size values every page's own inline
// literals should read from instead of hardcoding, plus the shared
// .master-table cell padding via CSS variable (see master.css). Values
// for 'existing' are copied verbatim from what was previously hardcoded. ──
export interface DensityScale {
  label: string;
  pillPaddingY: number; pillPaddingX: number;
  cellPadding: string; // 'Ypx Xpx', matches --master-cell-padding
  fontSizeSm: number; fontSizeBase: number;
  rowGap: number;
}

export const DENSITY_SCALES: Record<DensityId, DensityScale> = {
  existing: { label: 'Existing / Current', pillPaddingY: 6, pillPaddingX: 12, cellPadding: '12px 16px', fontSizeSm: 11.5, fontSizeBase: 12.5, rowGap: 8 },
  compact: { label: 'Compact', pillPaddingY: 3, pillPaddingX: 8, cellPadding: '6px 10px', fontSizeSm: 10.5, fontSizeBase: 11.5, rowGap: 5 },
  standard: { label: 'Standard', pillPaddingY: 5, pillPaddingX: 11, cellPadding: '10px 14px', fontSizeSm: 11.5, fontSizeBase: 12, rowGap: 7 },
  spacious: { label: 'Spacious', pillPaddingY: 8, pillPaddingX: 16, cellPadding: '16px 20px', fontSizeSm: 12.5, fontSizeBase: 13.5, rowGap: 12 },
};

// ── The CSS custom property names master.css's shared classes read.
// Keep this list and master.css's :root block in sync. ──────────────────
export interface AppearanceCssVars {
  '--master-accent': string;
  '--master-accent-focus': string;
  '--master-btn-primary-gradient': string;
  '--grad-table-header': string;
  '--master-cell-padding': string;
}

export function useAppearanceTokens() {
  const { appearance, density } = useAppSelector((s) => s.appearance);
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';

  const palette = APPEARANCE_PALETTES[appearance] ?? APPEARANCE_PALETTES.existing;
  const scale = DENSITY_SCALES[density] ?? DENSITY_SCALES.existing;
  const t = getTheme(isDark);

  const cssVars: AppearanceCssVars = {
    '--master-accent': isDark ? palette.accentDark : palette.accent,
    '--master-accent-focus': isDark ? palette.accentFocusDark : palette.accentFocus,
    '--master-btn-primary-gradient': isDark ? palette.btnPrimaryGradientDark : palette.btnPrimaryGradient,
    '--grad-table-header': isDark ? palette.tableHeaderGradientDark : palette.tableHeaderGradient,
    '--master-cell-padding': scale.cellPadding,
  };

  const family = (f: StatusFamily) => {
    const c = palette.families[f];
    return isDark ? { bg: c.bgDark, fg: c.fgDark } : { bg: c.bg, fg: c.fg };
  };

  return {
    appearance, density, isDark, t,
    accent: isDark ? palette.accentDark : palette.accent,
    accentHover: isDark ? palette.accentHoverDark : palette.accentHover,
    duplicateIcon: palette.duplicateIcon,
    systemBorder: palette.systemBorder,
    scale,
    family,
    cssVars: cssVars as unknown as CSSProperties,
  };
}
