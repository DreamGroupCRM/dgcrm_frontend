// ==========================================
// DREAM GROUP CRM - PAYMENT DUE STATUS COLOURS
// ==========================================
// V_25.0 — the one colour code used everywhere on Payment Due, so a glance
// tells the status: Overdue = red, Due Today = green, Upcoming = yellow.
// Solid backgrounds with readable text (white on red/green, near-black on
// yellow). Green and yellow are the same shades the Building View uses
// (Building2DViewPage STATUS_COLOR), so both screens read alike. Fixed hex
// values — they never change with the theme.
export type DueStatus = 'overdue' | 'due_today' | 'upcoming';

export const DUE_STATUS: Record<DueStatus, { bg: string; fg: string; label: string }> = {
  overdue: { bg: '#dc2626', fg: '#ffffff', label: 'Overdue' },
  due_today: { bg: '#16a34a', fg: '#ffffff', label: 'Due Today' },
  upcoming: { bg: '#eab308', fg: '#1f2937', label: 'Upcoming' },
};
