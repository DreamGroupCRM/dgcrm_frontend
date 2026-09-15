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
import { toast } from 'react-toastify';
import { MdArrowBack, MdCheckCircle } from 'react-icons/md';
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

// Exactly the 3 colors asked for: Green = Available, Yellow = Booked,
// Red = Unavailable (an admin-disabled flat/shop).
const STATUS_COLOR: Record<UnitStatus, string> = { available: '#22c55e', booked: '#eab308', blocked: '#ef4444' };
const STATUS_TEXT: Record<UnitStatus, string> = { available: 'Available', booked: 'Booked', blocked: 'Unavailable' };
// Yellow needs dark text to stay readable; red/green read fine in white.
const STATUS_TEXT_COLOR: Record<UnitStatus, string> = { available: '#ffffff', booked: '#3f2d00', blocked: '#ffffff' };

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

interface FloorRow { id: string; label: string; sortOrder: number; flats: { id: string; flat_no: string; area_sqft: number | null; status: UnitStatus; bookedByName: string | null }[] }

// ── One colored square — a flat or a shop — carrying its own number + area
const UnitBlock: React.FC<{
  no: string; area: number | null; status: UnitStatus; selected: boolean; clickable: boolean; onClick: () => void; extraTitle?: string;
}> = ({ no, area, status, selected, clickable, onClick, extraTitle }) => (
  <div
    onClick={clickable ? onClick : undefined}
    title={`${no} — ${STATUS_TEXT[status]}${extraTitle ? ` — ${extraTitle}` : ''}`}
    style={{
      width: 66, height: 58, borderRadius: 9, flexShrink: 0,
      background: STATUS_COLOR[status],
      border: selected ? '3px solid #1d4ed8' : '2px solid rgba(255,255,255,0.65)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: STATUS_TEXT_COLOR[status], cursor: clickable ? 'pointer' : 'default',
      boxShadow: selected ? '0 0 0 3px rgba(29,78,216,0.25)' : '0 1px 3px rgba(0,0,0,0.15)',
      transition: 'transform 0.1s ease', userSelect: 'none',
    }}
  >
    <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>{no}</div>
    <div style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.92, marginTop: 2 }}>
      {area != null ? `${area} sqft` : '—'}
    </div>
  </div>
);

// ── One wing — floors stacked ground-up, tallest wing sets the height ───
const WingColumn: React.FC<{
  wing: BuildingWing; floors: FloorRow[]; pickerMode: boolean;
  selectedId: string | null;
  onSelect: (unit: { id: string; no: string; status: UnitStatus; floorLabel: string; areaSqft: number | null; bookedByName: string | null }) => void;
}> = ({ wing, floors, pickerMode, selectedId, onSelect }) => (
  <div className="flex flex-col items-center">
    <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10, letterSpacing: '0.03em' }}>{wing.name}</div>
    {/* column-reverse: floors are listed Ground-first in the array, so the
        first DOM child (Ground) lands at the bottom and each subsequent
        floor stacks upward — exactly how a real building reads. */}
    <div className="flex flex-col-reverse" style={{ gap: 8 }}>
      {floors.map((floor) => (
        <div key={floor.id} className="flex items-center" style={{ gap: 8 }}>
          <div style={{ width: 44, textAlign: 'right', fontSize: 10, fontWeight: 700, opacity: 0.65, flexShrink: 0 }}>
            {floor.label}
          </div>
          <div className="flex" style={{ gap: 6 }}>
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

  // Ground-first (ascending sort_order) per wing — see WingColumn's
  // column-reverse comment for why that order is what stacks correctly.
  const floorsOf = (w: BuildingWing): FloorRow[] =>
    [...w.floors]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f) => ({
        id: f.id, label: f.label, sortOrder: f.sort_order,
        flats: f.flats.map((fl) => ({
          id: fl.id, flat_no: fl.flat_no, area_sqft: fl.area_sqft,
          status: flatStatus(fl), bookedByName: fl.booked_by_customer_name ?? null,
        })),
      }));

  const handleSelectFlat = (w: BuildingWing, unit: { id: string; no: string; status: UnitStatus; floorLabel: string; areaSqft: number | null; bookedByName: string | null }) => {
    setSelectedUnit({
      kind: 'flat', id: unit.id, no: unit.no, typeLabel: '—', areaSqft: unit.areaSqft,
      status: unit.status, bookedByName: unit.bookedByName, wingName: w.name, floorLabel: unit.floorLabel,
    });
  };

  const handleSelectShop = (s: BuildingShop) => {
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

      <div className="rounded-2xl flex items-center justify-center" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, minHeight: 460, padding: '32px 24px' }}>
        {!buildingDetail ? (
          <div style={{ color: t.textSecondary, fontSize: 13 }}>
            {loadingDetail ? 'Loading building...' : 'Select a building above to see its picture.'}
          </div>
        ) : wings.length === 0 && shops.length === 0 ? (
          <div style={{ color: t.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 360 }}>
            This building has no wings or shops configured in Building Master yet — add them there to see its picture here.
          </div>
        ) : (
          // ── One complete building design: a single card holding every
          // wing (side by side, with real space between them) and, right
          // below the ground floor, a centered shops strip. ─────────────
          <div
            style={{
              background: t.subtleBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 18,
              padding: '24px 32px', maxWidth: '100%', overflowX: 'auto', overflowY: 'auto', maxHeight: '72vh',
              color: t.textPrimary,
            }}
          >
            <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 15, marginBottom: 20 }}>
              {buildingDetail.building_name}
            </div>

            <div className="flex items-end justify-center" style={{ gap: 56 }}>
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
                <div className="flex flex-wrap items-center justify-center" style={{ gap: 6 }}>
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
        )}
      </div>

      {buildingDetail && (wings.length > 0 || shops.length > 0) && (
        <div className="flex items-center justify-center gap-5 flex-wrap" style={{ marginTop: 14, fontSize: 12, color: t.textSecondary }}>
          {(['available', 'booked', 'blocked'] as UnitStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span style={{ width: 12, height: 12, borderRadius: 4, background: STATUS_COLOR[s], display: 'inline-block' }} />
              {STATUS_TEXT[s]}
            </span>
          ))}
        </div>
      )}

      {/* Slim confirm bar — only appears mid-picker-flow with an available
          unit selected, so Customer Create's "Select Flat" hand-off still
          works without a permanent side panel taking up the page. */}
      {pickerMode && selectedUnit && selectedUnit.status === 'available' && (
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
