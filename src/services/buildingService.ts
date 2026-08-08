// src/services/buildingService.ts
// ==========================================
// DREAM GROUP CRM - BUILDING SERVICE
// ==========================================
// The backend (API v12) exposes Building Master as a nested "wizard" API —
// { project, building, wings[->floors[->flats]], shops[] }, camelCase field
// names, mounted at /api/buildings (plural) with /full sub-paths for the
// single-record endpoints. The rest of this app (BuildingCrudPage,
// BuildingListPage) was built against a flatter, snake_case `Building` shape
// (see types/index.ts) that predates that API. Rather than rewrite those
// pages, this file translates between the two shapes at the boundary.

import axiosInstance from './axiosConfig';
import {
  Building,
  BuildingListResponse,
  BuildingSingleResponse,
  BuildingDeleteResponse,
  BuildingWing,
  BuildingShop,
  CreateBuildingPayload,
  UpdateBuildingPayload,
} from '../types/index';

// ── Backend wire shapes (wizard) ────────────────────────────────────────────
interface WizardFlat { id: number; flatNo: string; flatType: string | null; flatArea: number | null; enabled: boolean; }
interface WizardFloor { id: number; floorName: string; flats: WizardFlat[]; }
interface WizardWing { id: number; wingName: string; withGroundFloor: boolean; numberOfFloors: number | null; floors: WizardFloor[]; }
interface WizardShop { id: number; shopNo: string; shopArea: number | null; enabled: boolean; }
interface WizardBuilding {
  id: number; name: string; code: string | null; has_parking: boolean;
  is_active: boolean; sort_order: number; created_at: string; updated_at?: string;
  project: { projectName: string; location: string | null } | null;
}
interface WizardFullResponse {
  building: WizardBuilding;
  wings: WizardWing[];
  shops: WizardShop[];
}

// A raw list row from GET /buildings — pre-aggregated counts instead of the
// full nested tree, so listing 500 buildings doesn't ship every flat.
// TypeORM's getRawMany() prefixes every .select([...]) column with its query
// alias ("b" here) -> b_id, b_name, etc; only the explicitly-aliased
// .addSelect(expr, 'alias') columns (project/wing_count/floor_count/flat_count)
// come through unprefixed. Same convention as the "u_password_hash" style
// keys seen from auth's raw queries.
interface BuildingListRow {
  b_id: number; b_name: string; b_code: string | null; b_address: string | null;
  b_has_parking: boolean; b_is_active: boolean; b_sort_order: number;
  b_created_at: string; b_updated_at: string;
  project: string | null;
  wing_count: number; floor_count: number; flat_count: number;
}

// Client-generated ids (see BuildingCrudPage's simpleId helper) look like
// "wing_001" — never purely numeric — so a purely-numeric string id is
// always a real server id round-tripped through the form.
const toServerId = (id: string | undefined): number | undefined =>
  id && /^\d+$/.test(id) ? Number(id) : undefined;

// ── Wizard response -> flat Building (used by get-one / create / update) ───
function fromWizardResponse(data: WizardFullResponse): Building {
  const { building: b, wings, shops } = data;
  return {
    id: String(b.id),
    project_name: b.project?.projectName || '',
    location: b.project?.location || '',
    building_name: b.name,
    wings: (wings || []).map((w): BuildingWing => ({
      id: String(w.id),
      name: w.wingName,
      no_of_floors: w.numberOfFloors ?? w.floors.length,
      with_ground_floor: w.withGroundFloor,
      floors: (w.floors || []).map((f, fi) => ({
        id: String(f.id),
        label: f.floorName,
        sort_order: fi,
        flats: (f.flats || []).map((fl) => ({
          id: String(fl.id),
          flat_no: fl.flatNo,
          flat_type: fl.flatType || '',
          area_sqft: fl.flatArea,
          is_active: fl.enabled,
        })),
      })),
    })),
    has_shops: (shops || []).length > 0,
    shops: (shops || []).map((s): BuildingShop => ({
      id: String(s.id),
      shop_no: s.shopNo,
      area_sqft: s.shopArea,
      is_active: s.enabled,
    })),
    has_parking: !!b.has_parking,
    is_active: b.is_active,
    created_at: b.created_at,
    updated_at: b.updated_at,
  };
}

