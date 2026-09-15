// ==========================================
// DREAM GROUP CRM - 2D BUILDING VIEW
// ==========================================
// A picture, not a spreadsheet: every wing is drawn as its own illustrated
// building — floors stacked, each flat a window tinted by its real status —
// and shops as a row of storefronts. No text-heavy stat cards, no side
// table: the ONLY information is the picture itself, plus a tap/click on a
// window that opens a tiny caption right on top of it (unit no + status,
// and a Select action when picking a flat for a customer).
//
// Reads the EXISTING Building Master hierarchy (Building -> Wing -> Floor
// -> Flat, plus Building -> Shop) via buildingService's FetchBuildingList/
// ViewBuilding — the exact same calls Building Master and Customer Create
// already use. Every Available/Booked/Disabled color reflects the same
// is_active (Building Master's Enabled/Disabled toggle) and
// booked_by_customer_id (an active Customer's flat_id/shop_id) fields the
// rest of the app already treats as the source of truth. If a building
// shows no picture at all, it genuinely has no wings/shops configured yet
// in Building Master — add them there first.
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
import { toast } from 'react-toastify';
import { MdArrowBack } from 'react-icons/md';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { FetchBuildingList, ViewBuilding } from '../../../services/buildingService';
import { Building, BuildingFlat, BuildingShop, BuildingWing } from '../../../types/index';
import { UnitVM, UnitStatus } from './types';

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

const STATUS_COLOR: Record<UnitStatus, string> = { available: '#22c55e', booked: '#ef4444', blocked: '#9ca3af' };
const STATUS_TEXT: Record<UnitStatus, string> = { available: 'Available', booked: 'Booked', blocked: 'Disabled' };

// One color theme per building, cycled — gives the row the same "several
// different colorful buildings side by side" read as a real streetscape,
// purely decorative (status lives entirely on the windows).
const BUILDING_THEMES = [
  { body: '#f3d9b1', roof: '#c0693f', trim: '#8a5a3b' },
  { body: '#bcd8ea', roof: '#3b6e91', trim: '#274b61' },
  { body: '#f5e6c8', roof: '#caa23d', trim: '#8a6d1f' },
  { body: '#e3b3a4', roof: '#a13d2c', trim: '#7a2c1e' },
  { body: '#cfe0c0', roof: '#5c7a4a', trim: '#3d5230' },
  { body: '#e8c9a0', roof: '#9c4a30', trim: '#6b3320' },
];

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

// ── Geometry constants for the SVG illustrations ────────────────────────
const WIN_W = 26, WIN_H = 20, GAP = 7, PAD = 16, ROOF_H = 26, DOOR_W = 34, DOOR_H = 30;

interface FloorRow { label: string; flats: { id: string; flat_no: string; status: UnitStatus }[] }

// ── One illustrated building — every floor stacked, every flat a window ──
const BuildingIllustration: React.FC<{
  wingName: string;
  floorsTopFirst: FloorRow[];
  theme: { body: string; roof: string; trim: string };
  selectedId: string | null;
  onSelect: (id: string, no: string, status: UnitStatus, floorLabel: string) => void;
  caption: React.ReactNode;
}> = ({ wingName, floorsTopFirst, theme, selectedId, onSelect, caption }) => {
  const cols = Math.max(1, ...floorsTopFirst.map((f) => f.flats.length));
  const rows = floorsTopFirst.length;
  const bodyW = PAD * 2 + cols * WIN_W + (cols - 1) * GAP;
  const bodyH = PAD * 2 + rows * WIN_H + Math.max(0, rows - 1) * GAP + DOOR_H * 0.6;
  const W = bodyW + 20;
  const H = ROOF_H + bodyH;

  return (
    <div className="flex flex-col items-center" style={{ minWidth: W }}>
      <svg width={W} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', maxWidth: 260 }}>
        {/* roof */}
        <polygon points={`${W / 2 - bodyW / 2 - 10},${ROOF_H} ${W / 2 + bodyW / 2 + 10},${ROOF_H} ${W / 2 + bodyW / 2 - 6},2 ${W / 2 - bodyW / 2 + 6},2`} fill={theme.roof} />
        {/* body */}
        <rect x={10} y={ROOF_H} width={bodyW} height={bodyH} rx={6} fill={theme.body} />
        {/* windows, floor by floor */}
        {floorsTopFirst.map((floor, r) => {
          const rowOffset = ((cols - floor.flats.length) / 2) * (WIN_W + GAP);
          const y = ROOF_H + PAD + r * (WIN_H + GAP);
          return floor.flats.map((fl, c) => {
            const x = 10 + PAD + rowOffset + c * (WIN_W + GAP);
            const isSel = selectedId === fl.id;
            return (
              <g key={fl.id} onClick={() => onSelect(fl.id, fl.flat_no, fl.status, floor.label)} style={{ cursor: 'pointer' }}>
                <rect
                  x={x} y={y} width={WIN_W} height={WIN_H} rx={3}
                  fill={STATUS_COLOR[fl.status]}
                  stroke={isSel ? '#1d4ed8' : '#ffffff'} strokeWidth={isSel ? 2.5 : 1.5}
                />
                <line x1={x + WIN_W / 2} y1={y + 2} x2={x + WIN_W / 2} y2={y + WIN_H - 2} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1} />
              </g>
            );
          });
        })}
        {/* door */}
        <rect x={10 + bodyW / 2 - DOOR_W / 2} y={ROOF_H + bodyH - DOOR_H} width={DOOR_W} height={DOOR_H} rx={4} fill={theme.trim} />
        {caption}
      </svg>
      <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 6 }}>{wingName}</div>
    </div>
  );
};

