// ==========================================
// DREAM GROUP CRM - 2D BUILDING VIEW
// ==========================================
// One complete building design: every wing is its own column of floors,
// every flat a colored square carrying its own flat number + area, wings
// placed side by side with visible space between them, and shops drawn as
// their own row directly under the ground floor (never beside the wings).
// Status is color-coded straight on each block — Green = Available,
// Yellow = Booked, Red = Unavailable — with no separate stat cards or
// side table: the picture (plus the color legend explaining it) is the
// whole page.
//
// Reads the EXISTING Building Master hierarchy (Building -> Wing -> Floor
// -> Flat, plus Building -> Shop) via buildingService's FetchBuildingList/
// ViewBuilding — the exact same calls Building Master and Customer Create
// already use. Every color reflects the same is_active (Building Master's
// Enabled/Disabled toggle) and booked_by_customer_id (an active Customer's
// flat_id/shop_id) fields the rest of the app already treats as the source
// of truth. If a building shows no picture at all, it genuinely has no
// wings/shops configured yet in Building Master — add them there first.
//
// Entry points (all converge on this one page):
//   - Sidebar "Building View" -> blank picker, choose a building
//   - Building Master row's "View 2D Structure" icon -> ?buildingId=<id>
//   - Customer Create's "Select Flat" button -> navigate() with
//     location.state = { pickerMode: true, returnPath, preselectBuildingId }
//     and, on confirming an available unit, navigates back to returnPath
//     with location.state.selectedUnit for CustomerDetailsCrudPage to read.
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/utils/toast';
import { MdArrowBack, MdCheckCircle, MdKeyboardArrowDown, MdOpenInNew } from 'react-icons/md';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { FetchBuildingList, ViewBuilding } from '../../../services/buildingService';
import { Building, BuildingFlat, BuildingShop, BuildingWing } from '../../../types/index';
import { ROUTES } from '../../../constants';
import { UnitVM, UnitStatus } from './types';
import './Building2D.css';
import { useRoleBasePath } from '../../../hooks/useRoleBasePath';
import FloorPlanView from './FloorPlanView';
import BuildingElevation from './BuildingElevation';
import PanZoom from './PanZoom';
import FlatTooltip, { HoverState, PlanFlat } from './FlatTooltip';
import { shortFloorLabel } from './floorLabels';

// Exported — Building2DViewModal (the popup opened from Building Master's
// row icon) reuses these instead of duplicating the status/color logic.
export const flatStatus = (f: BuildingFlat): UnitStatus => {
  if (f.is_active === false) return 'blocked';
  if (f.booked_by_customer_id) return 'booked';
  return 'available';
};
export const shopStatus = (s: BuildingShop): UnitStatus => {
  if (s.is_active === false) return 'blocked';
  if (s.booked_by_customer_id) return 'booked';
  return 'available';
};

// Exactly the 3 colors asked for: Green = Available, Yellow = Booked,
// Dark Red = Not for Sale (an admin-disabled flat/shop).
export const STATUS_COLOR: Record<UnitStatus, string> = { available: '#16a34a', booked: '#eab308', blocked: '#8b0000' };
export const STATUS_TEXT: Record<UnitStatus, string> = { available: 'Available', booked: 'Booked', blocked: 'Not for Sale' };
// Booked's fill is a bright true yellow — dark text reads far better on it
// than white; Available/Unavailable stay dark enough for white text.
export const STATUS_TEXT_COLOR: Record<UnitStatus, string> = { available: '#ffffff', booked: '#1f2937', blocked: '#ffffff' };

interface PickerNavState {
  pickerMode?: boolean;
  returnPath?: string;
  preselectBuildingId?: string;
}

// Shape Customer Create reads back on return — see CustomerDetailsCrudPage's
// handling of location.state.selectedUnit (wired alongside this page).
export interface SelectedUnitForCustomer {
  unitType: 'flat' | 'shop';
  companyName: string;
  projectName: string;
  buildingName: string;
  wingName: string;
  floorLabel: string;
  no: string;
}

export interface FloorRow { id: string; label: string; sortOrder: number; flats: { id: string; flat_no: string; area_sqft: number | null; status: UnitStatus; bookedByName: string | null }[] }

