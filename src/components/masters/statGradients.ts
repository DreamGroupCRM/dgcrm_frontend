// ==========================================
// DGCRM — KPI STAT CARD GRADIENT PALETTE
// ==========================================
// A small, fixed set of two-tone gradients keyed by the same accent hex
// every stat card already passes as its `color` prop. Used only by
// StatCard/MultiStatCard (Employee Details List + Building List) and
// Customer Details List's own matching inline cards — the plain masters
// (Company/Department/Bank/Roles) deliberately keep their existing flat
// surfaceBg card look and don't import this.
const GRADIENTS: Record<string, string> = {
  '#7c3aed': 'linear-gradient(135deg,#6d28d9,#a855f7)', // purple — Total
  '#16a34a': 'linear-gradient(135deg,#059669,#22c55e)', // green — Active/Enabled
  '#ea580c': 'linear-gradient(135deg,#c2410c,#fb923c)', // orange — New/On Leave/Pending
  '#dc2626': 'linear-gradient(135deg,#b91c1c,#f87171)', // red — Inactive/Disabled
  '#2563eb': 'linear-gradient(135deg,#1d4ed8,#60a5fa)', // blue — info
  '#db2777': 'linear-gradient(135deg,#be185d,#f472b6)', // pink — Shops
  '#0891b2': 'linear-gradient(135deg,#0e7490,#22d3ee)', // cyan — Wings
};
const DEFAULT_GRADIENT = 'linear-gradient(135deg,#4338ca,#6366f1)';

// Optional `tint` (useAppearanceTokens()'s tintGradient) lets the caller's
// active appearance shift this card's hue toward its accent, while keeping
// the card's own distinct color family — omitted, this is unchanged.
export const getStatGradient = (color: string, tint?: (gradient: string) => string): string => {
  const gradient = GRADIENTS[color] ?? DEFAULT_GRADIENT;
  return tint ? tint(gradient) : gradient;
};
