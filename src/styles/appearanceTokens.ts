// src/styles/appearanceTokens.ts
// ==========================================
// DREAM GROUP CRM — APPEARANCE PALETTES (Phase 4 pilot)
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
import { AppearanceId } from '../redux/slices/appearanceSlice';

// ── Color tinting — lets category-colored elements (Dashboard/Reports stat
// boxes: blue=people, red=overdue, green=good, etc.) shift toward the
// active appearance's accent instead of staying one fixed rainbow for
// every palette, while keeping each box's own distinct hue (not fully
// replaced by the accent). 'existing' mixes at ratio 0, so its output is
// byte-identical to the literal it was given — zero regression. ─────────
const TINT_RATIO = 0.32;

// How far the accent is lifted toward white to become readable INK on the
// black theme (see '--brand-ink'). 0.45 puts every current palette between
// 4.9:1 and 8.2:1 on the dark page, card and inset surfaces, while leaving
// the hue clearly recognisable as the brand color.
const ACCENT_INK_LIFT = 0.45;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mixHex(base: string, accent: string, ratio: number): string {
  if (ratio <= 0) return base;
  const [br, bg, bb] = hexToRgb(base);
  const [ar, ag, ab] = hexToRgb(accent);
  return rgbToHex(br + (ar - br) * ratio, bg + (ag - bg) * ratio, bb + (ab - bb) * ratio);
}

