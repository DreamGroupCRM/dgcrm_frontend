// ==========================================
// DREAM GROUP CRM - 3D BUILDING VIEW
// ==========================================
// Reads the EXISTING Building Master hierarchy (Building -> Wing -> Floor
// -> Flat, plus Building -> Shop) via buildingService's FetchBuildingList/
// ViewBuilding — the exact same calls Building Master and Customer Create
// already use. No new backend endpoint, no duplicated data, no mock data:
// every wing/floor/flat/shop drawn here is whatever is really configured
// in Building Master, and every Available/Booked/Blocked color reflects
// the same is_active (Building Master's Enabled/Disabled toggle) and
// booked_by_customer_id (an active Customer's flat_id/shop_id) fields the
// rest of the app already treats as the source of truth.
//
// Status model note: the requested legend included "Sold" and "Hold/
// Reserved" as separate states, but neither exists anywhere in this app's
// business logic today — only Available / Booked-by-a-customer / Admin-
// Blocked are real. Per explicit instruction not to introduce a second
// availability system, this view only ever shows those 3 real states.
//
// Entry points (all converge on this one page, per "no duplicate building
// configuration"):
//   - Sidebar "3D Building View" -> blank picker, choose a building
//   - Building Master row's "View 3D Structure" icon -> ?buildingId=<id>
//   - Customer Create's "Select Flat" button -> navigate() with
//     location.state = { pickerMode: true, returnPath, preselectBuildingId }
//     and, on confirming an available unit, navigates back to returnPath
//     with location.state.selectedUnit for CustomerDetailsCrudPage to read.
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdArrowBack, MdCenterFocusStrong, MdChevronRight,
  MdInfoOutline, MdCheckCircle, MdPerson, MdClose,
} from 'react-icons/md';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { FetchBuildingList, ViewBuilding } from '../../../services/buildingService';
import { Building, BuildingFlat, BuildingShop } from '../../../types/index';
import BuildingScene from './BuildingScene';
import { DrillLevel, UnitVM, UnitStatus, unitCounts } from './types';
import './Building3D.css';

const flatStatus = (f: BuildingFlat): UnitStatus => {
  if (f.is_active === false) return 'blocked';
  if (f.booked_by_customer_id) return 'booked';
  return 'available';
};
const shopStatus = (s: BuildingShop): UnitStatus => {
  if (s.is_active === false) return 'blocked';
  if (s.booked_by_customer_id) return 'booked';
  return 'available';
};

const STATUS_DOT: Record<UnitStatus, string> = { available: '#16a34a', booked: '#dc2626', blocked: '#6b7280' };
const STATUS_TEXT: Record<UnitStatus, string> = { available: 'Available', booked: 'Booked', blocked: 'Blocked' };

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