// ── Shops — a single row of storefronts, no floors of their own ─────────
const ShopsIllustration: React.FC<{
  shops: { id: string; shop_no: string; status: UnitStatus }[];
  theme: { body: string; roof: string; trim: string };
  selectedId: string | null;
  onSelect: (id: string, no: string, status: UnitStatus) => void;
  caption: React.ReactNode;
}> = ({ shops, theme, selectedId, onSelect, caption }) => {
  const SHOP_W = 46, SHOP_H = 40, AWNING_H = 10;
  const W = PAD * 2 + shops.length * SHOP_W + Math.max(0, shops.length - 1) * GAP;
  const H = AWNING_H + SHOP_H + PAD;

  return (
    <div className="flex flex-col items-center" style={{ minWidth: W }}>
      <svg width={W} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', maxWidth: 320 }}>
        {shops.map((s, i) => {
          const x = PAD + i * (SHOP_W + GAP);
          const isSel = selectedId === s.id;
          return (
            <g key={s.id} onClick={() => onSelect(s.id, s.shop_no, s.status)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={0} width={SHOP_W} height={AWNING_H} fill={theme.roof} />
              <rect x={x} y={AWNING_H} width={SHOP_W} height={SHOP_H} fill={theme.body} stroke={isSel ? '#1d4ed8' : 'transparent'} strokeWidth={2.5} />
              <rect x={x + 6} y={AWNING_H + 6} width={SHOP_W - 12} height={SHOP_H - 12} rx={3} fill={STATUS_COLOR[s.status]} stroke="#ffffff" strokeWidth={1.5} />
            </g>
          );
        })}
        {caption}
      </svg>
      <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 6 }}>Shops</div>
    </div>
  );
};

type Tokens = ReturnType<typeof useAppearanceTokens>['t'];

