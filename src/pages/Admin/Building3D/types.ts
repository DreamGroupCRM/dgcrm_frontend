// ==========================================
// DREAM GROUP CRM - 3D BUILDING VIEW: SHARED TYPES
// ==========================================
// A UnitVM is the normalized shape BuildingScene renders for either a Flat
// or a Shop — the 3D scene never needs to know which one it's drawing.
// Status is derived purely from the SAME data the rest of the app already
// treats as the single source of truth (Building.wings[].floors[].flats[]
// and Building.shops[], both carrying is_active + booked_by_customer_id
// from buildingService.ts) — no second availability system, no new
// backend endpoint, no mock data.

export type UnitStatus = 'available' | 'booked' | 'blocked';

export interface UnitVM {
  kind: 'flat' | 'shop';
  id: string;
  no: string;
  typeLabel: string;       // e.g. '2 BHK', or 'Shop' for a shop unit
  areaSqft: number | null;
  status: UnitStatus;
  bookedByName: string | null;
  wingName: string | null;   // null for a shop (shops have no wing)
  floorLabel: string | null; // null for a shop
}

// 'building'  — every wing (as a tower) + a Shops block if the building has any
// 'wing'      — every floor of the selected wing, stacked
// 'floor'     — every flat on the selected floor
// 'shops'     — every shop in the building (shops have no floor of their own)
export type DrillLevel = 'building' | 'wing' | 'floor' | 'shops';

export function unitCounts(units: UnitVM[]): { total: number; available: number; booked: number; blocked: number } {
  let available = 0, booked = 0, blocked = 0;
  for (const u of units) {
    if (u.status === 'available') available++;
    else if (u.status === 'booked') booked++;
    else blocked++;
  }
  return { total: units.length, available, booked, blocked };
}