const Building3DViewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useAppearanceTokens();

  const navState = (location.state as PickerNavState) || {};
  const pickerMode = !!navState.pickerMode;
  const returnPath = navState.returnPath;

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [buildingDetail, setBuildingDetail] = useState<Building | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [level, setLevel] = useState<DrillLevel>('building');
  const [selectedWingId, setSelectedWingId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitVM | null>(null);
  const [resetToken, setResetToken] = useState(0);

  // ── Load the building list once (id + names only needed for the
  // selector) — same FetchBuildingList call Building Master's own list
  // page uses. ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await FetchBuildingList(1, 1000);
        if (res.success) setBuildings(res.rows ?? []);
      } catch { /* selector just stays empty if this fails */ }
      finally { setLoadingBuildings(false); }
    })();
  }, []);

  // Preselect a building from the deep link (Building Master's "View 3D
  // Structure" -> ?buildingId=..., or Customer Create's picker state).
  useEffect(() => {
    if (selectedBuildingId) return;
    const fromQuery = searchParams.get('buildingId');
    const preselect = fromQuery || navState.preselectBuildingId;
    if (preselect) setSelectedBuildingId(preselect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings]);

  // ── Fetch the full Building -> Wing -> Floor -> Flat (+ Shop) tree for
  // whichever building is selected — the exact same ViewBuilding call
  // CustomerDetailsCrudPage already makes when a building is picked there. ──
  useEffect(() => {
    if (!selectedBuildingId) { setBuildingDetail(null); return; }
    let cancelled = false;
    setLoadingDetail(true);
    setLevel('building'); setSelectedWingId(null); setSelectedFloorId(null); setSelectedUnit(null);
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
  const selectedWing = useMemo(() => wings.find((w) => w.id === selectedWingId) || null, [wings, selectedWingId]);
  const selectedFloor = useMemo(() => selectedWing?.floors.find((f) => f.id === selectedFloorId) || null, [selectedWing, selectedFloorId]);

  // Every flat + shop in the WHOLE building, normalized — powers the
  // building-wide legend/summary bar regardless of drill level.
  const allUnits: UnitVM[] = useMemo(() => {
    const out: UnitVM[] = [];
    for (const w of wings) {
      for (const f of w.floors) {
        for (const fl of f.flats) {
          out.push({
            kind: 'flat', id: fl.id, no: fl.flat_no, typeLabel: fl.flat_type || '—', areaSqft: fl.area_sqft,
            status: flatStatus(fl), bookedByName: fl.booked_by_customer_name ?? null,
            wingName: w.name, floorLabel: f.label,
          });
        }
      }
    }
    for (const s of shops) {
      out.push({
        kind: 'shop', id: s.id, no: s.shop_no, typeLabel: 'Shop', areaSqft: s.area_sqft,
        status: shopStatus(s), bookedByName: s.booked_by_customer_name ?? null,
        wingName: null, floorLabel: null,
      });
    }
    return out;
  }, [wings, shops]);

  const summary = useMemo(() => unitCounts(allUnits), [allUnits]);

  // Units for the currently-drilled floor / shops level only — this is
  // exactly the "don't render the whole project" performance rule: the 3D
  // scene only ever receives the units for one floor (or the shop list),
  // never every flat in the building at once.
  const currentUnits: UnitVM[] = useMemo(() => {
    if (level === 'floor' && selectedWing && selectedFloor) {
      return selectedFloor.flats.map((fl) => ({
        kind: 'flat' as const, id: fl.id, no: fl.flat_no, typeLabel: fl.flat_type || '—', areaSqft: fl.area_sqft,
        status: flatStatus(fl), bookedByName: fl.booked_by_customer_name ?? null,
        wingName: selectedWing.name, floorLabel: selectedFloor.label,
      }));
    }
    if (level === 'shops') {
      return shops.map((s) => ({
        kind: 'shop' as const, id: s.id, no: s.shop_no, typeLabel: 'Shop', areaSqft: s.area_sqft,
        status: shopStatus(s), bookedByName: s.booked_by_customer_name ?? null,
        wingName: null, floorLabel: null,
      }));
    }
    return [];
  }, [level, selectedWing, selectedFloor, shops]);

  const floorUnitSummaries = useMemo(() => {
    const out: Record<string, string> = {};
    for (const w of wings) {
      for (const f of w.floors) {
        const c = unitCounts(f.flats.map((fl) => ({
          kind: 'flat' as const, id: fl.id, no: fl.flat_no, typeLabel: '', areaSqft: null,
          status: flatStatus(fl), bookedByName: null, wingName: null, floorLabel: null,
        })));
        out[f.id] = `${c.available}/${c.total} available`;
      }
    }
    return out;
  }, [wings]);

  // ── Navigation between drill levels ──────────────────────────────────
  const goToBuilding = () => { setLevel('building'); setSelectedWingId(null); setSelectedFloorId(null); setSelectedUnit(null); setResetToken((n) => n + 1); };
  const goToWing = (wingId: string) => { setSelectedWingId(wingId); setSelectedFloorId(null); setSelectedUnit(null); setLevel('wing'); setResetToken((n) => n + 1); };
  const goToShops = () => { setSelectedWingId(null); setSelectedFloorId(null); setSelectedUnit(null); setLevel('shops'); setResetToken((n) => n + 1); };
  const goToFloor = (floorLabel: string) => {
    const floor = selectedWing?.floors.find((f) => f.label === floorLabel);
    if (!floor) return;
    setSelectedFloorId(floor.id); setSelectedUnit(null); setLevel('floor'); setResetToken((n) => n + 1);
  };
  const backToWingLevel = () => { setSelectedFloorId(null); setSelectedUnit(null); setLevel('wing'); setResetToken((n) => n + 1); };

  const handleSelectBuilding = (id: string) => { setSelectedBuildingId(id); };

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

  const cssVars = {
    '--b3d-surface-bg': t.surfaceBg, '--b3d-surface-border': t.surfaceBorder, '--b3d-inset-bg': t.insetBg,
    '--b3d-text-primary': t.textPrimary, '--b3d-text-secondary': t.textSecondary,
  } as React.CSSProperties;

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          {pickerMode && returnPath && (
            <button type="button" onClick={() => navigate(returnPath)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, padding: 6 }}>
              <MdArrowBack size={20} />
            </button>
          )}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: t.textPrimary, margin: 0 }}>3D Building View</h1>
            <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>
              {pickerMode ? 'Pick an available flat or shop for this customer’s booking' : 'Visual inventory from the existing Building Master'}
            </p>
          </div>
        </div>
        {pickerMode && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '4px 10px', borderRadius: 8 }}>
            Selecting a flat for Customer Create
          </span>
        )}
      </div>

      {/* ── Top: Building / Wing / Floor selectors ───────────────────────── */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--b3d-surface-bg)', border: '1px solid var(--b3d-surface-border)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary }}>Building</label>
            <select
              value={selectedBuildingId}
              onChange={(e) => handleSelectBuilding(e.target.value)}
              disabled={loadingBuildings}
              className="b3d-select" style={{ width: '100%', marginTop: 4 }}
            >
              <option value="">{loadingBuildings ? 'Loading buildings...' : '-- Select Building --'}</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.building_name} ({b.project_name})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary }}>Wing</label>
            <select
              value={level === 'shops' ? '__shops__' : (selectedWingId ?? '')}
              onChange={(e) => { if (e.target.value === '__shops__') goToShops(); else if (e.target.value) goToWing(e.target.value); else goToBuilding(); }}
              disabled={!buildingDetail}
              className="b3d-select" style={{ width: '100%', marginTop: 4 }}
            >
              <option value="">-- Select Wing --</option>
              {wings.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              {shops.length > 0 && <option value="__shops__">Shops ({shops.length})</option>}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary }}>Floor</label>
            <select
              value={selectedFloor?.label ?? ''}
              onChange={(e) => (e.target.value ? goToFloor(e.target.value) : backToWingLevel())}
              disabled={!selectedWing}
              className="b3d-select" style={{ width: '100%', marginTop: 4 }}
            >
              <option value="">-- Select Floor --</option>
              {selectedWing?.floors.map((f) => <option key={f.id} value={f.label}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {/* Breadcrumb */}
        {buildingDetail && (
          <div className="flex items-center gap-1.5 flex-wrap mt-3" style={{ fontSize: 12 }}>
            <button type="button" onClick={goToBuilding} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: level === 'building' ? 800 : 600, color: level === 'building' ? t.textPrimary : '#0284c7' }}>
              {buildingDetail.building_name}
            </button>
            {(level === 'wing' || level === 'floor') && selectedWing && (
              <>
                <MdChevronRight size={14} color={t.textSecondary} />
                <button type="button" onClick={() => goToWing(selectedWing.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: level === 'wing' ? 800 : 600, color: level === 'wing' ? t.textPrimary : '#0284c7' }}>
                  {selectedWing.name}
                </button>
              </>
            )}
            {level === 'floor' && selectedFloor && (
              <>
                <MdChevronRight size={14} color={t.textSecondary} />
                <span style={{ fontWeight: 800, color: t.textPrimary }}>{selectedFloor.label}</span>
              </>
            )}
            {level === 'shops' && (
              <>
                <MdChevronRight size={14} color={t.textSecondary} />
                <span style={{ fontWeight: 800, color: t.textPrimary }}>Shops</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Legend + building-wide summary ───────────────────────────────── */}
      {buildingDetail && (
        <div className="flex items-center justify-between flex-wrap gap-3 rounded-2xl px-4 py-3 mb-4"
          style={{ background: 'var(--b3d-inset-bg)', border: '1px solid var(--b3d-surface-border)' }}>
          <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: 11.5, fontWeight: 700, color: t.textSecondary }}>
            {(['available', 'booked', 'blocked'] as UnitStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span style={{ width: 9, height: 9, borderRadius: 999, background: STATUS_DOT[s], display: 'inline-block' }} />
                {STATUS_TEXT[s]}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span style={{ width: 9, height: 9, borderRadius: 999, background: '#2563eb', display: 'inline-block' }} />
              Selected
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
            {buildingDetail.building_name} — Total: {summary.total} | Available: {summary.available} | Booked: {summary.booked} | Blocked: {summary.blocked}
          </div>
        </div>
      )}

      {/* ── Main: 3D viewer + side panel ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-2xl relative" style={{ background: 'var(--b3d-surface-bg)', border: '1px solid var(--b3d-surface-border)', height: 520, overflow: 'hidden' }}>
          {!buildingDetail ? (
            <div className="flex items-center justify-center h-full" style={{ color: t.textSecondary, fontSize: 13 }}>
              {loadingDetail ? 'Loading building structure...' : 'Select a building above to view its 3D structure.'}
            </div>
          ) : (
            <>
              <BuildingScene
                level={level}
                wings={wings}
                shops={shops}
                selectedWingId={selectedWingId}
                units={currentUnits}
                selectedUnitId={selectedUnit?.id ?? null}
                floorUnitSummaries={floorUnitSummaries}
                resetToken={resetToken}
                onSelectWing={goToWing}
                onSelectShopsBlock={goToShops}
                onSelectFloor={goToFloor}
                onSelectUnit={setSelectedUnit}
              />
              <button type="button" onClick={() => setResetToken((n) => n + 1)} title="Reset View"
                className="flex items-center gap-1.5"
                style={{
                  position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700,
                  background: 'rgba(255,255,255,0.92)', color: '#0c4a6e', border: '1px solid #bae6fd',
                  borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                }}>
                <MdCenterFocusStrong size={14} /> Reset View
              </button>
              <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 10.5, color: '#6b7280', background: 'rgba(255,255,255,0.85)', padding: '3px 8px', borderRadius: 6 }}>
                Drag to rotate · Scroll to zoom · Right-drag to pan
              </div>
            </>
          )}
        </div>

        {/* ── Side panel ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--b3d-surface-bg)', border: '1px solid var(--b3d-surface-border)', minHeight: 200 }}>
          {!selectedUnit ? (
            <div className="flex flex-col items-center justify-center text-center gap-2" style={{ color: t.textSecondary, fontSize: 12, minHeight: 180 }}>
              <MdInfoOutline size={22} />
              <span>Select a {level === 'shops' ? 'shop' : 'flat'} in the 3D view to see its details.</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary, margin: 0 }}>
                  {selectedUnit.kind === 'shop' ? 'Shop' : 'Flat'} {selectedUnit.no}
                </h3>
                <button type="button" onClick={() => setSelectedUnit(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary }}>
                  <MdClose size={16} />
                </button>
              </div>
              <div className="flex flex-col gap-1.5" style={{ fontSize: 12.5, color: t.textPrimary }}>
                <div><strong>Building:</strong> {buildingDetail?.building_name}</div>
                {selectedUnit.wingName && <div><strong>Wing:</strong> {selectedUnit.wingName}</div>}
                {selectedUnit.floorLabel && <div><strong>Floor:</strong> {selectedUnit.floorLabel}</div>}
                <div><strong>{selectedUnit.kind === 'shop' ? 'Shop' : 'Flat'}:</strong> {selectedUnit.no}</div>
                <div><strong>Type:</strong> {selectedUnit.typeLabel}</div>
                <div><strong>Area:</strong> {selectedUnit.areaSqft != null ? `${selectedUnit.areaSqft} sq.ft` : '—'}</div>
                <div className="flex items-center gap-1.5">
                  <strong>Status:</strong>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#fff', background: STATUS_DOT[selectedUnit.status], borderRadius: 6, padding: '1px 8px', fontSize: 11 }}>
                    {STATUS_TEXT[selectedUnit.status]}
                  </span>
                </div>
                {selectedUnit.status === 'booked' && selectedUnit.bookedByName && (
                  <div className="flex items-center gap-1.5" style={{ color: t.textSecondary }}>
                    <MdPerson size={13} /> Booked by {selectedUnit.bookedByName}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-4">
                {selectedUnit.status === 'available' && pickerMode && (
                  <button type="button" onClick={handleConfirmSelect}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: '#16a34a', border: 'none', cursor: 'pointer' }}>
                    <MdCheckCircle size={16} /> Select {selectedUnit.kind === 'shop' ? 'Shop' : 'Flat'}
                  </button>
                )}
                {selectedUnit.status === 'available' && !pickerMode && (
                  <p style={{ fontSize: 11, color: t.textSecondary, margin: 0 }}>
                    Open this view from Customer Create&rsquo;s &ldquo;Select Flat&rdquo; button to book this unit.
                  </p>
                )}
                {selectedUnit.status === 'booked' && (
                  <p style={{ fontSize: 11, color: t.textSecondary, margin: 0 }}>
                    This {selectedUnit.kind === 'shop' ? 'shop' : 'flat'} is already booked and can&rsquo;t be assigned to another customer.
                  </p>
                )}
                {selectedUnit.status === 'blocked' && (
                  <p style={{ fontSize: 11, color: t.textSecondary, margin: 0 }}>
                    This {selectedUnit.kind === 'shop' ? 'shop' : 'flat'} has been marked unavailable in Building Master.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Building3DViewPage;
