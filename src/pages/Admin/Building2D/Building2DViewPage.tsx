// ==========================================
// DREAM GROUP CRM - 2D BUILDING VIEW
// ==========================================
// Replaces the old three.js "3D Building View" (see git history) with a
// plain 2D visualization — a building elevation drawn from real data:
// every wing's floors stacked, every flat drawn as a colored cell, exactly
// the way a floor plan / booking chart reads. No 3D engine, no rotate/
// zoom/pan controls, no mock geometry.
//
// Reads the EXISTING Building Master hierarchy (Building -> Wing -> Floor
// -> Flat, plus Building -> Shop) via buildingService's FetchBuildingList/
// ViewBuilding — the exact same calls Building Master and Customer Create
// already use. Every Available/Booked/Blocked color reflects the same
// is_active (Building Master's Enabled/Disabled toggle) and
// booked_by_customer_id (an active Customer's flat_id/shop_id) fields the
// rest of the app already treats as the source of truth.
//
// Status model note: only Available / Booked-by-a-customer / Admin-Blocked
// are real states anywhere in this app's business logic — this view only
// ever shows those 3.
//
// Entry points (all converge on this one page, per "no duplicate building
// configuration"):
//   - Sidebar "Building View" -> blank picker, choose a building
//   - Building Master row's "View 2D Structure" icon -> ?buildingId=<id>
//   - Customer Create's "Select Flat" button -> navigate() with
//     location.state = { pickerMode: true, returnPath, preselectBuildingId }
//     and, on confirming an available unit, navigates back to returnPath
//     with location.state.selectedUnit for CustomerDetailsCrudPage to read.
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdArrowBack, MdChevronRight, MdInfoOutline, MdCheckCircle, MdPerson,
  MdClose, MdFormatListBulleted, MdApartment, MdStorefront,
} from 'react-icons/md';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { FetchBuildingList, ViewBuilding } from '../../../services/buildingService';
import { Building, BuildingFlat, BuildingShop, BuildingWing } from '../../../types/index';
import { DrillLevel, UnitVM, UnitStatus, unitCounts } from './types';

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

type Tokens = ReturnType<typeof useAppearanceTokens>['t'];

const StatCard: React.FC<{ label: string; value: number; t: Tokens; dot?: string }> = ({ label, value, t, dot }) => (
  <div className="rounded-2xl px-4 py-3" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}>
    <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary }}>
      {dot && <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, display: 'inline-block' }} />}
      {label}
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, marginTop: 2 }}>{value}</div>
  </div>
);

// Small stacked availability bar used on each wing/shops overview card.
const MiniBar: React.FC<{ available: number; booked: number; blocked: number }> = ({ available, booked, blocked }) => {
  const total = Math.max(1, available + booked + blocked);
  return (
    <div className="flex" style={{ height: 7, borderRadius: 999, overflow: 'hidden', marginTop: 10 }}>
      <div style={{ width: `${(available / total) * 100}%`, background: STATUS_DOT.available }} />
      <div style={{ width: `${(booked / total) * 100}%`, background: STATUS_DOT.booked }} />
      <div style={{ width: `${(blocked / total) * 100}%`, background: STATUS_DOT.blocked }} />
    </div>
  );
};

const unitCell = (
  no: string, status: UnitStatus, isSelected: boolean, onClick: () => void
): React.ReactElement => (
  <button
    key={no}
    type="button"
    onClick={onClick}
    title={`${no} — ${STATUS_TEXT[status]}`}
    style={{
      minWidth: 48, height: 36, borderRadius: 7, padding: '0 6px',
      fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
      border: isSelected ? '2px solid #1d4ed8' : `1.5px solid ${STATUS_DOT[status]}`,
      background: `${STATUS_DOT[status]}1f`, color: STATUS_DOT[status],
      flexShrink: 0,
    }}
  >
    {no}
  </button>
);