// Tiny caption rendered right on top of the picture (via foreignObject) —
// the only "detail" this page shows, anchored at the clicked window/shop.
const Caption: React.FC<{
  x: number; y: number; no: string; status: UnitStatus; showSelect: boolean; onSelect: () => void; t: Tokens;
}> = ({ x, y, no, status, showSelect, onSelect, t }) => (
  <foreignObject x={x - 40} y={y - 50} width={140} height={54} style={{ overflow: 'visible' }}>
    <div
      style={{
        background: '#111827', color: '#fff', borderRadius: 8, padding: '6px 9px',
        fontSize: 10.5, fontFamily: t.fontFamily, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        width: 'max-content', maxWidth: 130,
      }}
    >
      <div className="flex items-center gap-1.5" style={{ fontWeight: 700 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: STATUS_COLOR[status], display: 'inline-block' }} />
        {no} · {STATUS_TEXT[status]}
      </div>
      {showSelect && (
        <button
          type="button" onClick={onSelect}
          style={{ marginTop: 5, width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 0', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
        >
          Select
        </button>
      )}
    </div>
  </foreignObject>
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

  const [selectedUnit, setSelectedUnit] = useState<UnitVM | null>(null);

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

  const wingFloors = (w: BuildingWing): FloorRow[] =>
    [...w.floors]
      .sort((a, b) => b.sort_order - a.sort_order)
      .map((f) => ({ label: f.label, flats: f.flats.map((fl) => ({ id: fl.id, flat_no: fl.flat_no, status: flatStatus(fl) })) }));

  const handleSelectFlat = (w: BuildingWing, id: string, no: string, status: UnitStatus, floorLabel: string) => {
    const fl = w.floors.flatMap((f) => f.flats).find((x) => x.id === id);
    setSelectedUnit({
      kind: 'flat', id, no, typeLabel: fl?.flat_type || '—', areaSqft: fl?.area_sqft ?? null,
      status, bookedByName: fl?.booked_by_customer_name ?? null, wingName: w.name, floorLabel,
    });
  };

  const handleSelectShop = (id: string, no: string, status: UnitStatus) => {
    const s = shops.find((x) => x.id === id);
    setSelectedUnit({
      kind: 'shop', id, no, typeLabel: 'Shop', areaSqft: s?.area_sqft ?? null,
      status, bookedByName: s?.booked_by_customer_name ?? null, wingName: null, floorLabel: null,
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

  // Anchor point for the on-photo caption — center-top of whichever
  // building/shops illustration currently has a unit selected. Simple and
  // good enough since only one caption is ever open at a time.
  const captionFor = (ownerKey: string, w: number, h: number): React.ReactNode => {
    if (!selectedUnit) return null;
    const belongsHere = selectedUnit.kind === 'shop' ? ownerKey === '__shops__' : selectedUnit.wingName === ownerKey;
    if (!belongsHere) return null;
    return (
      <Caption
        x={w / 2} y={h * 0.4} no={selectedUnit.no} status={selectedUnit.status} t={t}
        showSelect={pickerMode && selectedUnit.status === 'available'}
        onSelect={handleConfirmSelect}
      />
    );
  };

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          {pickerMode && returnPath && (
            <button type="button" onClick={() => navigate(returnPath)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, padding: 6 }}>
              <MdArrowBack size={20} />
            </button>
          )}
          <h1 style={{ fontSize: 20, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Building View</h1>
        </div>
        <select
          value={selectedBuildingId}
          onChange={(e) => setSelectedBuildingId(e.target.value)}
          disabled={loadingBuildings}
          style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 13, minWidth: 220,
            background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, cursor: 'pointer',
          }}
        >
          <option value="">{loadingBuildings ? 'Loading buildings...' : '-- Select Building --'}</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.building_name} ({b.project_name})</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, minHeight: 420, padding: 28 }}>
        {!buildingDetail ? (
          <div className="flex items-center justify-center h-full" style={{ minHeight: 360, color: t.textSecondary, fontSize: 13 }}>
            {loadingDetail ? 'Loading building...' : 'Select a building above to see its picture.'}
          </div>
        ) : wings.length === 0 && shops.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ minHeight: 360, color: t.textSecondary, fontSize: 13, textAlign: 'center' }}>
            This building has no wings or shops configured in Building Master yet — add them there to see its picture here.
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-center gap-8">
            {wings.map((w, i) => {
              const theme = BUILDING_THEMES[i % BUILDING_THEMES.length];
              const floors = wingFloors(w);
              const cols = Math.max(1, ...floors.map((f) => f.flats.length));
              const bodyW = PAD * 2 + cols * WIN_W + (cols - 1) * GAP;
              const wSvg = bodyW + 20;
              const hSvg = ROOF_H + PAD * 2 + floors.length * WIN_H + Math.max(0, floors.length - 1) * GAP + DOOR_H * 0.6;
              return (
                <BuildingIllustration
                  key={w.id}
                  wingName={w.name}
                  floorsTopFirst={floors}
                  theme={theme}
                  selectedId={selectedUnit?.kind === 'flat' && selectedUnit.wingName === w.name ? selectedUnit.id : null}
                  onSelect={(id, no, status, floorLabel) => handleSelectFlat(w, id, no, status, floorLabel)}
                  caption={captionFor(w.name, wSvg, hSvg)}
                />
              );
            })}
            {shops.length > 0 && (() => {
              const SHOP_W = 46, AWNING_H = 10, SHOP_H = 40;
              const wSvg = PAD * 2 + shops.length * SHOP_W + Math.max(0, shops.length - 1) * GAP;
              const hSvg = AWNING_H + SHOP_H + PAD;
              return (
                <ShopsIllustration
                  shops={shops.map((s) => ({ id: s.id, shop_no: s.shop_no, status: shopStatus(s) }))}
                  theme={BUILDING_THEMES[wings.length % BUILDING_THEMES.length]}
                  selectedId={selectedUnit?.kind === 'shop' ? selectedUnit.id : null}
                  onSelect={handleSelectShop}
                  caption={captionFor('__shops__', wSvg, hSvg)}
                />
              );
            })()}
          </div>
        )}
      </div>

      {buildingDetail && (wings.length > 0 || shops.length > 0) && (
        <div className="flex items-center justify-center gap-5 flex-wrap" style={{ marginTop: 16, fontSize: 12, color: t.textSecondary }}>
          {(['available', 'booked', 'blocked'] as UnitStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[s], display: 'inline-block' }} />
              {STATUS_TEXT[s]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default Building2DViewPage;
