// src/pages/Admin/Masters/Building/BuildingCrudPage.tsx
// Single page handles Add / View / Update for the Building Master
// (Project Details -> Wings -> Floors in Each Wing -> Flats on Each Floor -> Save)

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdApartment, MdAdd, MdClose, MdCheckCircle, MdFiberManualRecord,
  MdArrowBack, MdSave, MdLayers, MdChevronRight, MdExpandMore,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme, AppTheme } from '../../../../styles/theme';
import { useAccordion } from '../../../../hooks/useAccordion';
import {
  ViewBuilding,
  CreateBuilding,
  UpdateBuilding,
} from '../../../../services/buildingService';
import { CreateBuildingPayload, BuildingShop } from '../../../../types/index';

// ─────────────────────────────────────────────────────────────────────────────
// Local (string-friendly, form-editable) shapes
// ─────────────────────────────────────────────────────────────────────────────
interface FlatRow {
  id: string;
  flat_no: string;
  flat_type: string;
  area_sqft: string;
  is_active: boolean;
}

interface FloorRow {
  id: string;
  label: string;
  sort_order: number;
  flats: FlatRow[];
}

interface WingRow {
  id: string;
  name: string;
  no_of_floors: string;
  with_ground_floor: boolean;
  floors: FloorRow[];
  flatsPerFloorInput: string;
}

interface ShopRow {
  id: string;
  shop_no: string;
  area_sqft: string;
  is_active: boolean; // true = Available, false = Booked
}

const makeShop = (id: string, no: number): ShopRow => ({
  id,
  shop_no: `Shop-${String(no).padStart(2, '0')}`,
  area_sqft: '',
  is_active: true,
});

type Mode = 'add' | 'edit' | 'view';
interface Props { mode: Mode; }

const FLAT_TYPES = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Studio', 'Other'];
const WING_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#db2777'];

// Sticky footer height — same value/pattern as DepartmentCrudPage.tsx's
// FOOTER_HEIGHT, so Go Back/Save are always reachable without scrolling
// even with many wings/floors/flats filled in.
const FOOTER_HEIGHT = 76;

/** Finds the highest numeric suffix already used for a given id prefix, e.g.
 *  maxNumericSuffix(['wing_001','wing_002'], 'wing_') === 2 — so the next id is wing_003. */
