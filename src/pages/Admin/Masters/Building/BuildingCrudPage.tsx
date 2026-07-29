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
  fetchBuildingById,
  createBuilding,
  updateBuilding,
} from '../../../../services/buildingService';
import { CreateBuildingPayload } from '../../../../types/index';

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

type Mode = 'add' | 'edit' | 'view';
interface Props { mode: Mode; }

const FLAT_TYPES = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Studio', 'Other'];
const WING_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#db2777'];

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

const StatusToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = (
  { checked, onChange, disabled }
) => (
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
    title={checked ? 'Active' : 'Inactive'}
  >
    <span style={{
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      boxShadow: '0 1px 2px rgba(0,0,0,0.3)', display: 'block',
    }} />
  </button>
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
                      textTransform: 'uppercase', letterSpacing: '0.04em', color: t.textSecondary,
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
                          {FLAT_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 16px', width: '30%' }}>
                        <input
                          type="number"
                          value={flat.area_sqft}
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
  const [wings, setWings] = useState<WingRow[]>(() => (mode === 'add' ? [makeWing(simpleId('wing', 1))] : []));
  const [activeWingId, setActiveWingId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  const [fetching, setFetching] = useState(mode !== 'add');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

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
        const res = await fetchBuildingById(id);
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
  const generateFlats = (wingId: string) => {
    setWings((prev) => {
      const allFlatIds = prev.flatMap((w) => w.floors.flatMap((f) => f.flats.map((fl) => fl.id)));
      let flatCounter = maxNumericSuffix(allFlatIds, 'flat_');
      return prev.map((w) => {
        if (w.id !== wingId) return w;
        const n = parseInt(w.flatsPerFloorInput, 10) || 0;
        const floors = w.floors.map((floor) => ({
          ...floor,
          flats: Array.from({ length: n }, (_, i) => {
            flatCounter += 1;
            return {
              id: simpleId('flat', flatCounter),
              flat_no: String(i + 1).padStart(3, '0'),
              flat_type: i % 2 === 0 ? '2 BHK' : '1 BHK',
              area_sqft: i % 2 === 0 ? '800' : '550',
              is_active: true,
            } as FlatRow;
          }),
        }));
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

  // ── validation ────────────────────────────────────────────────────────
  const isFormValid =
    projectName.trim() !== '' &&
    location.trim() !== '' &&
    buildingName.trim() !== '' &&
    wings.length > 0 &&
    wings.every((w) => w.name.trim() !== '' && parseInt(w.no_of_floors, 10) >= 0);

  // ── submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error('Please fill Project Details and give every wing a name & floor count.');
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
      };

      const res = isEdit
        ? await updateBuilding(id!, payload)
        : await createBuilding(payload);

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
    <div style={{ fontFamily: t.fontFamily }}>

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
                  textTransform: 'uppercase',
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {wings.map((w, idx) => (
            <div key={w.id} style={{
              border: `1px solid ${t.surfaceBorder}`, borderRadius: 12, padding: 16,
              background: t.subtleBg,
            }}>
              <div className="flex items-center gap-2 mb-3">
                <MdApartment size={17} style={{ color: WING_COLORS[idx % WING_COLORS.length] }} />
                <span style={{ fontWeight: 700, fontSize: 14.5, color: t.textPrimary }}>
                  {w.name || `Wing ${idx + 1}`}
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
                  With Gr Floor
                </label>
                <label className="flex items-center gap-2" style={{ fontSize: 13.5, color: t.textPrimary, cursor: isView ? 'default' : 'pointer' }}>
                  <input
                    type="radio" checked={!w.with_ground_floor} disabled={isView}
                    onChange={() => updateWing(w.id, { with_ground_floor: false })}
                  />
                  Without Gr Floor
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
                  {w.name || `Wing ${idx + 1}`}
                </div>
                <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 2 }}>
                  {w.floors.length} Floor{w.floors.length === 1 ? '' : 's'}
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
                    <span style={{ fontWeight: 700, color: '#4338ca', fontSize: 14.5 }}>{activeWing.name || 'Wing'}</span>
                    <span style={{ fontSize: 12.5, color: t.textSecondary, marginLeft: 8 }}>
                      ({activeWing.with_ground_floor ? 'With Ground Floor' : 'Without Ground Floor'}
                      {' + '}{parseInt(activeWing.no_of_floors, 10) || 0} Floors = {(parseInt(activeWing.no_of_floors, 10) || 0) + (activeWing.with_ground_floor ? 1 : 0)} Levels)
                    </span>
                  </div>
                  {!isView && (
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 13, color: t.textSecondary, whiteSpace: 'nowrap' }}>Enter number of flats on each floor</span>
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

                {activeWing.floors.length === 0 ? (
                  <div style={{ padding: 24, color: t.textSecondary, fontSize: 13.5 }}>
                    Generate floors in Step 3 first.
                  </div>
                ) : (
                  activeWing.floors.map((floor, fIdx) => (
                    <FloorAccordionItem
                      key={floor.id}
                      t={t}
                      isDark={isDark}
                      floor={floor}
                      defaultOpen={fIdx === 0}
                      readOnly={isView}
                      onUpdateFlat={(flatId, patch) => updateFlat(activeWing.id, floor.id, flatId, patch)}
                    />
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Action Buttons ───────────────────────────────────────────────── */}
      <div className="flex justify-end items-center gap-3 mt-2">
        <button
          onClick={() => navigate('/admin/masters/building')}
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}
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
            <MdSave size={17} /> {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
};

export default BuildingCrudPage;
