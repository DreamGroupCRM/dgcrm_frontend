// ==========================================
// DGCRM — KPI STAT CARD FILL COLOR
// ==========================================
// Every stat card (StatCard/MultiStatCard — Building/Employee/Customer
// List, Payment Due/Approvals/Received/Upcoming) shares one brand fill —
// the same flat blue used for Add-X buttons and table header
// bands (see master.css's --brand-gradient) — instead of a per-card accent
// color, per explicit product decision — so this deliberately ignores
// both the caller's `color` prop and the active appearance's tint (a tint
// would shift the fill away from the brand color toward whatever accent
// the viewer has chosen). Kept as a function (rather than inlining the
// value in every caller) so every stat card's fill still comes from this
// one place. Duplicated as a literal (not var(--brand-gradient)) since
// this sets a JS/inline-style string, not a stylesheet rule — keep this
// hex value in sync with master.css's --brand-gradient if either changes.
const STAT_CARD_BRAND_COLOR = '#2563eb';

export const getStatGradient = (_color?: string, _tint?: (gradient: string) => string): string => STAT_CARD_BRAND_COLOR;