// Ground-first (ascending sort_order) per wing — see WingColumn's
// column-reverse comment for why that order is what stacks correctly.
export const floorsOf = (w: BuildingWing): FloorRow[] =>
  [...w.floors]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => ({
      id: f.id, label: f.label, sortOrder: f.sort_order,
      flats: f.flats.map((fl) => ({
        id: fl.id, flat_no: fl.flat_no, area_sqft: fl.area_sqft,
        status: flatStatus(fl), bookedByName: fl.booked_by_customer_name ?? null,
      })),
    }));

// ── Picture scale ────────────────────────────────────────────────────
// Every measurement the building picture is built from, in one place and
// shared with Building2DViewModal (which imports UnitBlock/WingColumn from
// here), so the page and the popup can never drift apart.
//
// These were reduced from their original values because a realistic
// building did not fit: 3 wings of 4 flats laid out 1180px wide inside a
// ~1063px frame. The old numbers, for reference, were unit 66x58, flat gap
// 6, floor gap 8, label 44, wing gap 56, card padding 24/32 — the same
// building now comes out around 955px and fits without scrolling at all on
// a normal desktop, while staying comfortably readable.
//
// Buildings bigger than this (more wings, more flats per floor) still
// overflow, which is expected and is what the scroll container in
// Building2D.css is for — both axes, and both actually reachable.
export const SCALE = {
  unitW: 56,
  unitH: 48,
  /** Gap between flats on the same floor. */
  flatGap: 5,
  /** Gap between stacked floors. */
  floorGap: 6,
  /** Gap between a floor's label and its first flat. */
  labelGap: 8,
  /** Width of the "Ground"/"1 Floor" label column. */
  labelW: 36,
  /** Gap between wings. */
  wingGap: 36,
  /** Padding inside the building card. */
  cardPad: '20px 24px',
} as const;

// ── One colored square — a flat or a shop — carrying its own number + area
export const UnitBlock: React.FC<{
  no: string; area: number | null; status: UnitStatus; selected: boolean; clickable: boolean; onClick: () => void; extraTitle?: string;
}> = ({ no, area, status, selected, clickable, onClick, extraTitle }) => (
  <div
    onClick={clickable ? onClick : undefined}
    title={`${no} — ${STATUS_TEXT[status]}${extraTitle ? ` — ${extraTitle}` : ''}`}
    style={{
      width: SCALE.unitW, height: SCALE.unitH, borderRadius: 8, flexShrink: 0,
      background: STATUS_COLOR[status],
      border: selected ? '3px solid #1d4ed8' : '2px solid rgba(255,255,255,0.65)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: STATUS_TEXT_COLOR[status], cursor: clickable ? 'pointer' : 'default',
      boxShadow: selected ? '0 0 0 3px rgba(29,78,216,0.25)' : '0 1px 3px rgba(0,0,0,0.15)',
      transition: 'transform 0.1s ease', userSelect: 'none',
    }}
  >
    <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.1 }}>{no}</div>
    <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.92, marginTop: 1 }}>
      {area != null ? `${area} sqft` : '—'}
    </div>
  </div>
);

