// ==========================================
// DGCRM — SEMANTIC STATUS COLORS (theme-independent)
// ==========================================
// The one place a status/badge color is defined.
//
// WHY THIS FILE EXISTS
// Status colors used to be resolved through the appearance/theme system:
// appearanceTokens.ts's `family()` returned a DIFFERENT pair of colors
// depending on whether dark mode was on (bgDark/fgDark) and on which
// appearance palette was selected, and MasterListUI's StatusBadge had its
// own `isDark ? ... : ...` branch on top of that. So the same record could
// show a green "Active" chip in light mode and a differently-green one in
// dark mode, and switching appearance recolored every status in the app.
//
// A status color is not decoration — it is what the row MEANS. "Approved"
// being green and "Rejected" being red is information, and information
// must not change because someone toggled the lights. Application theme
// styling (page, card, table, input, text) and semantic status styling are
// now two separate systems:
//
//   theme.ts / appearanceTokens.ts  -> how the APPLICATION looks
//   this file                        -> what a STATUS means
//
// Nothing here reads `isDark` or the selected appearance, and it must stay
// that way.
//
// READABILITY IN BOTH THEMES
// Each chip paints its OWN light background and dark-on-light text, so it
// carries its own contrast with it and never depends on what is behind it.
// Measured foreground-on-own-background contrast is 4.4:1-6.9:1 (WCAG AA
// for normal text is 4.5:1), and every chip background sits at 15:1 or
// better against the dark page, so the chip reads clearly in both themes.
//
// COLOR VALUES ARE UNCHANGED
// These are exactly the literals the app already used — the 'existing'
// appearance's light-mode family colors, which are themselves the values
// LeadStatusBadge.tsx and the master list pages hardcoded before the
// appearance system. Nothing about what a status looks like in light mode
// changes; dark mode simply stops overriding it.

/** The semantic bucket a status belongs to. Shared by every module, so a
 *  new status only has to be mapped to one of these — never given its own
 *  color. */
export type StatusFamily =
  | 'accentInfo' | 'info' | 'infoSky' | 'warning' | 'warningAmber'
  | 'neutral' | 'neutralMuted' | 'danger' | 'violet' | 'success';

export interface StatusColors {
  /** Chip background. */
  bg: string;
  /** Chip text/icon. */
  fg: string;
}

export const STATUS_FAMILY_COLORS: Record<StatusFamily, StatusColors> = {
  accentInfo:   { bg: '#e0e7ff', fg: '#4338ca' },
  info:         { bg: '#dbeafe', fg: '#1d4ed8' },
  infoSky:      { bg: '#e0f2fe', fg: '#0369a1' },
  warning:      { bg: '#fef9c3', fg: '#a16207' },
  warningAmber: { bg: '#fef3c7', fg: '#b45309' },
  neutral:      { bg: '#f3f4f6', fg: '#4b5563' },
  neutralMuted: { bg: '#f3f4f6', fg: '#6b7280' },
  danger:       { bg: '#fee2e2', fg: '#b91c1c' },
  violet:       { bg: '#ede9fe', fg: '#6d28d9' },
  success:      { bg: '#dcfce7', fg: '#15803d' },
};

/**
 * Every status word this application shows, mapped to its family. Adding a
 * status means adding a line HERE, not a color in a page.
 *
 * Keys are matched case-insensitively with spaces/hyphens normalised to
 * underscores (see statusFamilyFor), so 'Follow Up', 'follow-up' and
 * 'follow_up' all resolve to the same family.
 */
export const STATUS_FAMILY: Record<string, StatusFamily> = {
  // ── Lifecycle / record state ──
  active: 'success',
  inactive: 'danger',
  enabled: 'success',
  disabled: 'neutralMuted',
  deleted: 'neutralMuted',

  // ── Approval workflow ──
  approved: 'success',
  pending: 'warningAmber',
  pending_approval: 'warningAmber',
  rejected: 'danger',
  cancelled: 'neutralMuted',
  canceled: 'neutralMuted',
  completed: 'success',
  in_progress: 'info',
  on_hold: 'warning',

  // ── Payment / installment ──
  paid: 'success',
  unpaid: 'danger',
  due: 'danger',
  overdue: 'danger',
  partial: 'warningAmber',
  upcoming: 'warningAmber',
  scheduled: 'infoSky',

  // ── Attendance / leave ──
  present: 'success',
  absent: 'danger',
  half_day: 'warningAmber',
  late: 'warning',
  leave: 'violet',
  holiday: 'neutral',

  // ── Lead pipeline (was LEAD_STATUS_FAMILY in appearanceTokens.ts) ──
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
};

/** Normalises 'Follow Up' / 'follow-up' / 'FOLLOW_UP' to one lookup key. */
const normalise = (status: string): string =>
  status.trim().toLowerCase().replace(/[\s-]+/g, '_');

/** The family a status belongs to. Unknown statuses fall back to a neutral
 *  chip rather than throwing or rendering unstyled — a status this file has
 *  not been taught about should still be legible. */
export function statusFamilyFor(status: string, fallback: StatusFamily = 'neutral'): StatusFamily {
  return STATUS_FAMILY[normalise(status)] ?? fallback;
}

/** Colors for a status word. The same answer in light and dark mode, by
 *  design — see the header of this file. */
export function statusColors(status: string, fallback: StatusFamily = 'neutral'): StatusColors {
  return STATUS_FAMILY_COLORS[statusFamilyFor(status, fallback)];
}

/** Colors for a family directly, when the caller already knows it. */
export function familyColors(family: StatusFamily): StatusColors {
  return STATUS_FAMILY_COLORS[family];
}
