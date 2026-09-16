// ==========================================
// DGCRM — KPI STAT CARD FILL COLOR
// ==========================================
// Every stat card (StatCard/MultiStatCard — Building/Employee/Customer
// List, Payment Due/Approvals/Received/Upcoming) shares one brand fill —
// the "top boxes" grey, its own color distinct from the Add-X button/icon
// blue (master.css's --brand-gradient) and the table-header teal
// (--grad-table-header) — instead of a per-card accent color, per explicit
// product decision — so this deliberately ignores both the caller's
// `color` prop and the active appearance's tint (a tint would shift the
// fill away from the brand color toward whatever accent the viewer has
// chosen). Kept as a function (rather than inlining the value in every
// caller) so every stat card's fill still comes from this one place.
const STAT_CARD_BRAND_COLOR = '#808080';

export const getStatGradient = (_color?: string, _tint?: (gradient: string) => string): string => STAT_CARD_BRAND_COLOR;