// ── List row -> flat Building ───────────────────────────────────────────────
// BuildingListPage only ever reads counts (wings.length, and floors/flats
// summed across wings) off this shape, never individual wing/floor/flat
// names — so placeholder entries sized to match the aggregate counts are
// enough to make those counts come out right without shipping the full tree.
function fromListRow(row: BuildingListRow): Building {
  const placeholderFlats = Array.from({ length: row.flat_count }, (_, i) => ({
    id: `flat_${i + 1}`, flat_no: '', flat_type: '', area_sqft: null, is_active: true,
  }));
  const placeholderFloors = Array.from({ length: row.floor_count }, (_, i) => ({
    id: `floor_${i + 1}`, label: '', sort_order: i,
    flats: i === 0 ? placeholderFlats : [], // all fake flats on the first floor — total still matches flat_count
  }));
  const placeholderWings = Array.from({ length: row.wing_count }, (_, i) => ({
    id: `wing_${i + 1}`, name: '', no_of_floors: 0, with_ground_floor: false,
    floors: i === 0 ? placeholderFloors : [], // all fake floors on the first wing — total still matches floor_count
  }));

  return {
    id: String(row.b_id),
    project_name: row.project || '',
    location: '',
    building_name: row.b_name,
    wings: placeholderWings,
    has_shops: undefined,
    shops: undefined,
    has_parking: !!row.b_has_parking,
    is_active: row.b_is_active,
    created_at: row.b_created_at,
    updated_at: row.b_updated_at,
  };
}

// ── Flat CreateBuildingPayload -> wizard create/update payload ─────────────
function toWizardPayload(payload: CreateBuildingPayload) {
  return {
    project: {
      projectName: payload.project_name.trim(),
      location: payload.location?.trim() || null,
    },
    building: {
      buildingName: payload.building_name.trim(),
      buildingCode: null,
      hasParking: payload.has_parking,
    },
    wings: payload.wings.map((w) => ({
      id: toServerId(w.id),
      wingName: w.name.trim(),
      withGroundFloor: w.with_ground_floor,
      numberOfFloors: w.no_of_floors,
      floors: w.floors.map((f) => ({
        id: toServerId(f.id),
        floorName: f.label,
        flats: f.flats.map((fl) => ({
          id: toServerId(fl.id),
          flatNo: fl.flat_no.trim(),
          flatType: fl.flat_type || null,
          flatArea: fl.area_sqft,
          enabled: fl.is_active,
        })),
      })),
    })),
    shops: payload.has_shops
      ? payload.shops.map((s) => ({
          id: toServerId(s.id),
          shopNo: s.shop_no.trim(),
          shopArea: s.area_sqft,
          enabled: s.is_active,
        }))
      : [],
  };
}

// ── Fetch list of all buildings ─────────────────────────────────────────────
/** GET /api/buildings?is_active=true&page=1&limit=10 */
export const fetchBuildingList = async (
  page: number,
  limit: number,
  search?: string
): Promise<BuildingListResponse> => {
  const params: Record<string, string | number | boolean> = {
    is_active: true,
    page,
    limit,
  };
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const res = await axiosInstance.get('/buildings', { params });
  console.log('[buildingService] fetchBuildingList response:', res.data);
  return {
    success: res.data.success,
    message: res.data.message,
    rows: (res.data.rows as BuildingListRow[]).map(fromListRow),
    total: res.data.total,
    page: res.data.page,
    limit: res.data.limit,
  };
};

// ── Fetch single building by ID (with wings -> floors -> flats, + shops) ───
/** GET /api/buildings/:id/full */
export const fetchBuildingById = async (id: string): Promise<BuildingSingleResponse> => {
  const res = await axiosInstance.get(`/buildings/${id}/full`);
  console.log('[buildingService] fetchBuildingById response:', res.data);
  return {
    success: res.data.success,
    message: res.data.message,
    data: fromWizardResponse(res.data.data as WizardFullResponse),
  };
};

// ── Create new building ─────────────────────────────────────────────────────
/** POST /api/buildings/full */
export const createBuilding = async (
  payload: CreateBuildingPayload
): Promise<BuildingSingleResponse> => {
  const res = await axiosInstance.post('/buildings/full', toWizardPayload(payload));
  console.log('[buildingService] createBuilding response:', res.data);
  return {
    success: res.data.success,
    message: res.data.message,
    data: fromWizardResponse(res.data.data as WizardFullResponse),
  };
};

// ── Update existing building ────────────────────────────────────────────────
/** PUT /api/buildings/:id/full */
export const updateBuilding = async (
  id: string,
  payload: UpdateBuildingPayload
): Promise<BuildingSingleResponse> => {
  const res = await axiosInstance.put(`/buildings/${id}/full`, toWizardPayload(payload));
  console.log('[buildingService] updateBuilding response:', res.data);
  return {
    success: res.data.success,
    message: res.data.message,
    data: fromWizardResponse(res.data.data as WizardFullResponse),
  };
};

// ── Delete building ──────────────────────────────────────────────────────────
/** DELETE /api/buildings/:id */
export const deleteBuilding = async (id: string): Promise<BuildingDeleteResponse> => {
  const res = await axiosInstance.delete(`/buildings/${id}`);
  console.log('[buildingService] deleteBuilding response:', res.data);
  return res.data;
};

// Grouped export — same convenience pattern as companyService
export const buildingService = {
  getAll  : fetchBuildingList,
  getById : fetchBuildingById,
  create  : createBuilding,
  update  : updateBuilding,
  remove  : deleteBuilding,
};