const maxNumericSuffix = (ids: string[], prefix: string): number =>
  ids.reduce((max, id) => {
    if (!id || !id.startsWith(prefix)) return max;
    const n = parseInt(id.slice(prefix.length), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);

const simpleId = (prefix: string, n: number) => `${prefix}_${String(n).padStart(3, '0')}`;

const ordinal = (n: number): string => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
};

const buildFloorLabels = (withGround: boolean, noOfFloors: number): string[] => {
  const labels: string[] = [];
  if (withGround) labels.push('Ground Floor');
  for (let i = 1; i <= noOfFloors; i++) labels.push(`${ordinal(i)} Floor`);
  return labels;
};

/** 'Ground Floor' -> 0, '2nd Floor' -> 2, '10th Floor' -> 10, '20th Floor' -> 20 ...
 *  Used to number flats by floor, e.g. floor 2 -> 201, 202 ...; floor 10 -> 1001, 1002 ... */
const floorNumberFromLabel = (label: string): number => {
  if (label === 'Ground Floor') return 0;
  const match = label.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

/** e.g. "Ground + 5 Floors" or, without a ground floor, just "5 Floors". */
const floorsSummary = (withGround: boolean, noOfFloorsRaw: string): string => {
  const n = parseInt(noOfFloorsRaw, 10) || 0;
  return withGround ? `Ground + ${n} Floors` : `${n} Floors`;
};

const makeWing = (id: string): WingRow => ({
  id,
  name: '',
  no_of_floors: '',
  with_ground_floor: true,
  floors: [],
  flatsPerFloorInput: '',
});

// ─────────────────────────────────────────────────────────────────────────────
// Small presentational helpers
// ─────────────────────────────────────────────────────────────────────────────
const StepBadge: React.FC<{ n: number }> = ({ n }) => (
  <div style={{
    width: 28, height: 28, borderRadius: '50%',
    background: '#4338ca', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, flexShrink: 0,
  }}>
    {n}
  </div>
);

const SectionCard: React.FC<{
  t: AppTheme; children: React.ReactNode; style?: React.CSSProperties;
}> = ({ t, children, style }) => (
  <div style={{
    background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`,
    borderRadius: 14, padding: 24, marginBottom: 20, ...style,
  }}>
    {children}
  </div>
);

const StatusToggle: React.FC<{
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
  onLabel?: string; offLabel?: string; showLabel?: boolean;
}> = (
  { checked, onChange, disabled, onLabel = 'Active', offLabel = 'Inactive', showLabel = false }
) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 999, border: 'none', padding: 2,
        background: checked ? '#22c55e' : '#d1d5db',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        transition: 'background 0.15s', flexShrink: 0,
      }}
      title={checked ? onLabel : offLabel}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)', display: 'block',
      }} />
    </button>
    {showLabel && (
      <span style={{
        fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
        color: checked ? '#16a34a' : '#6b7280',
      }}>
        {checked ? onLabel : offLabel}
      </span>
    )}
  </div>
);

// ── Floor accordion — one collapsible section per floor in Step 4 ──────────
const FloorAccordionItem: React.FC<{
  t: AppTheme;
  isDark: boolean;
  floor: FloorRow;
  defaultOpen: boolean;
  readOnly: boolean;
  onUpdateFlat: (flatId: string, patch: Partial<FlatRow>) => void;
}> = ({ t, isDark, floor, defaultOpen, readOnly, onUpdateFlat }) => {
  const { isOpen, toggle, contentRef, contentHeight, recalc } = useAccordion(defaultOpen);

  // Re-measure the panel height whenever the flats for this floor are (re)generated
  // or edited — otherwise the panel stays clipped at its old (often empty) height
  // and "Generate Flats" would only show the table header until a second click.
  useEffect(() => {
    recalc();
  }, [floor.flats, recalc]);

  const cellInputStyle = (disabled: boolean): React.CSSProperties => ({
    width: '100%',
    background: disabled ? (isDark ? '#2a2a2a' : '#e5e7eb') : t.inputBg,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 8, padding: '6px 10px', fontSize: 13.5,
    color: disabled ? t.textSecondary : t.inputText,
    outline: 'none', fontFamily: t.fontFamily,
    cursor: disabled ? 'not-allowed' : 'text',
    opacity: disabled ? 0.7 : 1,
  });

  return (
    <div style={{ borderBottom: `1px solid ${t.divider}` }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '12px 16px', fontFamily: t.fontFamily,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14.5, color: t.textPrimary }}>{floor.label}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.textSecondary }}>
          <span style={{ fontSize: 13 }}>{floor.flats.length} flat{floor.flats.length === 1 ? '' : 's'}</span>
          {isOpen ? <MdExpandMore size={20} /> : <MdChevronRight size={20} />}
        </span>
      </button>

      <div
        ref={contentRef}
        style={{
          height: isOpen ? (contentHeight === 'auto' ? 'auto' : contentHeight) : 0,
          overflow: 'hidden', transition: 'height 0.2s ease',
        }}
      >
        {floor.flats.length === 0 ? (
          <div style={{ padding: '4px 16px 16px', fontSize: 13, color: t.textSecondary }}>
            No flats yet — set a count above and click &quot;Generate Flats&quot;.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: t.tableHeaderBg }}>
                  {['Flat No.', 'Flat Type', 'Area (Sq Ft)', 'Status'].map((h) => (
                    <th key={h} style={{
                      padding: '8px 16px', textAlign: 'left', fontSize: 12.5, fontWeight: 700,
                      textTransform: 'camelcase', letterSpacing: '0.04em', color: t.textSecondary,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {floor.flats.map((flat, idx) => {
                  const rowDisabled = !flat.is_active;
                  const fieldsDisabled = readOnly || rowDisabled;
                  return (
                    <tr
                      key={flat.id}
                      style={{
                        background: rowDisabled
                          ? (isDark ? '#1c1c1c' : '#e5e7eb')
                          : (idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg),
                        opacity: rowDisabled ? 0.6 : 1,
                        filter: rowDisabled ? 'grayscale(70%)' : 'none',
                        cursor: rowDisabled ? 'not-allowed' : 'default',
                        transition: 'opacity 0.15s ease, filter 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '8px 16px', width: '20%' }}>
                        <input
                          type="text"
                          value={flat.flat_no}
                          readOnly={fieldsDisabled}
                          disabled={fieldsDisabled}
                          onChange={(e) => onUpdateFlat(flat.id, { flat_no: e.target.value })}
                          style={cellInputStyle(fieldsDisabled)}
                        />
                      </td>
                      <td style={{ padding: '8px 16px', width: '30%' }}>
                        <select
                          value={flat.flat_type}
                          disabled={fieldsDisabled}
                          onChange={(e) => onUpdateFlat(flat.id, { flat_type: e.target.value })}
                          style={{ ...cellInputStyle(fieldsDisabled), cursor: fieldsDisabled ? 'not-allowed' : 'pointer' }}
                        >
                          <option value="">Select</option>
                          {FLAT_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 16px', width: '30%' }}>
                        <input
                          type="number"
                          value={flat.area_sqft}
                          placeholder="Enter area of flat"
                          readOnly={fieldsDisabled}
                          disabled={fieldsDisabled}
                          onChange={(e) => onUpdateFlat(flat.id, { area_sqft: e.target.value })}
                          style={cellInputStyle(fieldsDisabled)}
                        />
                      </td>
                      <td style={{ padding: '8px 16px', width: '20%' }}>
                        {/* Status toggle always stays clickable (unless the whole page is read-only)
                            so the user can re-enable a disabled flat. */}
                        <StatusToggle
                          checked={flat.is_active}
                          disabled={readOnly}
                          onChange={(v) => onUpdateFlat(flat.id, { is_active: v })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Series config card — Step 4 bulk configurator ───────────────────────────
// One card per "series" (the Nth flat position on every floor). Selecting a
// Flat Type + Area and clicking OK applies those values to that position on
// every floor of the active wing in one shot (e.g. Series-01 → the 1st flat
// on every floor: 001, 101, 201, 301 ... depending on your numbering).
// Cancel simply clears this card's own draft selection — it never touches
// already-saved flat data.
const SeriesConfigCard: React.FC<{
  t: AppTheme;
  seriesNumber: number;
  draft: { flat_type: string; area_sqft: string };
  onChangeDraft: (patch: Partial<{ flat_type: string; area_sqft: string }>) => void;
  onApply: () => void;
  onCancel: () => void;
}> = ({ t, seriesNumber, draft, onChangeDraft, onApply, onCancel }) => {
  const fieldStyleLocal: React.CSSProperties = {
    width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: 8, padding: '7px 10px', fontSize: 13, color: t.inputText,
    outline: 'none', fontFamily: t.fontFamily,
  };
  return (
    <div
      className="w-full sm:w-[220px]"
      style={{ border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, padding: 14, background: t.subtleBg }}
    >
      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#4338ca', marginBottom: 8 }}>
        Series-{String(seriesNumber).padStart(2, '0')}
      </div>

      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: t.textSecondary, marginBottom: 4 }}>
        Flat Type
      </label>
      <select
        value={draft.flat_type}
        onChange={(e) => onChangeDraft({ flat_type: e.target.value })}
        style={{ ...fieldStyleLocal, marginBottom: 8, cursor: 'pointer' }}
      >
        <option value="">Select</option>
        {FLAT_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
      </select>

      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: t.textSecondary, marginBottom: 4 }}>
        Flat Area (Sq Ft)
      </label>
      {/* Manually entered — no hardcoded preset list. */}
      <input
        type="number"
        value={draft.area_sqft}
        placeholder="Enter area of flat"
        onChange={(e) => onChangeDraft({ area_sqft: e.target.value })}
        style={{ ...fieldStyleLocal, marginBottom: 10 }}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 text-xs font-semibold rounded-lg text-white"
          style={{ background: 'linear-gradient(135deg,#4338ca,#4f46e5)', border: 'none', cursor: 'pointer', padding: '7px 0' }}
        >
          OK
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-xs font-semibold rounded-lg"
          style={{ background: 'transparent', border: `1px solid ${t.surfaceBorder}`, color: t.textSecondary, cursor: 'pointer', padding: '7px 0' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const BuildingCrudPage: React.FC<Props> = ({ mode }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { mode: uiMode } = useAppSelector((s) => s.theme);
  const isDark = uiMode === 'dark';
  const t = getTheme(isDark);

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const [projectName, setProjectName] = useState('');
  const [location, setLocationVal] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [wings, setWings] = useState<WingRow[]>([]);
  const [activeWingId, setActiveWingId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  const [fetching, setFetching] = useState(mode !== 'add');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // ── Step 4 addition: bulk "configure by series" drafts ─────────────────
  // Keyed by series number (1-based). Purely transient UI state — never
  // sent to the API; it only exists to hold the dropdown selections until
  // the user clicks OK for that series.
  const [seriesDrafts, setSeriesDrafts] = useState<Record<number, { flat_type: string; area_sqft: string }>>({});

  // ── New: Shop Details (Step 5) ──────────────────────────────────────────
  const [hasShops, setHasShops] = useState<boolean | null>(mode === 'add' ? null : false);
  const [shopCountInput, setShopCountInput] = useState('');
  const [shops, setShops] = useState<ShopRow[]>([]);

  // ── New: Parking (Step 6) ───────────────────────────────────────────────
  const [hasParking, setHasParking] = useState<boolean | null>(mode === 'add' ? null : false);
  const [parkingCountInput, setParkingCountInput] = useState('');

  // Refs so a newly-added wing's name input gets focus automatically
  const wingInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const newlyAddedWingIdRef = React.useRef<string | null>(null);

  const PAGE_TITLES: Record<Mode, string> = {
    add: 'Add New Building',
    edit: 'Edit Building',
    view: 'View Building',
  };

  useEffect(() => { dispatch(setPageTitle('Building')); }, [dispatch]);

  // ── load for view / edit ────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      try {
        const res = await ViewBuilding(id);
        if (res.success && res.data) {
          const b = res.data;
          setProjectName(b.project_name || '');
          setLocationVal(b.location || '');
          setBuildingName(b.building_name || '');
          setIsActive(b.is_active ?? true);
          const loadedWings: WingRow[] = (b.wings || []).map((w, wi) => ({
            id: w.id || simpleId('wing', wi + 1),
            name: w.name || '',
            no_of_floors: String(w.no_of_floors ?? ''),
            with_ground_floor: !!w.with_ground_floor,
            flatsPerFloorInput: '',
            floors: (w.floors || []).map((f, fi) => ({
              id: f.id || simpleId('floor', fi + 1),
              label: f.label,
              sort_order: f.sort_order ?? 0,
              flats: (f.flats || []).map((fl, fli) => ({
                id: fl.id || simpleId('flat', fli + 1),
                flat_no: fl.flat_no || '',
                flat_type: fl.flat_type || FLAT_TYPES[0],
                area_sqft: fl.area_sqft != null ? String(fl.area_sqft) : '',
                is_active: fl.is_active ?? true,
              })),
            })),
          }));
          setWings(loadedWings);
          setActiveWingId(loadedWings[0]?.id || '');

          // Shops & Parking — now typed on Building itself (see index.ts).
          // Both are optional there since older records may predate them.
          const loadedHasShops = !!b.has_shops;
          setHasShops(loadedHasShops);
          const loadedShops: ShopRow[] = (b.shops || []).map((s, si) => ({
            id: s.id || simpleId('shop', si + 1),
            shop_no: s.shop_no || `Shop-${String(si + 1).padStart(2, '0')}`,
            area_sqft: s.area_sqft != null ? String(s.area_sqft) : '',
            is_active: s.is_active ?? true,
          }));
          setShops(loadedShops);
          setShopCountInput(loadedShops.length ? String(loadedShops.length) : '');
          setHasParking(b.has_parking ?? false);
          setParkingCountInput(b.parking_count != null ? String(b.parking_count) : '');
        } else {
          toast.error('Failed to load building');
          navigate('/admin/masters/building');
        }
      } catch {
        toast.error('Failed to load building data');
        navigate('/admin/masters/building');
      } finally {
        setFetching(false);
      }
    })();
  }, [mode, id, navigate]);

  // ── keep an active tab selected once wings exist ────────────────────────
  useEffect(() => {
    if (!activeWingId && wings.length > 0) setActiveWingId(wings[0].id);
  }, [wings, activeWingId]);

  const markDirty = () => { if (!isView) setDirty(true); };

  // ── Step 2: Wings ────────────────────────────────────────────────────────
  const addWing = () => {
    setWings((prev) => {
      const nextNum = maxNumericSuffix(prev.map((w) => w.id), 'wing_') + 1;
      const newId = simpleId('wing', nextNum);
      newlyAddedWingIdRef.current = newId;
      return [...prev, makeWing(newId)];
    });
    markDirty();
  };

  // Focus the newly-added wing's name field as soon as it mounts
  useEffect(() => {
    const newId = newlyAddedWingIdRef.current;
    if (newId && wingInputRefs.current[newId]) {
      wingInputRefs.current[newId]?.focus();
      newlyAddedWingIdRef.current = null;
    }
  }, [wings]);

  const removeWing = (wingId: string) => {
    setWings((prev) => prev.filter((w) => w.id !== wingId));
    if (activeWingId === wingId) setActiveWingId('');
    markDirty();
  };

  const updateWing = (wingId: string, patch: Partial<WingRow>) => {
    setWings((prev) => prev.map((w) => (w.id === wingId ? { ...w, ...patch } : w)));
    markDirty();
  };

  // ── Step 3: Generate Floors (for every wing at once) ────────────────────
  const generateFloors = () => {
    setWings((prev) => {
      const allFloorIds = prev.flatMap((w) => w.floors.map((f) => f.id));
      let floorCounter = maxNumericSuffix(allFloorIds, 'floor_');
      return prev.map((w) => {
        const n = parseInt(w.no_of_floors, 10) || 0;
        const labels = buildFloorLabels(w.with_ground_floor, n);
        const existingByLabel = new Map(w.floors.map((f) => [f.label, f]));
        const floors: FloorRow[] = labels.map((label, idx) => {
          const existing = existingByLabel.get(label);
          if (existing) return { ...existing, sort_order: idx };
          floorCounter += 1;
          return { id: simpleId('floor', floorCounter), label, sort_order: idx, flats: [] };
        });
        return { ...w, floors };
      });
    });
    markDirty();
    toast.success('Floors Generated Successfully', { autoClose: 1000 });
  };

  // ── Step 4: Generate Flats (for the active wing's every floor) ─────────
  // Flat numbers are now floor-aware: floor 2 -> 201, 202, 203 ...;
  // floor 10 -> 1001, 1002 ...; floor 20 -> 2001, 2002 ... (Ground Floor
  // keeps the original 001, 002 ... style, since floorNumberFromLabel
  // returns 0 for it).
  const generateFlats = (wingId: string) => {
    setWings((prev) => {
      const allFlatIds = prev.flatMap((w) => w.floors.flatMap((f) => f.flats.map((fl) => fl.id)));
      let flatCounter = maxNumericSuffix(allFlatIds, 'flat_');
      return prev.map((w) => {
        if (w.id !== wingId) return w;
        const n = parseInt(w.flatsPerFloorInput, 10) || 0;
        const floors = w.floors.map((floor) => {
          const floorNumber = floorNumberFromLabel(floor.label);
          return {
            ...floor,
            flats: Array.from({ length: n }, (_, i) => {
              flatCounter += 1;
              const series = i + 1;
              return {
                id: simpleId('flat', flatCounter),
                flat_no: String(floorNumber * 100 + series).padStart(3, '0'),
                flat_type: '',
                area_sqft: '',
                is_active: true,
              } as FlatRow;
            }),
          };
        });
        return { ...w, floors };
      });
    });
    markDirty();
    toast.success('Flats Generated Successfully', { autoClose: 1000 });
  };

  const updateFlat = (wingId: string, floorId: string, flatId: string, patch: Partial<FlatRow>) => {
    setWings((prev) => prev.map((w) => {
      if (w.id !== wingId) return w;
      return {
        ...w,
        floors: w.floors.map((f) => {
          if (f.id !== floorId) return f;
          return { ...f, flats: f.flats.map((fl) => (fl.id === flatId ? { ...fl, ...patch } : fl)) };
        }),
      };
    }));
    markDirty();
  };

  const activeWing = useMemo(() => wings.find((w) => w.id === activeWingId), [wings, activeWingId]);

  // ── Master "All Floors" accordion (Step 4) ──────────────────────────────
  // This is a real show/hide of the ENTIRE floor listing, not a "force
  // every floor's table open" switch:
  //   - Collapsed  -> only the master's own row is visible; no floor rows
  //                   underneath it at all.
  //   - Expanded   -> every floor's row becomes visible again, but each
  //                   floor accordion starts CLOSED (just its header row,
  //                   e.g. "Ground Floor  4 flats  >"). You then open a
  //                   specific floor's flat table by clicking that floor's
  //                   own accordion, same as always.
  // Because the floor list is only rendered at all when `allFloorsOpen` is
  // true, collapsing and re-expanding naturally unmounts/remounts every
  // FloorAccordionItem — which resets each one back to closed on its own,
  // with no extra key/version bookkeeping needed.
  const [allFloorsOpen, setAllFloorsOpen] = useState(true);
  const toggleAllFloors = () => setAllFloorsOpen((v) => !v);

  // Reset to expanded whenever the selected wing changes, so switching
  // wings doesn't carry over a collapsed state from a different wing.
  useEffect(() => {
    setAllFloorsOpen(true);
  }, [activeWingId]);

  // Reset the bulk-series drafts whenever the selected wing changes, so a
  // half-filled Series card from one wing never leaks into another.
  useEffect(() => {
    setSeriesDrafts({});
  }, [activeWingId]);

  // Number of series cards to show for the active wing = the highest flat
  // count on any single floor (normally every floor has the same count,
  // since they all come from the same "No. of Flats on Each Floor" value).
  const activeSeriesCount = useMemo(() => {
    if (!activeWing) return 0;
    return activeWing.floors.reduce((max, f) => Math.max(max, f.flats.length), 0);
  }, [activeWing]);

  const getSeriesDraft = (seriesNumber: number) =>
    seriesDrafts[seriesNumber] ?? { flat_type: '', area_sqft: '' };

  const updateSeriesDraft = (seriesNumber: number, patch: Partial<{ flat_type: string; area_sqft: string }>) => {
    setSeriesDrafts((prev) => ({ ...prev, [seriesNumber]: { ...getSeriesDraft(seriesNumber), ...patch } }));
  };

  const cancelSeriesDraft = (seriesNumber: number) => {
    setSeriesDrafts((prev) => {
      const next = { ...prev };
      delete next[seriesNumber];
      return next;
    });
  };

  // Applies the chosen Flat Type + Area to the (seriesNumber)th flat on
  // EVERY floor of the active wing — e.g. Series-01 updates the 1st flat
  // position on each floor, Series-02 the 2nd, and so on. Manual per-flat
  // editing in the table below still works exactly as before afterwards.
  const applySeriesToActiveWing = (seriesNumber: number) => {
    const draft = getSeriesDraft(seriesNumber);
    if (!draft.flat_type || !draft.area_sqft) {
      toast.error(`Select both Flat Type and Area for Series-${String(seriesNumber).padStart(2, '0')}`);
      return;
    }
    if (!activeWing) return;
    const seriesIndex = seriesNumber - 1;
    setWings((prev) => prev.map((w) => {
      if (w.id !== activeWing.id) return w;
      return {
        ...w,
        floors: w.floors.map((floor) => {
          if (!floor.flats[seriesIndex]) return floor;
          return {
            ...floor,
            flats: floor.flats.map((fl, i) =>
              i === seriesIndex ? { ...fl, flat_type: draft.flat_type, area_sqft: draft.area_sqft } : fl
            ),
          };
        }),
      };
    }));
    markDirty();
    toast.success(`Series-${String(seriesNumber).padStart(2, '0')} applied to all floors`, { autoClose: 1200 });
    cancelSeriesDraft(seriesNumber);
  };

  // ── Step 5: Shop Details ────────────────────────────────────────────────
  const generateShops = () => {
    const n = parseInt(shopCountInput, 10) || 0;
    if (n <= 0) {
      toast.error('Enter a valid number of shops first.');
      return;
    }
    setShops((prev) => {
      const existingByIndex = prev;
      return Array.from({ length: n }, (_, i) => existingByIndex[i] ?? makeShop(simpleId('shop', i + 1), i + 1));
    });
    markDirty();
    toast.success('Shop Details Generated Successfully', { autoClose: 1000 });
  };

  const updateShop = (shopId: string, patch: Partial<ShopRow>) => {
    setShops((prev) => prev.map((s) => (s.id === shopId ? { ...s, ...patch } : s)));
    markDirty();
  };

  // ── validation ────────────────────────────────────────────────────────
  const shopsSectionValid = hasShops !== null && (!hasShops || shops.length > 0);
  const parkingCountValid = parkingCountInput.trim() !== '' && /^\d+$/.test(parkingCountInput.trim()) && parseInt(parkingCountInput, 10) > 0;
  const parkingSectionValid = hasParking !== null && (!hasParking || parkingCountValid);

  const isFormValid =
    projectName.trim() !== '' &&
    location.trim() !== '' &&
    buildingName.trim() !== '' &&
    wings.length > 0 &&
    wings.every((w) => w.name.trim() !== '' && parseInt(w.no_of_floors, 10) >= 0) &&
    shopsSectionValid &&
    parkingSectionValid;

  // ── submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isFormValid) {
      if (!projectName.trim() || !location.trim() || !buildingName.trim()) {
        toast.error('Please fill all Project Details fields.');
      } else if (wings.length === 0 || wings.some((w) => w.name.trim() === '' || !(parseInt(w.no_of_floors, 10) >= 0))) {
        toast.error('Please give every wing a name and a valid floor count.');
      } else if (hasShops === null) {
        toast.error('Please select whether this building has shops.');
      } else if (hasShops && shops.length === 0) {
        toast.error('Please enter the number of shops and click Generate Shops.');
      } else if (hasParking === null) {
        toast.error('Please select whether this building has parking.');
      } else if (hasParking && !parkingCountValid) {
        toast.error('Please enter a valid number of parking spaces.');
      } else {
        toast.error('Please fill all mandatory fields.');
      }
      return;
    }
    setSaving(true);
    try {
      const payload: CreateBuildingPayload = {
        project_name: projectName.trim(),
        location: location.trim(),
        building_name: buildingName.trim(),
        is_active: isActive,
        wings: wings.map((w) => ({
          id: w.id,
          name: w.name.trim(),
          no_of_floors: parseInt(w.no_of_floors, 10) || 0,
          with_ground_floor: w.with_ground_floor,
          floors: w.floors.map((f) => ({
            id: f.id,
            label: f.label,
            sort_order: f.sort_order,
            flats: f.flats.map((fl) => ({
              id: fl.id,
              flat_no: fl.flat_no.trim(),
              flat_type: fl.flat_type,
              area_sqft: fl.area_sqft ? Number(fl.area_sqft) : null,
              is_active: fl.is_active,
            })),
          })),
        })),
        has_shops: hasShops === true,
        shops: hasShops
          ? shops.map((s): BuildingShop => ({
              id: s.id,
              shop_no: s.shop_no.trim(),
              area_sqft: s.area_sqft ? Number(s.area_sqft) : null,
              is_active: s.is_active,
            }))
          : [],
        has_parking: hasParking === true,
        parking_count: hasParking ? parseInt(parkingCountInput, 10) : null,
      };

      const res = isEdit
        ? await UpdateBuilding(id!, payload)
        : await CreateBuilding(payload);

      if (res.success) {
        toast.success(isEdit ? 'Building Updated Successfully' : 'Building Created Successfully', { autoClose: 1000 });
        setDirty(false);
        navigate('/admin/masters/building');
      } else {
        toast.error(res.message || 'Operation failed');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── shared field styles ──────────────────────────────────────────────────
  const fieldStyle: React.CSSProperties = {
    width: '100%', background: isView ? t.insetBg : t.inputBg,
    border: `1px solid ${t.inputBorder}`, borderRadius: 10,
    padding: '10px 14px', fontSize: 14, color: t.inputText,
    outline: 'none', boxSizing: 'border-box', fontFamily: t.fontFamily,
    cursor: isView ? 'not-allowed' : 'text', opacity: isView ? 0.85 : 1,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontWeight: 600, fontSize: 13.5,
    marginBottom: 6, color: t.textPrimary, fontFamily: t.fontFamily,
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <p style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 40 }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MdApartment size={24} style={{ color: '#4338ca' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, margin: 0 }}>
              {PAGE_TITLES[mode]}
            </h1>
            <p style={{ fontSize: 13.5, color: t.textSecondary, margin: '2px 0 0' }}>
              Add Building, Wings, Floors &amp; Flats in one go
            </p>
          </div>
        </div>

        {!isView && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 999,
            background: dirty
              ? isDark ? 'rgba(245,158,11,0.12)' : '#fef3c7'
              : isDark ? 'rgba(34,197,94,0.12)' : '#dcfce7',
            color: dirty
              ? isDark ? '#fbbf24' : '#b45309'
              : isDark ? '#4ade80' : '#16a34a',
            fontSize: 13, fontWeight: 600,
          }}>
            {dirty
              ? <><MdFiberManualRecord size={12} /> Unsaved changes</>
              : <><MdCheckCircle size={16} /> All changes saved</>}
          </div>
        )}
      </div>

      {/* ── Step 1: Project Details ─────────────────────────────────────── */}
      <SectionCard t={t}>
        <div className="flex items-center gap-2.5 mb-1">
          <StepBadge n={1} />
          <div>
            <h2 style={{ fontSize: 16.5, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Project Details</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label style={labelStyle}>Project Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text" placeholder="Enter project name" value={projectName}
              readOnly={isView} disabled={isView}
              onChange={(e) => { setProjectName(e.target.value); markDirty(); }}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Location <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text" placeholder="Enter location" value={location}
              readOnly={isView} disabled={isView}
              onChange={(e) => { setLocationVal(e.target.value); markDirty(); }}
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Building Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text" placeholder="Enter building name" value={buildingName}
              readOnly={isView} disabled={isView}
              onChange={(e) => { setBuildingName(e.target.value); markDirty(); }}
              style={fieldStyle}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Step 2: Wings ────────────────────────────────────────────────── */}
      <SectionCard t={t}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2.5">
            <StepBadge n={2} />
            <div>
              <h2 style={{ fontSize: 16.5, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Wings</h2>
              <p style={{ fontSize: 13, color: t.textSecondary, margin: '2px 0 0' }}>Add or remove wings in this building</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, color: t.textSecondary }}>No. of Wings</span>
            <div style={{
              minWidth: 44, textAlign: 'center', padding: '8px 12px',
              borderRadius: 10, border: `1px solid ${t.surfaceBorder}`,
              background: t.insetBg, color: t.textPrimary, fontWeight: 700, fontSize: 14,
            }}>
              {wings.length}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          {wings.map((w, idx) => (
            <div key={w.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ border: `1px solid ${t.inputBorder}`, background: t.inputBg }}
            >
              <MdApartment size={18} style={{ color: WING_COLORS[idx % WING_COLORS.length], flexShrink: 0 }} />
              <input
                type="text" placeholder={`Wing ${idx + 1} name`} value={w.name}
                readOnly={isView} disabled={isView}
                ref={(el) => { wingInputRefs.current[w.id] = el; }}
                onChange={(e) => updateWing(w.id, { name: e.target.value.toUpperCase() })}
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  color: t.inputText, fontSize: 14, width: 130, fontFamily: t.fontFamily,
                  textTransform: 'camelcase',
                }}
              />
              {!isView && (
                <button onClick={() => removeWing(w.id)} title="Remove Wing"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, display: 'flex' }}>
                  <MdClose size={16} />
                </button>
              )}
            </div>
          ))}

          {!isView && (
            <button
              onClick={addWing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                border: `1.5px dashed ${isDark ? '#3b3ba0' : '#a5b4fc'}`,
                color: '#4338ca', background: 'transparent', cursor: 'pointer',
              }}
            >
              <MdAdd size={18} /> Add Wing
            </button>
          )}
        </div>
      </SectionCard>

      {/* ── Step 3: Floors in Each Wing ──────────────────────────────────── */}
      <SectionCard t={t}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2.5">
            <StepBadge n={3} />
            <div>
              <h2 style={{ fontSize: 16.5, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Floors in Each Wing</h2>
              <p style={{ fontSize: 13, color: t.textSecondary, margin: '2px 0 0' }}>Enter number of floors in each wing and choose counting type</p>
            </div>
          </div>
          {!isView && (
            <button
              onClick={generateFloors}
              disabled={wings.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{
                background: wings.length === 0 ? '#9ca3af' : 'linear-gradient(135deg,#4338ca,#4f46e5)',
                border: 'none', cursor: wings.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <MdLayers size={17} /> Generate Floors
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-4 mt-4">
          {wings.map((w, idx) => (
            <div key={w.id} className="w-full sm:w-64" style={{
              border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, padding: 16,
              background: t.subtleBg,
            }}>
              <div className="flex items-center gap-2 mb-3">
                <MdApartment size={17} style={{ color: WING_COLORS[idx % WING_COLORS.length] }} />
                <span style={{ fontWeight: 700, fontSize: 14.5, color: t.textPrimary }}>
                  {w.name ? `${w.name} wing` : `Wing ${idx + 1}`}
                </span>
              </div>
              <label style={labelStyle}>No. of Floors <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="number" min={0} placeholder="e.g. 5" value={w.no_of_floors}
                readOnly={isView} disabled={isView}
                onChange={(e) => updateWing(w.id, { no_of_floors: e.target.value })}
                style={{ ...fieldStyle, marginBottom: 12 }}
              />
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2" style={{ fontSize: 13.5, color: t.textPrimary, cursor: isView ? 'default' : 'pointer' }}>
                  <input
                    type="radio" checked={w.with_ground_floor} disabled={isView}
                    onChange={() => updateWing(w.id, { with_ground_floor: true })}
                  />
                  With Ground Floor
                </label>
                <label className="flex items-center gap-2" style={{ fontSize: 13.5, color: t.textPrimary, cursor: isView ? 'default' : 'pointer' }}>
                  <input
                    type="radio" checked={!w.with_ground_floor} disabled={isView}
                    onChange={() => updateWing(w.id, { with_ground_floor: false })}
                  />
                  Without Ground Floor
                </label>
              </div>
            </div>
          ))}
          {wings.length === 0 && (
            <p style={{ color: t.textSecondary, fontSize: 13.5 }}>Add a wing in Step 2 first.</p>
          )}
        </div>
      </SectionCard>

      {/* ── Step 4: Flats on Each Floor ──────────────────────────────────── */}
      <SectionCard t={t}>
        <div className="flex items-center gap-2.5 mb-4">
          <StepBadge n={4} />
          <div>
            <h2 style={{ fontSize: 16.5, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Flats on Each Floor</h2>
            <p style={{ fontSize: 13, color: t.textSecondary, margin: '2px 0 0' }}>Select a wing, enter flats count and manage flat details</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Left: wing tabs */}
          <div className="flex md:flex-col gap-2 md:w-56 flex-shrink-0 overflow-x-auto">
            {wings.map((w, idx) => (
              <button
                key={w.id}
                onClick={() => setActiveWingId(w.id)}
                style={{
                  textAlign: 'left', padding: '10px 14px', borderRadius: 10,
                  border: `1px solid ${w.id === activeWingId ? '#4338ca' : t.surfaceBorder}`,
                  background: w.id === activeWingId
                    ? isDark ? 'rgba(67,56,202,0.15)' : '#eef2ff'
                    : t.subtleBg,
                  cursor: 'pointer', minWidth: 140, flexShrink: 0,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: w.id === activeWingId ? '#4338ca' : t.textPrimary }}>
                  {w.name ? `${w.name} wing` : `Wing ${idx + 1}`}
                </div>
                <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 2 }}>
                  {floorsSummary(w.with_ground_floor, w.no_of_floors)}
                </div>
              </button>
            ))}
            {wings.length === 0 && (
              <p style={{ color: t.textSecondary, fontSize: 13.5 }}>No wings yet.</p>
            )}
          </div>

          {/* Right: selected wing's floors & flats */}
          <div className="flex-1 min-w-0" style={{ border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            {!activeWing ? (
              <div style={{ padding: 24, color: t.textSecondary, fontSize: 13.5 }}>
                Select a wing to manage its flats.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '14px 16px', background: t.insetBg, borderBottom: `1px solid ${t.divider}` }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#4338ca', fontSize: 14.5 }}>
                      {activeWing.name ? `${activeWing.name} wing` : 'Wing'}
                    </span>
                    <span style={{ fontSize: 12.5, color: t.textSecondary, marginLeft: 8 }}>
                      ({activeWing.with_ground_floor ? 'With Ground Floor' : 'Without Ground Floor'}
                      {' + '}{parseInt(activeWing.no_of_floors, 10) || 0} Floors = {(parseInt(activeWing.no_of_floors, 10) || 0) + (activeWing.with_ground_floor ? 1 : 0)} Levels)
                    </span>
                  </div>
                  {!isView && (
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 17, color: t.textSecondary, whiteSpace: 'nowrap' }}>Enter number of flats on each floor</span>
                      <input
                        type="number" min={0} value={activeWing.flatsPerFloorInput}
                        onChange={(e) => updateWing(activeWing.id, { flatsPerFloorInput: e.target.value })}
                        style={{ ...fieldStyle, width: 70, padding: '8px 10px' }}
                      />
                      <button
                        onClick={() => generateFlats(activeWing.id)}
                        disabled={activeWing.floors.length === 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                        style={{
                          background: activeWing.floors.length === 0 ? '#9ca3af' : 'linear-gradient(135deg,#4338ca,#4f46e5)',
                          border: 'none', cursor: activeWing.floors.length === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        <MdLayers size={17} /> Generate Flats
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Bulk Flat Configuration by Series ─────────────────────
                    Shown once flats have been generated for this wing. One
                    card per flat position ("series") on every floor — pick
                    Flat Type + Area once and apply it to that position
                    across all floors, instead of editing each flat by hand.
                    Manual editing in the table below still works exactly
                    as before, and is unaffected by this. */}
                {!isView && activeSeriesCount > 0 && (
                  <div style={{ padding: '16px', background: t.insetBg, borderBottom: `1px solid ${t.divider}` }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary, marginBottom: 2 }}>
                      Bulk Configure by Series
                    </div>
                    <p style={{ fontSize: 12.5, color: t.textSecondary, margin: '0 0 12px' }}>
                      Set Flat Type &amp; Area once per series to apply it to that flat position on every floor.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {Array.from({ length: activeSeriesCount }, (_, i) => i + 1).map((seriesNumber) => (
                        <SeriesConfigCard
                          key={seriesNumber}
                          t={t}
                          seriesNumber={seriesNumber}
                          draft={getSeriesDraft(seriesNumber)}
                          onChangeDraft={(patch) => updateSeriesDraft(seriesNumber, patch)}
                          onApply={() => applySeriesToActiveWing(seriesNumber)}
                          onCancel={() => cancelSeriesDraft(seriesNumber)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeWing.floors.length === 0 ? (
                  <div style={{ padding: 24, color: t.textSecondary, fontSize: 13.5 }}>
                    Generate floors in Step 3 first.
                  </div>
                ) : (
                  <>
                    {/* ── Master "All Floors" accordion ───────────────────
                        Collapsed: only this row is visible, nothing below
                        it. Expanded: every floor's row appears again, each
                        starting closed — click a floor's own row to open
                        just that floor's flat table. */}
                    <button
                      type="button"
                      onClick={toggleAllFloors}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: t.insetBg, border: 'none',
                        borderBottom: allFloorsOpen ? `1px solid ${t.divider}` : 'none',
                        cursor: 'pointer', padding: '12px 16px', fontFamily: t.fontFamily,
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 14.5, color: '#4338ca' }}>
                        All Floors ({activeWing.floors.length})
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.textSecondary, fontSize: 13, fontWeight: 600 }}>
                        {allFloorsOpen ? 'Collapse All' : 'Expand All'}
                        {allFloorsOpen ? <MdExpandMore size={20} /> : <MdChevronRight size={20} />}
                      </span>
                    </button>

                    {allFloorsOpen && activeWing.floors.map((floor) => (
                      <FloorAccordionItem
                        key={floor.id}
                        t={t}
                        isDark={isDark}
                        floor={floor}
                        defaultOpen={false}
                        readOnly={isView}
                        onUpdateFlat={(flatId, patch) => updateFlat(activeWing.id, floor.id, flatId, patch)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Step 5: Shop Details ─────────────────────────────────────────── */}
      <SectionCard t={t}>
        <div className="flex items-center gap-2.5 mb-4">
          <StepBadge n={5} />
          <div>
            <h2 style={{ fontSize: 16.5, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Shop Details</h2>
            <p style={{ fontSize: 13, color: t.textSecondary, margin: '2px 0 0' }}>Does this building have shops?</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <label style={labelStyle}>
            Do you have shops in this building? <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2" style={{ fontSize: 13.5, color: t.textPrimary, cursor: isView ? 'default' : 'pointer' }}>
              <input
                type="radio" name="has_shops" checked={hasShops === true} disabled={isView}
                onChange={() => { setHasShops(true); markDirty(); }}
              />
              Yes
            </label>
            <label className="flex items-center gap-2" style={{ fontSize: 13.5, color: t.textPrimary, cursor: isView ? 'default' : 'pointer' }}>
              <input
                type="radio" name="has_shops" checked={hasShops === false} disabled={isView}
                onChange={() => { setHasShops(false); setShops([]); setShopCountInput(''); markDirty(); }}
              />
              No
            </label>
          </div>
        </div>

        {hasShops && (
          <div className="mt-5" style={{ borderTop: `1px solid ${t.divider}`, paddingTop: 16 }}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span style={{ fontWeight: 600, fontSize: 13.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                How many shops in this building? <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input
                type="number" min={0} placeholder="e.g. 4" value={shopCountInput}
                readOnly={isView} disabled={isView}
                onChange={(e) => { setShopCountInput(e.target.value); markDirty(); }}
                style={{ ...fieldStyle, width: 120 }}
              />
              {!isView && (
                <button
                  type="button"
                  onClick={generateShops}
                  disabled={!shopCountInput || parseInt(shopCountInput, 10) <= 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: !shopCountInput || parseInt(shopCountInput, 10) <= 0 ? '#9ca3af' : 'linear-gradient(135deg,#4338ca,#4f46e5)',
                    border: 'none', cursor: !shopCountInput || parseInt(shopCountInput, 10) <= 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  <MdAdd size={17} /> Generate Shops
                </button>
              )}
            </div>

            {shops.length === 0 ? (
              <p style={{ color: t.textSecondary, fontSize: 13.5 }}>
                No shops yet — enter a count above and click &quot;Generate Shops&quot;.
              </p>
            ) : (
              /* Compact cards laid out next to each other (flex-wrap), sized
                 to fit their content rather than a wide fixed box — Shop
                 Number / Shop Area / Status stacked vertically, with the
                 toggle centered under its own label. Booking a shop
                 (toggling it to "Booked") disables & greys out its entire
                 card, mirroring how a disabled flat row behaves in Step 4. */
              <div className="flex flex-wrap gap-2.5">
                {shops.map((shop) => {
                  const rowDisabled = !shop.is_active;
                  const fieldsDisabled = isView || rowDisabled;
                  const shopFieldStyle: React.CSSProperties = {
                    width: '100%',
                    background: fieldsDisabled ? (isDark ? '#2a2a2a' : '#e5e7eb') : t.inputBg,
                    border: `1px solid ${t.inputBorder}`, borderRadius: 7, padding: '5px 8px',
                    fontSize: 12.5, color: fieldsDisabled ? t.textSecondary : t.inputText,
                    outline: 'none', fontFamily: t.fontFamily,
                    cursor: fieldsDisabled ? 'not-allowed' : 'text',
                  };
                  const shopLabelStyle: React.CSSProperties = {
                    display: 'block', fontSize: 10.5, fontWeight: 600, color: t.textSecondary, marginBottom: 3,
                  };
                  return (
                    <div
                      key={shop.id}
                      style={{
                        width: 132,
                        border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, padding: '10px 10px',
                        background: rowDisabled ? (isDark ? '#1c1c1c' : '#e5e7eb') : t.subtleBg,
                        opacity: rowDisabled ? 0.6 : 1,
                        filter: rowDisabled ? 'grayscale(70%)' : 'none',
                        transition: 'opacity 0.15s ease, filter 0.15s ease',
                      }}
                    >
                      <label style={shopLabelStyle}>Shop Number</label>
                      <input
                        type="text" value={shop.shop_no}
                        readOnly={fieldsDisabled} disabled={fieldsDisabled}
                        onChange={(e) => updateShop(shop.id, { shop_no: e.target.value })}
                        style={{ ...shopFieldStyle, marginBottom: 7 }}
                      />

                      <label style={shopLabelStyle}>Shop Area (Sq Ft)</label>
                      <input
                        type="number" value={shop.area_sqft}
                        readOnly={fieldsDisabled} disabled={fieldsDisabled}
                        onChange={(e) => updateShop(shop.id, { area_sqft: e.target.value })}
                        style={{ ...shopFieldStyle, marginBottom: 8 }}
                      />

                      <label style={{ ...shopLabelStyle, textAlign: 'center' }}>Status</label>
                      {/* The toggle itself always stays clickable (unless
                          the whole page is read-only) so a booked shop can
                          be freed up again — same rule as the flat rows.
                          Centered under its label, taking no more width
                          than the toggle + text itself needs. */}
                      <div className="flex justify-center">
                        <StatusToggle
                          checked={shop.is_active}
                          disabled={isView}
                          onLabel="Available"
                          offLabel="Booked"
                          showLabel
                          onChange={(v) => updateShop(shop.id, { is_active: v })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── Step 6: Parking ──────────────────────────────────────────────── */}
      <SectionCard t={t}>
        <div className="flex items-center gap-2.5 mb-4">
          <StepBadge n={6} />
          <div>
            <h2 style={{ fontSize: 16.5, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Parking</h2>
            <p style={{ fontSize: 13, color: t.textSecondary, margin: '2px 0 0' }}>Does this building have parking?</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <label style={labelStyle}>
            Do you have parking? <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2" style={{ fontSize: 13.5, color: t.textPrimary, cursor: isView ? 'default' : 'pointer' }}>
              <input
                type="radio" name="has_parking" checked={hasParking === true} disabled={isView}
                onChange={() => { setHasParking(true); markDirty(); }}
              />
              Yes
            </label>
            <label className="flex items-center gap-2" style={{ fontSize: 13.5, color: t.textPrimary, cursor: isView ? 'default' : 'pointer' }}>
              <input
                type="radio" name="has_parking" checked={hasParking === false} disabled={isView}
                onChange={() => { setHasParking(false); setParkingCountInput(''); markDirty(); }}
              />
              No
            </label>
          </div>
        </div>

        {hasParking && (
          <div className="mt-5" style={{ borderTop: `1px solid ${t.divider}`, paddingTop: 16 }}>
            <div className="flex flex-wrap items-center gap-3">
              <span style={{ fontWeight: 600, fontSize: 13.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                How many parking spaces are there in this building? <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="e.g. 20"
                value={parkingCountInput}
                readOnly={isView}
                disabled={isView}
                // Numeric-only: strip anything that isn't a digit as the
                // user types, so the field can never hold letters/symbols.
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/[^\d]/g, '');
                  setParkingCountInput(digitsOnly);
                  markDirty();
                }}
                style={{ ...fieldStyle, width: 140 }}
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Action Buttons ───────────────────────────────────────────────── */}
      {/* Fixed footer bar — truly pinned to the viewport bottom regardless of
          how many wings/floors/flats/shops are filled in, not just once
          you've scrolled all the way down. Position/left/right/bottom/
          height/border-radius/border/shadow all live in master.css's
          .master-crud-footer now (including the sidebar-width offset via
          --sidebar-w) so every master CRUD page's footer behaves and looks
          identically — only the theme colors stay inline here. */}
      <div
        className="master-crud-footer flex justify-center items-center gap-3 z-10"
        style={{ background: t.surfaceBg, borderColor: t.surfaceBorder }}
      >
        <button
          onClick={() => navigate('/admin/masters/building')}
          disabled={saving}
          className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: isDark ? '#374151' : '#e5e7eb', color: t.textPrimary, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}
        >
          <MdArrowBack size={16} /> Go Back
        </button>

        {!isView && (
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || saving}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{
              background: !isFormValid || saving ? '#9ca3af' : 'linear-gradient(135deg,#4338ca,#4f46e5)',
              border: 'none', cursor: !isFormValid || saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.8 : 1,
            }}
          >
            <MdSave size={17} /> {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        )}
      </div>
    </div>
  );
};

export default BuildingCrudPage;
