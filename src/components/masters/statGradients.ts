// ==========================================
// DGCRM — KPI STAT CARD FILL COLOR
// ==========================================
// Every stat card (StatCard/MultiStatCard — Building/Employee/Customer
// List, Payment Due/Approvals/Received/Upcoming, Attendance, etc.) shares
// one brand fill — the SAME per-appearance color every table header band
// uses (master.css's --grad-table-header, set per Appearance in
// appearanceTokens.ts) — instead of a per-card accent color or a fixed
// literal, so switching the Appearance (e.g. to the green palette) recolors
// every top box the same way it already recolors every table header,
// instead of top boxes staying a fixed brand color while the rest of the
// page follows the chosen theme. Kept as a function (rather than inlining
// the value in every caller) so every stat card's fill still comes from
// this one place. `_color`/`_tint` are unused (same as before) — a
// per-card accent isn't part of this design, only the shared theme color.
export const getStatGradient = (_color?: string, _tint?: (gradient: string) => string): string => 'var(--grad-table-header)';
