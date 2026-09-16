// ==========================================
// DGCRM — KPI STAT CARD FILL COLOR
// ==========================================
// Every stat card (StatCard/MultiStatCard — Building/Employee/Customer
// List, Payment Due/Approvals/Received/Upcoming) shares one brand fill —
// the "top boxes" teal, matching the table-header teal (master.css's
// --grad-table-header) and distinct from the Add-X button/icon blue
// (--brand-gradient) — instead of a per-card accent color, per explicit
// product decision — so this deliberately ignores both the caller's
// `color` prop and the active appearance's tint (a tint would shift the
// fill away from the brand color toward whatever accent the viewer has
// chosen). Kept as a function (rather than inlining the value in every
// caller) so every stat card's fill still comes from this one place.
const STAT_CARD_BRAND_COLOR = '#0A7474';

export const getStatGradient = (_color?: string, _tint?: (gradient: string) => string): string => STAT_CARD_BRAND_COLOR;