const Building2DViewPage: React.FC = () => {
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
  const [selectedUnit, setSelectedUnit] = useState<UnitVM | null>(null);

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

  // Preselect a building from the deep link (Building Master's "View 2D
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
    setLevel('building'); setSelectedWingId(null); setSelectedUnit(null);
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

  const unitsOfWing = (w: BuildingWing): UnitVM[] =>
    w.floors.flatMap((f) => f.flats.map((fl) => ({
      kind: 'flat' as const, id: fl.id, no: fl.flat_no, typeLabel: fl.flat_type || '—', areaSqft: fl.area_sqft,
      status: flatStatus(fl), bookedByName: fl.booked_by_customer_name ?? null,
      wingName: w.name, floorLabel: f.label,
    })));

  const shopUnits: UnitVM[] = useMemo(() => shops.map((s) => ({
    kind: 'shop' as const, id: s.id, no: s.shop_no, typeLabel: 'Shop', areaSqft: s.area_sqft,
    status: shopStatus(s), bookedByName: s.booked_by_customer_name ?? null,
    wingName: null, floorLabel: null,
  })), [shops]);

  // Units for the currently-drilled level only — feeds the side panel's
  // Unit List tab.
  const currentUnits: UnitVM[] = useMemo(() => {
    if (level === 'wing' && selectedWing) return unitsOfWing(selectedWing);
    if (level === 'shops') return shopUnits;
    return [];
  }, [level, selectedWing, shopUnits]);

  // Floors of the selected wing, top floor first — reads like a real
  // building elevation (roof at the top, ground at the bottom).
  const wingFloorsTopFirst = useMemo(() => {
    if (!selectedWing) return [];
    return [...selectedWing.floors].sort((a, b) => b.sort_order - a.sort_order);
  }, [selectedWing]);

  // ── Navigation between drill levels ──────────────────────────────────
  const goToBuilding = () => { setLevel('building'); setSelectedWingId(null); setSelectedUnit(null); };
  const goToWing = (wingId: string) => { setSelectedWingId(wingId); setSelectedUnit(null); setLevel('wing'); };
  const goToShops = () => { setSelectedWingId(null); setSelectedUnit(null); setLevel('shops'); };

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

  return (
    <div style={{ fontFamily: t.fontFamily }}>
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
            <h1 style={{ fontSize: 20, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Building View</h1>
            <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>
              {pickerMode ? 'Pick an available flat or shop for this customer’s booking' : 'Floor-wise, flat-wise visual inventory from the existing Building Master'}
            </p>
          </div>
        </div>
        {pickerMode && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '4px 10px', borderRadius: 8 }}>
            Selecting a flat for Customer Create
          </span>
        )}
      </div>

      {/* ── Top: Building / Wing selector ────────────────────────────────── */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary }}>Building</label>
            <select
              value={selectedBuildingId}
              onChange={(e) => handleSelectBuilding(e.target.value)}
              disabled={loadingBuildings}
              style={{
                width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, fontSize: 13,
                background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, cursor: 'pointer',
              }}
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
              style={{
                width: '100%', marginTop: 4, padding: '9px 12px', borderRadius: 8, fontSize: 13,
                background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, cursor: 'pointer',
              }}
            >
              <option value="">-- Select Wing --</option>
              {wings.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              {shops.length > 0 && <option value="__shops__">Shops ({shops.length})</option>}
            </select>
          </div>
        </div>

        {/* Breadcrumb */}
        {buildingDetail && (
          <div className="flex items-center gap-1.5 flex-wrap mt-3" style={{ fontSize: 12 }}>
            <button type="button" onClick={goToBuilding} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: level === 'building' ? 800 : 600, color: level === 'building' ? t.textPrimary : '#0284c7' }}>
              {buildingDetail.building_name}
            </button>
            {level === 'wing' && selectedWing && (
              <>
                <MdChevronRight size={14} color={t.textSecondary} />
                <span style={{ fontWeight: 800, color: t.textPrimary }}>{selectedWing.name}</span>
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

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      {buildingDetail && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total Units" value={summary.total} t={t} />
          <StatCard label="Available" value={summary.available} dot={STATUS_DOT.available} t={t} />
          <StatCard label="Booked" value={summary.booked} dot={STATUS_DOT.booked} t={t} />
          <StatCard label="Blocked" value={summary.blocked} dot={STATUS_DOT.blocked} t={t} />
        </div>
      )}

      {/* ── Main: 2D elevation/grid + side panel ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className="rounded-2xl relative" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, minHeight: 480, maxHeight: 620, overflowY: 'auto' }}>
          {!buildingDetail ? (
            <div className="flex items-center justify-center h-full" style={{ minHeight: 480, color: t.textSecondary, fontSize: 13 }}>
              {loadingDetail ? 'Loading building structure...' : 'Select a building above to view its layout.'}
            </div>
          ) : level === 'building' ? (
            // ── Building overview: one card per wing (+ Shops), each a
            // mini "building" with an availability bar — click to open its
            // full floor-by-floor, flat-by-flat elevation. ──────────────
            <div className="flex flex-wrap gap-4" style={{ padding: 20 }}>
              {wings.map((w) => {
                const c = unitCounts(unitsOfWing(w));
                return (
                  <button
                    key={w.id} type="button" onClick={() => goToWing(w.id)}
                    style={{
                      width: 168, textAlign: 'left', cursor: 'pointer', borderRadius: 14, padding: 14,
                      background: t.subtleBg, border: `1px solid ${t.surfaceBorder}`,
                    }}
                  >
                    <div className="flex items-center gap-1.5" style={{ fontWeight: 800, fontSize: 13, color: t.textPrimary }}>
                      <MdApartment size={16} /> {w.name}
                    </div>
                    <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 4 }}>
                      {w.floors.length} floor{w.floors.length === 1 ? '' : 's'} · {c.total} flat{c.total === 1 ? '' : 's'}
                    </div>
                    <MiniBar available={c.available} booked={c.booked} blocked={c.blocked} />
                  </button>
                );
              })}
              {shops.length > 0 && (
                <button
                  type="button" onClick={goToShops}
                  style={{
                    width: 168, textAlign: 'left', cursor: 'pointer', borderRadius: 14, padding: 14,
                    background: t.subtleBg, border: `1px solid ${t.surfaceBorder}`,
                  }}
                >
                  <div className="flex items-center gap-1.5" style={{ fontWeight: 800, fontSize: 13, color: t.textPrimary }}>
                    <MdStorefront size={16} /> Shops
                  </div>
                  <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 4 }}>
                    {shops.length} shop{shops.length === 1 ? '' : 's'}
                  </div>
                  <MiniBar {...unitCounts(shopUnits)} />
                </button>
              )}
              {wings.length === 0 && shops.length === 0 && (
                <div style={{ color: t.textSecondary, fontSize: 12.5 }}>This building has no wings or shops configured yet.</div>
              )}
            </div>
          ) : level === 'wing' && selectedWing ? (
            // ── Wing elevation: every floor stacked (roof to ground), every
            // flat drawn as a colored cell — floor-wise, flat-wise, in one
            // image, exactly as requested. ───────────────────────────────
            <div style={{ padding: 18 }}>
              {wingFloorsTopFirst.length === 0 ? (
                <div style={{ color: t.textSecondary, fontSize: 12.5 }}>This wing has no floors generated yet.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {wingFloorsTopFirst.map((floor) => (
                    <div key={floor.id} className="flex items-center gap-2.5">
                      <div style={{ width: 78, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: t.textSecondary }}>
                        {floor.label}
                      </div>
                      <div
                        className="flex flex-wrap gap-1.5"
                        style={{
                          flex: 1, padding: 8, borderRadius: 8,
                          background: t.insetBg, border: `1px solid ${t.surfaceBorder}`,
                        }}
                      >
                        {floor.flats.length === 0 ? (
                          <span style={{ fontSize: 11, color: t.textSecondary }}>No flats</span>
                        ) : (
                          floor.flats.map((fl) => unitCell(
                            fl.flat_no, flatStatus(fl), selectedUnit?.id === fl.id,
                            () => setSelectedUnit({
                              kind: 'flat', id: fl.id, no: fl.flat_no, typeLabel: fl.flat_type || '—',
                              areaSqft: fl.area_sqft, status: flatStatus(fl),
                              bookedByName: fl.booked_by_customer_name ?? null,
                              wingName: selectedWing.name, floorLabel: floor.label,
                            })
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : level === 'shops' ? (
            // ── Shops grid — shops have no floor of their own, so they're
            // drawn as one flat grid of colored cells. ───────────────────
            <div style={{ padding: 18 }}>
              {shops.length === 0 ? (
                <div style={{ color: t.textSecondary, fontSize: 12.5 }}>This building has no shops configured yet.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {shops.map((s) => unitCell(
                    s.shop_no, shopStatus(s), selectedUnit?.id === s.id,
                    () => setSelectedUnit({
                      kind: 'shop', id: s.id, no: s.shop_no, typeLabel: 'Shop',
                      areaSqft: s.area_sqft, status: shopStatus(s),
                      bookedByName: s.booked_by_customer_name ?? null,
                      wingName: null, floorLabel: null,
                    })
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Legend */}
          {buildingDetail && (
            <div className="flex items-center gap-4 flex-wrap" style={{ padding: '0 18px 16px', fontSize: 11, color: t.textSecondary }}>
              {(['available', 'booked', 'blocked'] as UnitStatus[]).map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: STATUS_DOT[s], display: 'inline-block' }} />
                  {STATUS_TEXT[s]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Side panel ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, minHeight: 200 }}>
          {!selectedUnit && (level === 'wing' || level === 'shops') ? (
            <div>
              <div className="flex items-center gap-1.5 mb-3" style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
                <MdFormatListBulleted size={14} /> Unit List
              </div>
              {currentUnits.length === 0 ? (
                <div style={{ fontSize: 12, color: t.textSecondary, padding: '12px 2px' }}>No units on this level.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: t.textSecondary }}>
                        <th style={{ padding: '4px 6px', fontWeight: 700 }}>No</th>
                        <th style={{ fontWeight: 700 }}>Type</th>
                        <th style={{ fontWeight: 700 }}>Area</th>
                        <th style={{ fontWeight: 700 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentUnits.map((u) => (
                        <tr key={u.id} onClick={() => setSelectedUnit(u)} style={{ cursor: 'pointer', borderTop: `1px solid ${t.surfaceBorder}` }}>
                          <td style={{ padding: '6px 6px', fontWeight: 700, color: t.textPrimary }}>{u.no}</td>
                          <td style={{ color: t.textPrimary }}>{u.typeLabel}</td>
                          <td style={{ color: t.textPrimary }}>{u.areaSqft != null ? `${u.areaSqft} sq.ft` : '—'}</td>
                          <td><span style={{ color: STATUS_DOT[u.status], fontWeight: 700 }}>{STATUS_TEXT[u.status]}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : !selectedUnit ? (
            <div className="flex flex-col items-center justify-center text-center gap-2" style={{ color: t.textSecondary, fontSize: 12, minHeight: 180 }}>
              <MdInfoOutline size={22} />
              <span>Select a wing (or Shops) to view its floors and units.</span>
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

export default Building2DViewPage;
