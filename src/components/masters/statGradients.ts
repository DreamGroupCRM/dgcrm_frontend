// ==========================================
// DGCRM — KPI STAT CARD FILL COLOR
// ==========================================
// Every stat card (StatCard/MultiStatCard — Building/Employee/Customer
// List, Payment Due/Approvals/Received/Upcoming) now shares one flat Navy
// Blue fill instead of a per-card accent gradient, per explicit product
// decision — so this deliberately ignores both the caller's `color` prop
// and the active appearance's tint (a tint would shift the fill away from
// "Navy Blue" toward whatever accent the viewer has chosen). Kept as a
// function (rather than inlining the hex in every caller) so every stat
// card's fill still comes from this one place.
const STAT_CARD_NAVY = '#0F1F4B';

export const getStatGradient = (_color?: string, _tint?: (gradient: string) => string): string => STAT_CARD_NAVY;