function tintGradientCss(gradient: string, accent: string, ratio: number): string {
  if (ratio <= 0) return gradient;
  return gradient.replace(/#[0-9a-fA-F]{3,6}/g, (hex) => mixHex(hex, accent, ratio));
}

// ── Status "family" — the semantic bucket a badge-style status belongs to.
// The type and the status->family mapping now live in styles/statusColors.ts
// (one file for every module's statuses, not just Leads) and are re-exported
// here so existing importers keep working unchanged. The COLORS for a family
// are no longer per-appearance/per-theme — see `family` in
// useAppearanceTokens() below for why. ─────────────────────────────────────
export type { StatusFamily } from './statusColors';
import type { StatusFamily } from './statusColors';
import { STATUS_FAMILY, familyColors } from './statusColors';

/** @deprecated Use statusFamilyFor() from styles/statusColors.ts, which
 *  covers every module's statuses rather than only Leads. Kept as an alias
 *  so LeadStatusBadge and anything else importing it keeps working. */
export const LEAD_STATUS_FAMILY: Record<string, StatusFamily> = STATUS_FAMILY;

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
  // Sidebar's active-nav-item highlight + Header's avatar badge — until
  // this Architecture Review pass, these were fixed in theme.ts's
  // getTheme(isDark) as a #0000FF-based blue completely independent of
  // any appearance (the shell every page renders inside never responded
  // to Appearance at all). Existing's values below are copied verbatim
  // from theme.ts so nothing visually changes today; the other palettes
  // reuse each one's own accent/btnPrimaryGradient so a future theme only
  // needs to fill in these two fields, not touch Sidebar.tsx/Header.tsx.
  navActiveBg: string; navActiveBgDark: string;
  navActiveText: string; navActiveTextDark: string;
  navActiveBorder: string; navActiveBorderDark: string;
  avatarGradient: string; avatarGradientDark: string;
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
  // Was '#0000FF' — a different literal than tableHeaderGradient below,
  // which is why "Add X" buttons/action icons/pagination/avatar/sidebar
  // active-nav rendered a visibly different color than table headers and
  // stat boxes under this appearance (every other palette already keeps
  // these in sync — see e.g. LIGHT_PROFESSIONAL). Now unified to the same
  // teal so switching to "Existing / Current" recolors every one of these
  // surfaces identically, everywhere in the app.
  btnPrimaryGradient: '#0A7474',
  btnPrimaryGradientDark: '#0A7474',
  tableHeaderGradient: '#0A7474',
  tableHeaderGradientDark: '#0A7474',
  duplicateIcon: '#dc2626',
  systemBorder: '#a1a1aa',
  navActiveBg: '#efebe9', navActiveBgDark: '#1a1a1a',
  navActiveText: '#0A7474', navActiveTextDark: '#ffffff',
  navActiveBorder: '#0A7474', navActiveBorderDark: '#333333',
  avatarGradient: '#0A7474',
  avatarGradientDark: '#0A7474',
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

// ── 'light-professional' — cool ocean blue-to-teal. Still restrained/
// enterprise, but a smooth adjacent-hue gradient (blue into cyan) reads
// cleaner and more "designed" than a flat single-hue steel-blue. ────────
const LIGHT_PROFESSIONAL: AppearancePalette = {
  label: 'Light Professional',
  accent: '#0369a1', accentDark: '#38bdf8',
  accentHover: '#075985', accentHoverDark: '#7dd3fc',
  accentFocus: '#0000FF', accentFocusDark: '#38bdf8',
  btnPrimaryGradient: '#0369a1',
  btnPrimaryGradientDark: '#075985',
  tableHeaderGradient: '#0369a1',
  tableHeaderGradientDark: '#075985',
  duplicateIcon: '#9b2c2c',
  systemBorder: '#a0aec0',
  navActiveBg: '#e6f6fb', navActiveBgDark: 'rgba(56,189,248,0.16)',
  navActiveText: '#0369a1', navActiveTextDark: '#38bdf8',
  navActiveBorder: '#0369a1', navActiveBorderDark: '#38bdf8',
  avatarGradient: '#0369a1',
  avatarGradientDark: '#075985',
  families: {
    accentInfo:   { bg: '#e6f6fb', fg: '#0369a1', bgDark: 'rgba(56,189,248,0.16)',  fgDark: '#7dd3fc' },
    info:         { bg: '#e6f0fa', fg: '#0000FF', bgDark: 'rgba(56,189,248,0.16)',  fgDark: '#7dd3fc' },
    infoSky:      { bg: '#e6fffa', fg: '#0987a0', bgDark: 'rgba(45,212,191,0.16)',  fgDark: '#5eead4' },
    warning:      { bg: '#fffbea', fg: '#975a16', bgDark: 'rgba(214,158,46,0.16)',  fgDark: '#f6e05e' },
    warningAmber: { bg: '#fff5e6', fg: '#9a5b13', bgDark: 'rgba(221,142,42,0.16)',  fgDark: '#fbd38d' },
    neutral:      { bg: '#f0f2f5', fg: '#4a5568', bgDark: 'rgba(160,174,192,0.16)', fgDark: '#cbd5e0' },
    neutralMuted: { bg: '#eef1f4', fg: '#718096', bgDark: 'rgba(160,174,192,0.14)', fgDark: '#a0aec0' },
    danger:       { bg: '#fff0f0', fg: '#9b2c2c', bgDark: 'rgba(229,62,62,0.16)',   fgDark: '#feb2b2' },
    violet:       { bg: '#f3f0fb', fg: '#553c9a', bgDark: 'rgba(128,90,213,0.16)',  fgDark: '#d6bcfa' },
    success:      { bg: '#eefaf1', fg: '#276749', bgDark: 'rgba(56,161,105,0.16)',  fgDark: '#9ae6b4' },
  },
};

// ── 'midnight-navy' — deep steel-blue/navy identity (V_23.0: replaces the
// old 'dark-professional' emerald/jade palette — green is now reserved for
// Payment Due's status indicators, see DueReportPage.tsx, and can no
// longer double as a selectable theme accent without the two visually
// colliding). Reuses EXISTING's own status-color families rather than a
// custom set, same reasoning as 'neutral-gray' below: a theme swap
// shouldn't make "Approved"/"Rejected" harder to read at a glance. ───────
const MIDNIGHT_NAVY: AppearancePalette = {
  label: 'Midnight Navy',
  accent: '#1e3a8a', accentDark: '#60a5fa',
  accentHover: '#172554', accentHoverDark: '#93c5fd',
  accentFocus: '#1d4ed8', accentFocusDark: '#60a5fa',
  btnPrimaryGradient: '#1e3a8a',
  btnPrimaryGradientDark: '#0f172a',
  tableHeaderGradient: '#1e3a8a',
  tableHeaderGradientDark: '#0f172a',
  duplicateIcon: '#b91c1c',
  systemBorder: '#64748b',
  navActiveBg: '#e0e7ff', navActiveBgDark: 'rgba(96,165,250,0.18)',
  navActiveText: '#1e3a8a', navActiveTextDark: '#60a5fa',
  navActiveBorder: '#1e3a8a', navActiveBorderDark: '#60a5fa',
  avatarGradient: '#1e3a8a',
  avatarGradientDark: '#0f172a',
  families: EXISTING.families,
};

// ── 'modern' — vibrant, saturated single-hue-forward indigo. More
// consistently "on-brand" across statuses than 'existing' (fewer distinct
// hue families), pill-forward. ───────────────────────────────────────────
const MODERN: AppearancePalette = {
  label: 'Modern',
  accent: '#6d28d9', accentDark: '#a78bfa',
  accentHover: '#5b21b6', accentHoverDark: '#c4b5fd',
  accentFocus: '#7c3aed', accentFocusDark: '#a78bfa',
  btnPrimaryGradient: '#6d28d9',
  btnPrimaryGradientDark: '#7c3aed',
  tableHeaderGradient: '#6d28d9',
  tableHeaderGradientDark: '#4c1d95',
  duplicateIcon: '#be123c',
  systemBorder: '#a1a1aa',
  navActiveBg: '#f3e8ff', navActiveBgDark: 'rgba(167,139,250,0.2)',
  navActiveText: '#6d28d9', navActiveTextDark: '#a78bfa',
  navActiveBorder: '#6d28d9', navActiveBorderDark: '#a78bfa',
  avatarGradient: '#6d28d9',
  avatarGradientDark: '#7c3aed',
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

// ── 'plum-boardroom' — deep plum/aubergine identity (V_23.0: replaces the
// old 'executive' bronze/gold palette — gold read close enough to amber/
// yellow to risk colliding with Payment Due's own Due-Today indicator,
// which now owns yellow; see DueReportPage.tsx). Same "one warm family
// throughout" premium/boardroom feel as the palette it replaces, just
// shifted from warm gold to a jewel-tone violet-plum instead. Reuses
// EXISTING's own status-color families, same reasoning as 'midnight-navy'
// above. ──────────────────────────────────────────────────────────────
const PLUM_BOARDROOM: AppearancePalette = {
  label: 'Plum Boardroom',
  accent: '#581c87', accentDark: '#d8b4fe',
  accentHover: '#3b0764', accentHoverDark: '#e9d5ff',
  accentFocus: '#6b21a8', accentFocusDark: '#d8b4fe',
  btnPrimaryGradient: '#3b0764',
  btnPrimaryGradientDark: '#2e1065',
  tableHeaderGradient: '#3b0764',
  tableHeaderGradientDark: '#2e1065',
  duplicateIcon: '#b91c1c',
  systemBorder: '#78716c',
  navActiveBg: '#f3e8ff', navActiveBgDark: 'rgba(216,180,254,0.18)',
  navActiveText: '#581c87', navActiveTextDark: '#d8b4fe',
  navActiveBorder: '#581c87', navActiveBorderDark: '#d8b4fe',
  avatarGradient: '#3b0764',
  avatarGradientDark: '#2e1065',
  families: EXISTING.families,
};

// ── 'ocean-gradient' — teal-into-blue diagonal gradient. Unlike the 5
// palettes above (a flat single hex per role), tableHeaderGradient/
// btnPrimaryGradient/avatarGradient here are real two-stop CSS gradient
// strings — safe everywhere those three feed a plain `background`, since
// none of them are ever hex-parsed by mixHex/tintColor (only `accent`/
// `accentDark` are, so those two stay solid hex). ────────────────────────
const OCEAN_GRADIENT: AppearancePalette = {
  label: 'Ocean Gradient',
  accent: '#0e7490', accentDark: '#22d3ee',
  accentHover: '#155e75', accentHoverDark: '#67e8f9',
  accentFocus: '#0891b2', accentFocusDark: '#22d3ee',
  btnPrimaryGradient: 'linear-gradient(135deg, #0d9488, #0369a1)',
  btnPrimaryGradientDark: 'linear-gradient(135deg, #115e59, #0c4a6e)',
  tableHeaderGradient: 'linear-gradient(135deg, #0d9488, #0369a1)',
  tableHeaderGradientDark: 'linear-gradient(135deg, #115e59, #0c4a6e)',
  duplicateIcon: '#dc2626',
  systemBorder: '#94a3b8',
  navActiveBg: '#e0f2fe', navActiveBgDark: 'rgba(34,211,238,0.16)',
  navActiveText: '#0e7490', navActiveTextDark: '#22d3ee',
  navActiveBorder: '#0e7490', navActiveBorderDark: '#22d3ee',
  avatarGradient: 'linear-gradient(135deg, #0d9488, #0369a1)',
  avatarGradientDark: 'linear-gradient(135deg, #115e59, #0c4a6e)',
  families: LIGHT_PROFESSIONAL.families,
};

// ── 'sunset-gradient' was removed (V_23.0) — its orange-into-magenta
// gradient read too close to the warm/red family Payment Due's Overdue
// indicator now owns; see DueReportPage.tsx and the file-header note
// above 'midnight-navy'/'plum-boardroom'. ────────────────────────────────

// ── 'coral-reef' — built from the user-supplied Coolors palette (Light
// Cyan #D6FFF6, Russian Violet #231651, Medium Turquoise #4DCCBD, Spanish
// Blue #2374AB, Light Coral #FF8484). Light mode's gradient/nav tint pull
// from the palette's cool/light end (turquoise→blue, cyan tint); dark
// mode's gradient pulls from its dark end (violet→blue) instead of just
// darkening the same two stops, so it reads as a deliberate dark palette
// rather than a dimmed light one. Light Coral is reserved for the
// duplicate-marker icon — the palette's one warm accent, kept to a single
// narrow role rather than spent on a semantic status color. ─────────────
const CORAL_REEF: AppearancePalette = {
  label: 'Coral Reef',
  accent: '#2374AB', accentDark: '#4DCCBD',
  accentHover: '#1c5d87', accentHoverDark: '#7fdcd0',
  accentFocus: '#2374AB', accentFocusDark: '#4DCCBD',
  btnPrimaryGradient: 'linear-gradient(135deg, #4DCCBD, #2374AB)',
  btnPrimaryGradientDark: 'linear-gradient(135deg, #231651, #2374AB)',
  tableHeaderGradient: 'linear-gradient(135deg, #4DCCBD, #2374AB)',
  tableHeaderGradientDark: 'linear-gradient(135deg, #231651, #2374AB)',
  duplicateIcon: '#FF8484',
  systemBorder: '#94a3b8',
  navActiveBg: '#D6FFF6', navActiveBgDark: 'rgba(77,204,189,0.18)',
  navActiveText: '#2374AB', navActiveTextDark: '#4DCCBD',
  navActiveBorder: '#2374AB', navActiveBorderDark: '#4DCCBD',
  avatarGradient: 'linear-gradient(135deg, #4DCCBD, #2374AB)',
  avatarGradientDark: 'linear-gradient(135deg, #231651, #2374AB)',
  families: LIGHT_PROFESSIONAL.families,
};

// ── 'neutral-gray' — the requested "gray" option: no brand hue at all, a
// flat slate accent (not a gradient — a gradient would itself read as a
// color choice, working against the point of a neutral option). Dark mode
// isn't just a dimmed light mode — it moves to a genuinely dark slate
// (#1e293b) so the table header/buttons stay visibly a surface, not just
// gray-on-gray. Semantic status colors (warning/danger/success) stay the
// same universal hues every other palette uses — a neutral palette
// shouldn't make "rejected" or "approved" harder to read at a glance. ───
const NEUTRAL_GRAY: AppearancePalette = {
  label: 'Gray',
  accent: '#475569', accentDark: '#cbd5e1',
  accentHover: '#334155', accentHoverDark: '#e2e8f0',
  accentFocus: '#64748b', accentFocusDark: '#cbd5e1',
  btnPrimaryGradient: '#475569',
  btnPrimaryGradientDark: '#1e293b',
  tableHeaderGradient: '#475569',
  tableHeaderGradientDark: '#1e293b',
  duplicateIcon: '#dc2626',
  systemBorder: '#94a3b8',
  navActiveBg: '#f1f5f9', navActiveBgDark: 'rgba(148,163,184,0.18)',
  navActiveText: '#475569', navActiveTextDark: '#cbd5e1',
  navActiveBorder: '#475569', navActiveBorderDark: '#cbd5e1',
  avatarGradient: '#475569',
  avatarGradientDark: '#1e293b',
  families: EXISTING.families,
};

export const APPEARANCE_PALETTES: Record<AppearanceId, AppearancePalette> = {
  existing: EXISTING,
  'light-professional': LIGHT_PROFESSIONAL,
  'midnight-navy': MIDNIGHT_NAVY,
  modern: MODERN,
  'plum-boardroom': PLUM_BOARDROOM,
  'ocean-gradient': OCEAN_GRADIENT,
  'coral-reef': CORAL_REEF,
  'neutral-gray': NEUTRAL_GRAY,
};

// ── The CSS custom property names master.css's shared classes read.
// Keep this list and master.css's :root block in sync. ──────────────────
export interface AppearanceCssVars {
  '--master-accent': string;
  '--master-accent-focus': string;
  '--master-btn-primary-gradient': string;
  '--grad-table-header': string;
  // Overrides master.css's :root literal of the same name — this is what
  // makes every button/icon/pagination-control that reads var(--brand-
  // gradient) (rather than a hardcoded #0000FF) follow the selected
  // appearance instead of always rendering fixed brand blue.
  '--brand-gradient': string;
  // The accent as INK (text/icons), as opposed to --brand-gradient which
  // is the accent as PAINT (button fills, header bands).
  //
  // Every palette's accent is chosen to carry white text on top of it, so
  // they are all deep and saturated — and all of them land at 2.3-3.5:1
  // when used as a text color on the black theme, which is why "brand
  // colored" section headings, required-field asterisks, links and icons
  // faded into the background there. In dark mode this is the same hue
  // lifted toward white until it clears 4.5:1 on every dark surface; in
  // light mode it is byte-identical to --brand-gradient, so light theme
  // does not change at all.
  '--brand-ink': string;
  // V_24.0 — the vertical/horizontal divider color .master-table's th/td
  // borders read (master.css). Driven from the theme system (light/dark)
  // rather than a bare CSS `html.dark` selector, so it stays correct for
  // ANY page that spreads cssVars regardless of what other class names it
  // uses — this is what makes the same subtle grid line show up
  // identically on Masters/Employee/Customer/Payment tables alike.
  '--master-table-border': string;
}

export function useAppearanceTokens() {
  const { appearance } = useAppSelector((s) => s.appearance);
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';

  const palette = APPEARANCE_PALETTES[appearance] ?? APPEARANCE_PALETTES.existing;
  const t = getTheme(isDark);

  const cssVars: AppearanceCssVars = {
    '--master-accent': isDark ? palette.accentDark : palette.accent,
    '--master-accent-focus': isDark ? palette.accentFocusDark : palette.accentFocus,
    '--master-btn-primary-gradient': isDark ? palette.btnPrimaryGradientDark : palette.btnPrimaryGradient,
    '--grad-table-header': isDark ? palette.tableHeaderGradientDark : palette.tableHeaderGradient,
    // Same value as --master-btn-primary-gradient — one appearance-driven
    // "brand" color feeding both, since every button/icon/pagination
    // control this pass wires up is conceptually the same primary action
    // color as the "Add X" button.
    '--brand-gradient': isDark ? palette.btnPrimaryGradientDark : palette.btnPrimaryGradient,
    '--brand-ink': isDark
      ? mixHex(palette.btnPrimaryGradientDark, '#ffffff', ACCENT_INK_LIFT)
      : palette.btnPrimaryGradient,
    // Same literal values every .master-table th/td border already used
    // (via the old html.dark selector) — kept identical on purpose, just
    // routed through the dynamic token system instead of a static CSS
    // rule, so every table (including the ones that previously had no
    // border rule at all — Payment Due/Received/Approval/Upcoming,
    // Customer List) picks up the exact same, already-proven color the
    // moment it opts into .master-table.
    '--master-table-border': isDark ? '#2f2f2f' : '#e2e8f0',
  };

  // Status/badge colors are NO LONGER resolved from the appearance palette
  // or the light/dark mode. They now come from styles/statusColors.ts, the
  // single semantic source of truth, and are identical in both themes and
  // under every appearance.
  //
  // Why: a status color is what a row MEANS ("Approved" = green,
  // "Rejected" = red). Resolving it through the theme made the same record
  // render different colors in dark mode, and switching appearance
  // recolored every status in the app — the theme was changing
  // information, not presentation. The values returned here are exactly
  // the 'existing' palette's light-mode literals, i.e. the colors this app
  // has always shown in light mode, so nothing about light mode changes.
  //
  // palette.families is intentionally left in place: it still describes
  // each appearance and is what a future non-status accent could read.
  const family = (f: StatusFamily) => familyColors(f);

  return {
    appearance, isDark, t,
    accent: isDark ? palette.accentDark : palette.accent,
    accentHover: isDark ? palette.accentHoverDark : palette.accentHover,
    duplicateIcon: palette.duplicateIcon,
    systemBorder: palette.systemBorder,
    // Sidebar/Header shell tokens — see AppearancePalette's navActive*/
    // avatarGradient fields above.
    navActiveBg: isDark ? palette.navActiveBgDark : palette.navActiveBg,
    navActiveText: isDark ? palette.navActiveTextDark : palette.navActiveText,
    navActiveBorder: isDark ? palette.navActiveBorderDark : palette.navActiveBorder,
    avatarGradient: isDark ? palette.avatarGradientDark : palette.avatarGradient,
    family,
    // tintColor/tintGradient: shift a category color (or a two-stop
    // gradient string) toward this appearance's accent. 'existing' is a
    // no-op ratio, so every current caller's output is unchanged there.
    tintColor: (hex: string) => mixHex(hex, isDark ? palette.accentDark : palette.accent, appearance === 'existing' ? 0 : TINT_RATIO),
    tintGradient: (gradient: string) => tintGradientCss(gradient, isDark ? palette.accentDark : palette.accent, appearance === 'existing' ? 0 : TINT_RATIO),
    cssVars: cssVars as unknown as CSSProperties,
  };
}