// ── One wing — floors stacked ground-up, tallest wing sets the height ───
export const WingColumn: React.FC<{
  wing: BuildingWing; floors: FloorRow[]; pickerMode: boolean;
  selectedId: string | null;
  onSelect: (unit: { id: string; no: string; status: UnitStatus; floorLabel: string; areaSqft: number | null; bookedByName: string | null }) => void;
}> = ({ wing, floors, pickerMode, selectedId, onSelect }) => (
  <div className="flex flex-col items-center">
    <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10, letterSpacing: '0.03em' }}>{wing.name}</div>
    {/* column-reverse: floors are listed Ground-first in the array, so the
        first DOM child (Ground) lands at the bottom and each subsequent
        floor stacks upward — exactly how a real building reads. */}
    <div className="flex flex-col-reverse" style={{ gap: SCALE.floorGap }}>
      {floors.map((floor) => (
        <div key={floor.id} className="flex items-center" style={{ gap: SCALE.labelGap }}>
          <div style={{ width: SCALE.labelW, textAlign: 'right', fontSize: 9.5, fontWeight: 700, opacity: 0.65, flexShrink: 0 }}>
            {floor.label}
          </div>
          <div className="flex" style={{ gap: SCALE.flatGap }}>
            {floor.flats.map((fl) => (
              <UnitBlock
                key={fl.id}
                no={fl.flat_no} area={fl.area_sqft} status={fl.status}
                selected={selectedId === fl.id}
                clickable={pickerMode && fl.status === 'available'}
                extraTitle={fl.status === 'booked' && fl.bookedByName ? `Booked by ${fl.bookedByName}` : undefined}
                onClick={() => onSelect({ id: fl.id, no: fl.flat_no, status: fl.status, floorLabel: floor.label, areaSqft: fl.area_sqft, bookedByName: fl.bookedByName })}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Building2DViewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useAppearanceTokens();
  const paths = useRoleBasePath();

  const navState = (location.state as PickerNavState) || {};
  const pickerMode = !!navState.pickerMode;
  const returnPath = navState.returnPath;

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [buildingDetail, setBuildingDetail] = useState<Building | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState<UnitVM | null>(null);
  // Interactive floor plan (default) or the existing whole-building picture.
  const [viewMode, setViewMode] = useState<'plan' | 'overview'>('plan');
  const [selectedWingId, setSelectedWingId] = useState<string>('');
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  // Customer id behind a selected booked flat, for "View Details".
  const [selectedBookedById, setSelectedBookedById] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await FetchBuildingList(1, 1000);
        if (res.success) setBuildings(res.rows ?? []);
      } catch { /* selector just stays empty if this fails */ }
      finally { setLoadingBuildings(false); }
    })();
  }, []);

  useEffect(() => {
    if (selectedBuildingId) return;
    const fromQuery = searchParams.get('buildingId');
    const preselect = fromQuery || navState.preselectBuildingId;
    if (preselect) setSelectedBuildingId(preselect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings]);

  useEffect(() => {
    if (!selectedBuildingId) { setBuildingDetail(null); return; }
    let cancelled = false;
    setLoadingDetail(true);
    setSelectedUnit(null);
    setSelectedBookedById(null);
    (async () => {
      try {
        const res = await ViewBuilding(selectedBuildingId);
        if (!cancelled && res.success) setBuildingDetail(res.data);
      } catch { toast.error('Failed to load this building’s structure.'); }
      finally { if (!cancelled) setLoadingDetail(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedBuildingId]);

  const wings = buildingDetail?.wings ?? [];
  const shops = buildingDetail?.shops ?? [];

  // ── Floor plan: wing + floor come from the loaded building only ────────
  const selectedWing = wings.find((w) => w.id === selectedWingId) ?? null;
  // A newly loaded building starts on its first wing.
  useEffect(() => {
    setSelectedWingId(wings[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingDetail]);
  // A wing starts on its lowest floor that has flats (else its lowest floor).
  // (A floor already chosen in this wing — e.g. by clicking a window on the
  // elevation — is kept.)
  useEffect(() => {
    if (!selectedWing) { setSelectedFloorId(null); return; }
    setSelectedFloorId((cur) => {
      if (cur && selectedWing.floors.some((f) => f.id === cur)) return cur;
      const asc = [...selectedWing.floors].sort((a, b) => a.sort_order - b.sort_order);
      return (asc.find((f) => f.flats.length > 0) ?? asc[0])?.id ?? null;
    });
  }, [selectedWing]);
  const selectedFloor = selectedWing?.floors.find((f) => f.id === selectedFloorId) ?? null;
  const wingFloorsTopFirst = useMemo(() => [...(selectedWing?.floors ?? [])].sort((a, b) => b.sort_order - a.sort_order), [selectedWing]);
  const [hover, setHover] = useState<HoverState | null>(null);
  const onHoverFlat = (flat: PlanFlat | null, e?: React.MouseEvent) =>
    setHover(flat && e ? { flat, clientX: e.clientX, clientY: e.clientY } : null);
  const chooseFloor = (wingId: string, floorId: string) => {
    setSelectedWingId(wingId); setSelectedFloorId(floorId); setSelectedUnit(null); setSelectedBookedById(null);
  };

  // Counts for the selected wing's flats (same status rule as the picture).
  const wingCounts = useMemo(() => {
    const c = { total: 0, available: 0, booked: 0, blocked: 0 };
    for (const f of selectedWing?.floors ?? []) for (const fl of f.flats) { c.total++; c[flatStatus(fl)]++; }
    return c;
  }, [selectedWing]);

  // Selecting a flat (on the elevation or the plan) also moves the wing and
  // floor to it, so the floor plan always shows the selected flat.
  const handlePlanSelect = (f: PlanFlat) => {
    setSelectedWingId(f.wingId); setSelectedFloorId(f.floorId);
    setSelectedUnit({
      kind: 'flat', id: f.id, no: f.no, typeLabel: f.type || '—', areaSqft: f.areaSqft,
      status: f.status, bookedByName: f.bookedByName, wingName: f.wingName, floorLabel: f.floorLabel,
    });
    setSelectedBookedById(f.bookedById);
  };

  // "Select Flat": inside Customer Create's picker flow it confirms the
  // selection (existing hand-off); otherwise an admin can start a new
  // customer booking with this flat prefilled — the same selectedUnit
  // hand-off Customer Create already reads.
  const canStartBooking = paths.isAdmin && !pickerMode;
  const handleSelectFlatAction = () => {
    if (!selectedUnit || selectedUnit.status !== 'available' || !buildingDetail) return;
    if (pickerMode) { handleConfirmSelect(); return; }
    if (!canStartBooking) return;
    const payload: SelectedUnitForCustomer = {
      unitType: selectedUnit.kind,
      companyName: buildingDetail.business_company_name || '',
      projectName: buildingDetail.project_name || '',
      buildingName: buildingDetail.building_name || '',
      wingName: selectedUnit.wingName || '',
      floorLabel: selectedUnit.floorLabel || '',
      no: selectedUnit.no,
    };
    navigate(`${paths.customerDetails}/add`, { state: { selectedUnit: payload } });
  };
  // "View Details": a booked flat opens its customer's existing record.
  const handleViewDetails = () => {
    if (selectedBookedById) navigate(`${paths.customerDetails}/view/${selectedBookedById}`);
  };

  // Heading name comes from the buildings list (available the instant a
  // building is picked) rather than buildingDetail (which only resolves
  // once its own fetch finishes) — same as Building2DViewModal's header.
  const selectedBuildingName = buildings.find((b) => b.id === selectedBuildingId)?.building_name || '';

  const handleSelectFlat = (w: BuildingWing, unit: { id: string; no: string; status: UnitStatus; floorLabel: string; areaSqft: number | null; bookedByName: string | null }) => {
    setSelectedBookedById(null);
    setSelectedUnit({
      kind: 'flat', id: unit.id, no: unit.no, typeLabel: '—', areaSqft: unit.areaSqft,
      status: unit.status, bookedByName: unit.bookedByName, wingName: w.name, floorLabel: unit.floorLabel,
    });
  };

  const handleSelectShop = (s: BuildingShop) => {
    setSelectedBookedById(null);
    setSelectedUnit({
      kind: 'shop', id: s.id, no: s.shop_no, typeLabel: 'Shop', areaSqft: s.area_sqft,
      status: shopStatus(s), bookedByName: s.booked_by_customer_name ?? null, wingName: null, floorLabel: null,
    });
  };

  const handleConfirmSelect = () => {
    if (!selectedUnit || selectedUnit.status !== 'available' || !buildingDetail) return;
    if (!pickerMode || !returnPath) return;
    const payload: SelectedUnitForCustomer = {
      unitType: selectedUnit.kind,
      companyName: buildingDetail.business_company_name || '',
      projectName: buildingDetail.project_name || '',
      buildingName: buildingDetail.building_name || '',
      wingName: selectedUnit.wingName || '',
      floorLabel: selectedUnit.floorLabel || '',
      no: selectedUnit.no,
    };
    navigate(returnPath, { state: { selectedUnit: payload } });
  };

  // Building Master is admin-only, and this page is now also reachable
  // from the employee sidebar — sending an employee to ROUTES.ADMIN.BUILDING
  // would bounce them off ProtectedRoute. Admins keep the old destination;
  // everyone else goes back the way they came.
  const handleBack = () => {
    if (pickerMode && returnPath) { navigate(returnPath); return; }
    navigate(paths.isAdmin ? ROUTES.ADMIN.BUILDING : `${paths.root}/dashboard`);
  };

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      {/* ── Header — single row, matching Building2DViewModal's popup
          header: heading + building switcher grouped on the left, the
          3-color legend + Back button grouped on the right. ───────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center flex-wrap" style={{ gap: 14, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: t.textPrimary, margin: 0, lineHeight: '34px', wordBreak: 'break-word' }}>
            {selectedBuildingName ? `${selectedBuildingName} 2D View` : 'Building View'}
          </h1>
          <div className="relative" style={{ minWidth: 240 }}>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              disabled={loadingBuildings}
              style={{
                width: '100%', height: 34, appearance: 'none', padding: '0 30px 0 12px', borderRadius: 8, fontSize: 13,
                background: loadingBuildings ? t.insetBg : t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText,
                cursor: loadingBuildings ? 'not-allowed' : 'pointer', outline: 'none',
              }}
            >
              <option value="">{loadingBuildings ? 'Loading buildings...' : '-- Select Building --'}</option>
              {buildings.filter((b) => b.is_active || b.id === selectedBuildingId).map((b) => (
                <option key={b.id} value={b.id}>{b.building_name} ({b.project_name})</option>
              ))}
            </select>
            <MdKeyboardArrowDown size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: t.textSecondary, pointerEvents: 'none' }} />
          </div>
        </div>

        <div className="flex items-center justify-end flex-wrap" style={{ gap: 14 }}>
          <div className="flex items-center flex-wrap" style={{ gap: 12 }}>
            {(['blocked', 'available', 'booked'] as UnitStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: STATUS_COLOR[s], display: 'inline-block', flexShrink: 0 }} />
                {STATUS_TEXT[s]}
              </span>
            ))}
          </div>
          <button type="button" onClick={handleBack}
            className="flex items-center gap-1.5"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 8, padding: '7px 14px', color: t.textPrimary, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>
            <MdArrowBack size={16} /> Back
          </button>
        </div>
      </div>

      {/* ── View switch + wing tabs + the selected wing's counts ─────────── */}
      {buildingDetail && wings.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${t.surfaceBorder}` }} role="tablist" aria-label="View">
              {([['plan', 'Floor Plan'], ['overview', 'Building Overview']] as const).map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={viewMode === k} onClick={() => setViewMode(k)}
                  style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: viewMode === k ? '#2563eb' : t.surfaceBg, color: viewMode === k ? '#fff' : t.textPrimary }}>
                  {label}
                </button>
              ))}
            </div>
            {viewMode === 'plan' && wings.length > 1 && (
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Wings">
                {wings.map((w) => (
                  <button key={w.id} type="button" role="tab" aria-selected={w.id === selectedWingId}
                    onClick={() => { setSelectedWingId(w.id); setSelectedUnit(null); setSelectedBookedById(null); }}
                    style={{ padding: '6px 12px', fontSize: 12.5, fontWeight: 700, borderRadius: 999, cursor: 'pointer',
                      border: `1px solid ${w.id === selectedWingId ? '#2563eb' : t.surfaceBorder}`,
                      background: w.id === selectedWingId ? 'rgba(37,99,235,0.12)' : t.surfaceBg,
                      color: w.id === selectedWingId ? '#2563eb' : t.textPrimary }}>
                    {w.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {viewMode === 'plan' && selectedWing && (
            <div className="flex flex-wrap gap-2">
              {([['Total Units', wingCounts.total, t.textPrimary], [STATUS_TEXT.available, wingCounts.available, STATUS_COLOR.available],
                 [STATUS_TEXT.booked, wingCounts.booked, STATUS_COLOR.booked], [STATUS_TEXT.blocked, wingCounts.blocked, STATUS_COLOR.blocked]] as const).map(([label, n, c]) => (
                <div key={label} className="flex items-center gap-2 rounded-xl" style={{ padding: '6px 12px', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
                  {label !== 'Total Units' && <span style={{ width: 10, height: 10, borderRadius: 999, background: c }} />}
                  <span style={{ fontSize: 11.5, color: t.textSecondary, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Interactive floor plan + Unit Details ──────────────────────── */}
      {viewMode === 'plan' && buildingDetail && wings.length > 0 && (
        <div className="bv-layout">
          {/* ── Building elevation + floor list ─────────────────────────── */}
          <div className="bv-card bv-building-card" style={{ background: t.surfaceBg, borderColor: t.surfaceBorder }}>
            <div className="bv-floor-list" role="tablist" aria-label={`Floors of ${selectedWing?.name ?? ''}`}>
              {wingFloorsTopFirst.map((f) => {
                const active = f.id === selectedFloorId;
                return (
                  <button key={f.id} type="button" role="tab" aria-selected={active} title={f.label}
                    onClick={() => selectedWing && chooseFloor(selectedWing.id, f.id)}
                    className={`bv-floor-btn${active ? ' bv-floor-btn-active' : ''}`}
                    style={active ? undefined : { background: t.surfaceBg, color: t.textPrimary, borderColor: t.surfaceBorder }}>
                    {shortFloorLabel(f.label)}
                  </button>
                );
              })}
            </div>
            <PanZoom t={t} resetKey={`${buildingDetail.id}`} className="bv-sky" maxFit={1.6}>
              <BuildingElevation wings={wings} selectedWingId={selectedWingId} selectedFloorId={selectedFloorId}
                selectedFlatId={selectedUnit?.kind === 'flat' ? selectedUnit.id : null}
                onSelectFlat={handlePlanSelect} onSelectFloor={chooseFloor} onHover={onHoverFlat} />
            </PanZoom>
            <div className="bv-legend">
              {(['available', 'booked', 'blocked'] as UnitStatus[]).map((st) => (
                <span key={st}><i style={{ background: STATUS_COLOR[st] }} />{STATUS_TEXT[st]}</span>
              ))}
              <span><i style={{ background: 'transparent', border: '2px solid #2563eb' }} />Selected</span>
            </div>
          </div>

          <div className="bv-side">
            {/* ── Floor plan of the selected floor ─────────────────────── */}
            <div className="bv-card" style={{ background: t.surfaceBg, borderColor: t.surfaceBorder, color: t.textPrimary }}>
              <div className="bv-card-title">{selectedFloor ? `${selectedFloor.label} — ${selectedWing?.name ?? ''}` : 'Floor Plan'}</div>
              <div className="bv-plan-box">
                {selectedWing && selectedFloor && selectedFloor.flats.length > 0 ? (
                  <PanZoom t={t} resetKey={`${selectedWing.id}:${selectedFloor.id}`} maxFit={1.2} fitPadding={12}>
                    <FloorPlanView t={t} wing={selectedWing} floor={selectedFloor}
                      selectedFlatId={selectedUnit?.kind === 'flat' ? selectedUnit.id : null}
                      onSelectFlat={handlePlanSelect} onHover={onHoverFlat} />
                  </PanZoom>
                ) : selectedWing ? (
                  <FloorPlanView t={t} wing={selectedWing} floor={selectedFloor} selectedFlatId={null}
                    onSelectFlat={handlePlanSelect} onHover={onHoverFlat} />
                ) : (
                  <div className="bv-empty" style={{ color: t.textSecondary }}>Select a wing.</div>
                )}
              </div>
            </div>

          <div className="bv-card fp-details" style={{ background: t.surfaceBg, borderColor: t.surfaceBorder, color: t.textPrimary }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 8 }}>Unit Details</div>
            {!selectedUnit ? (
              <div style={{ fontSize: 12.5, color: t.textSecondary, padding: '12px 0' }}>
                Click a flat on the floor plan to see its details.
              </div>
            ) : (
              <>
                {([
                  ['Flat Number', selectedUnit.no],
                  ['Building', buildingDetail.building_name],
                  ['Wing', selectedUnit.wingName || '—'],
                  ['Floor', selectedUnit.floorLabel || '—'],
                  ['Unit Type', selectedUnit.typeLabel || '—'],
                  ['Area', selectedUnit.areaSqft != null ? `${selectedUnit.areaSqft.toLocaleString('en-IN')} sq.ft` : '—'],
                  ['Price', '—'],
                ] as const).map(([k, v]) => (
                  <div key={k} className="fp-details-row"><span>{k}</span><span>{v}</span></div>
                ))}
                <div className="fp-details-row">
                  <span>Status</span>
                  <span className="flex items-center gap-1.5" style={{ color: STATUS_COLOR[selectedUnit.status] === STATUS_COLOR.booked ? '#a16207' : STATUS_COLOR[selectedUnit.status] }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: STATUS_COLOR[selectedUnit.status] }} />
                    {STATUS_TEXT[selectedUnit.status]}
                  </span>
                </div>
                {selectedUnit.status === 'booked' && selectedUnit.bookedByName && (
                  <div className="fp-details-row"><span>Booked By</span><span>{selectedUnit.bookedByName}</span></div>
                )}
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={handleSelectFlatAction}
                    disabled={selectedUnit.status !== 'available' || (!pickerMode && !canStartBooking)}
                    title={selectedUnit.status !== 'available' ? `This flat is ${STATUS_TEXT[selectedUnit.status]}` : pickerMode ? 'Use this flat for the customer' : 'Start a customer booking with this flat'}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl"
                    style={{ height: 38, fontSize: 13, fontWeight: 700, border: 'none', color: '#fff',
                      background: selectedUnit.status === 'available' && (pickerMode || canStartBooking) ? '#2563eb' : '#94a3b8',
                      cursor: selectedUnit.status === 'available' && (pickerMode || canStartBooking) ? 'pointer' : 'not-allowed' }}>
                    <MdCheckCircle size={15} /> Select Flat
                  </button>
                  <button type="button" onClick={handleViewDetails} disabled={!selectedBookedById}
                    title={selectedBookedById ? 'Open the booking customer' : 'Only a booked flat has customer details'}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl"
                    style={{ height: 38, fontSize: 13, fontWeight: 700, background: t.surfaceBg,
                      border: `1px solid ${selectedBookedById ? '#2563eb' : t.surfaceBorder}`, color: selectedBookedById ? '#2563eb' : t.textSecondary,
                      cursor: selectedBookedById ? 'pointer' : 'not-allowed' }}>
                    <MdOpenInNew size={14} /> View Details
                  </button>
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      )}
      <FlatTooltip t={t} hover={viewMode === 'plan' ? hover : null} />

      {/* Fixed width/height picture frame — identical size on every device
          and every building; a building too big to fit scrolls inside this
          box (both axes) instead of growing it or the page around it. */}
      {(viewMode === 'overview' || !buildingDetail || wings.length === 0) && (
      <div className="building-2d-box rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        {!buildingDetail ? (
          <div className="building-2d-canvas" style={{ color: t.textSecondary, fontSize: 13 }}>
            {loadingDetail ? 'Loading building...' : 'Select a building above to see its picture.'}
          </div>
        ) : wings.length === 0 && shops.length === 0 ? (
          <div className="building-2d-canvas" style={{ color: t.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 360, padding: '0 24px' }}>
            This building has no wings or shops configured in Building Master yet — add them there to see its picture here.
          </div>
        ) : (
          <div className="building-2d-canvas">
            {/* ── One complete building design: a single card holding every
                wing (side by side, with real space between them) and, right
                below the ground floor, a centered shops strip. ───────────── */}
            <div
              style={{
                background: t.subtleBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 18,
                padding: SCALE.cardPad, color: t.textPrimary,
              }}
            >
              <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 14, marginBottom: 16 }}>
                {buildingDetail.building_name}
              </div>

              <div className="flex items-end justify-center" style={{ gap: SCALE.wingGap }}>
                {wings.map((w) => (
                  <WingColumn
                    key={w.id}
                    wing={w}
                    floors={floorsOf(w)}
                    pickerMode={pickerMode}
                    selectedId={selectedUnit?.kind === 'flat' && selectedUnit.wingName === w.name ? selectedUnit.id : null}
                    onSelect={(unit) => handleSelectFlat(w, unit)}
                  />
                ))}
              </div>

              {shops.length > 0 && (
                <div style={{ marginTop: 22, paddingTop: 18, borderTop: `2px dashed ${t.surfaceBorder}` }}>
                  <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, opacity: 0.65, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Ground Floor — Shops
                  </div>
                  <div className="flex flex-wrap items-center justify-center" style={{ gap: SCALE.flatGap }}>
                    {shops.map((s) => (
                      <UnitBlock
                        key={s.id}
                        no={s.shop_no} area={s.area_sqft} status={shopStatus(s)}
                        selected={selectedUnit?.kind === 'shop' && selectedUnit.id === s.id}
                        clickable={pickerMode && shopStatus(s) === 'available'}
                        extraTitle={shopStatus(s) === 'booked' && s.booked_by_customer_name ? `Booked by ${s.booked_by_customer_name}` : undefined}
                        onClick={() => handleSelectShop(s)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Slim confirm bar — only appears mid-picker-flow with an available
          unit selected, so Customer Create's "Select Flat" hand-off still
          works without a permanent side panel taking up the page. */}
      {viewMode === 'overview' && pickerMode && selectedUnit && selectedUnit.status === 'available' && (
        <div
          className="flex items-center justify-center gap-3"
          style={{
            position: 'sticky', bottom: 16, marginTop: 16, padding: '10px 18px',
            background: '#111827', color: '#fff', borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto',
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            {selectedUnit.kind === 'shop' ? 'Shop' : 'Flat'} {selectedUnit.no} selected
          </span>
          <button
            type="button" onClick={handleConfirmSelect}
            className="flex items-center gap-1.5"
            style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
          >
            <MdCheckCircle size={15} /> Confirm Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default Building2DViewPage;
