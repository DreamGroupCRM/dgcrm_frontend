// src/pages/Admin/Masters/Building/FlatCrudPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme, AppTheme } from '../../../../styles/theme';
import { fetchFlatById, createFlat, updateFlat } from '../../../../services/flatService';
import { fetchBuildingList } from '../../../../services/buildingService';
import { fetchWingList } from '../../../../services/wingService';
import { fetchFloorList } from '../../../../services/floorService';
import { Building, Wing, Floor } from '../../../../types/index';

// ─────────────────────────────────────────────────────────────────────────────
// Field — MODULE LEVEL
// ─────────────────────────────────────────────────────────────────────────────
interface FieldProps {
  label    : string;
  required?: boolean;
  error?   : string;
  t        : AppTheme;
  children : React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, required, error, t, children }) => (
  <div>
    <label style={{
      display: 'block', fontWeight: 700, fontSize: 14,
      marginBottom: 6, color: t.textPrimary, fontFamily: t.fontFamily,
    }}>
      {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {error && (
      <p style={{ color: '#ef4444', fontSize: 13, marginTop: 4, fontFamily: t.fontFamily }}>
        {error}
      </p>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Mode = 'add' | 'edit' | 'view';
interface Props { mode: Mode; }

interface FormErrors {
  building_id? : string;
  wing_id?     : string;
  floor_id?    : string;
  flat_number? : string;
}

const PAGE_TITLES: Record<Mode, string> = {
  add : 'Add Flat',
  edit: 'Edit Flat',
  view: 'View Flat',
};

const STATUS_OPTIONS: Array<{ value: 'vacant' | 'occupied' | 'sold'; label: string }> = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'sold', label: 'Sold' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const FlatCrudPage: React.FC<Props> = ({ mode }) => {
  const dispatch         = useAppDispatch();
  const navigate         = useNavigate();
  const { id }           = useParams<{ id: string }>();
  const { mode: uiMode } = useAppSelector((s) => s.theme);
  const isDark           = uiMode === 'dark';
  const t                = getTheme(isDark);

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  // ── form fields ────────────────────────────────────────────────────────
  const [buildingId, setBuildingId] = useState('');
  const [wingId, setWingId]         = useState('');
  const [floorId, setFloorId]       = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [flatType, setFlatType]     = useState('');
  const [areaSqft, setAreaSqft]     = useState('');
  const [status, setStatus]         = useState<'vacant' | 'occupied' | 'sold'>('vacant');
  const [isActive, setIsActive]     = useState(true);
  const [errors, setErrors]         = useState<FormErrors>({});

  // ── cascading dropdowns ─────────────────────────────────────────────────
  const [buildings, setBuildings]   = useState<Building[]>([]);
  const [allWings, setAllWings]     = useState<Wing[]>([]);
  const [allFloors, setAllFloors]   = useState<Floor[]>([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(false);

  // ── page state ─────────────────────────────────────────────────────────
  const [saving, setSaving]           = useState(false);
  const [loadingData, setLoadingData] = useState(mode !== 'add');

  useEffect(() => { dispatch(setPageTitle(PAGE_TITLES[mode])); }, [dispatch, mode]);

  // ── fetch buildings + wings + floors on mount (all modes) ──────────────
  useEffect(() => {
    (async () => {
      setDropdownsLoading(true);
      try {
        const [bRes, wRes, flRes] = await Promise.all([
          fetchBuildingList(1, 1000),
          fetchWingList(1, 1000),
          fetchFloorList(1, 1000),
        ]);
        if (bRes.success) setBuildings(bRes.rows ?? []);
        if (wRes.success) setAllWings(wRes.rows ?? []);
        if (flRes.success) setAllFloors(flRes.rows ?? []);
      } catch (e) {
        toast.error('Failed to load buildings/wings/floors. Please try again.');
      } finally {
        setDropdownsLoading(false);
      }
    })();
  }, []);

  // ── fetch flat data for edit / view ────────────────────────────────────
  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      try {
        const res = await fetchFlatById(id);
        console.log('[FlatCrudPage] fetchFlatById raw response:', res);
        if (res.success && res.data) {
          const d = res.data;
          setFloorId(String(d.fl_floor_id ?? ''));
          setFlatNumber(String(d.fl_flat_number ?? ''));
          setFlatType(String(d.fl_flat_type ?? ''));
          setAreaSqft(d.fl_area_sqft != null ? String(d.fl_area_sqft) : '');
          setStatus((d.fl_status as 'vacant' | 'occupied' | 'sold') ?? 'vacant');
          setIsActive(d.fl_is_active ?? true);
        } else {
          toast.error('Failed to load flat');
          navigate('/admin/masters/building');
        }
      } catch (e) {
        toast.error('Failed to load flat data');
        navigate('/admin/masters/building');
      } finally {
        setLoadingData(false);
      }
    })();
  }, [mode, id]);

  // once floors are loaded AND we know floorId (edit/view), derive wingId then buildingId
  useEffect(() => {
    if (!floorId || !allFloors.length) return;
    const fl = allFloors.find((fl) => String(fl.f_id) === String(floorId));
    if (fl) setWingId(String(fl.f_wing_id));
  }, [floorId, allFloors]);

  useEffect(() => {
    if (!wingId || !allWings.length) return;
    const w = allWings.find((w) => String(w.w_id) === String(wingId));
    if (w) setBuildingId(String(w.w_building_id));
  }, [wingId, allWings]);

  const wingsForBuilding = (bId: string) => allWings.filter((w) => String(w.w_building_id) === String(bId));
  const floorsForWing = (wId: string) => allFloors.filter((fl) => String(fl.f_wing_id) === String(wId));

  // ── validation ─────────────────────────────────────────────────────────
  const validateAll = (): FormErrors => {
    const e: FormErrors = {};
    if (mode === 'add') {
      if (!buildingId) e.building_id = 'Please select a building.';
      if (!wingId)     e.wing_id     = 'Please select a wing.';
      if (!floorId)    e.floor_id    = 'Please select a floor.';
    }
    if (!flatNumber.trim()) e.flat_number = 'Flat number is required.';
    return e;
  };

  const handleBlur = (field: keyof FormErrors) => setErrors((p) => ({ ...p, [field]: validateAll()[field] }));

  const isMandatoryValid =
    (mode !== 'add' || (buildingId !== '' && wingId !== '' && floorId !== '')) &&
    flatNumber.trim() !== '';

  // ── submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validateAll();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      if (isEdit) {
        const payload = {
          flat_number: flatNumber.trim(),
          flat_type  : flatType.trim() || undefined,
          area_sqft  : areaSqft.trim() ? Number(areaSqft) : undefined,
          status,
          is_active  : isActive,
        };
        const res = await updateFlat(id!, payload);
        console.log('[FlatCrudPage] updateFlat response:', res);
        if (!res.success) {
          toast.error(res.message || 'Failed to update flat');
          return;
        }
        toast.success('Flat Updated Successfully', { autoClose: 1000 });
      } else {
        const payload = {
          flat_number: flatNumber.trim(),
          floor_id   : floorId,
          flat_type  : flatType.trim() || undefined,
          area_sqft  : areaSqft.trim() ? Number(areaSqft) : undefined,
          status,
        };
        const res = await createFlat(payload);
        console.log('[FlatCrudPage] createFlat response:', res);
        if (!res.success) {
          toast.error(res.message || 'Failed to create flat');
          return;
        }
        toast.success('Flat Created Successfully', { autoClose: 1000 });
      }

      navigate('/admin/masters/building');

    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── styles ─────────────────────────────────────────────────────────────
  const fieldStyle = (hasError?: boolean): React.CSSProperties => ({
    width       : '100%',
    background  : isView ? t.insetBg : t.inputBg,
    border      : `1px solid ${hasError ? '#ef4444' : t.inputBorder}`,
    borderRadius: 10,
    padding     : '10px 14px',
    fontSize    : 14,
    color       : t.inputText,
    outline     : 'none',
    boxSizing   : 'border-box',
    fontFamily  : t.fontFamily,
    cursor      : isView ? 'not-allowed' : 'text',
    opacity     : isView ? 0.85 : 1,
  });

  const selectStyle = (hasError?: boolean, disabled?: boolean): React.CSSProperties => ({
    width             : '100%',
    background        : isView || disabled ? t.insetBg : t.inputBg,
    border            : `1px solid ${hasError ? '#ef4444' : t.inputBorder}`,
    borderRadius      : 10,
    padding           : '10px 14px',
    fontSize          : 14,
    color             : t.inputText,
    outline           : 'none',
    boxSizing         : 'border-box' as const,
    fontFamily        : t.fontFamily,
    cursor            : isView || disabled ? 'not-allowed' : 'pointer',
    opacity           : isView || disabled ? 0.7 : 1,
    appearance        : 'none' as const,
    WebkitAppearance  : 'none' as const,
    backgroundImage   : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat  : 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight      : 36,
  });

  if (loadingData || dropdownsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <p style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>Loading...</p>
      </div>
    );
  }

  // In edit/view mode, the flat's floor/wing/building are fixed — show as read-only text.
  const lockedHierarchy = mode !== 'add';

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 28 }}>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">

          {/* Select Building */}
          <Field label="Select Building" required={mode === 'add'} t={t} error={errors.building_id}>
            {lockedHierarchy ? (
              <input type="text" readOnly disabled
                value={buildings.find((b) => String(b.id) === String(buildingId))?.name ?? '—'}
                style={fieldStyle()} />
            ) : (
              <select
                value={buildingId}
                onChange={(e) => {
                  setBuildingId(e.target.value);
                  setWingId(''); setFloorId(''); // reset dependents
                  setErrors((p) => ({ ...p, building_id: undefined }));
                }}
                onBlur={() => handleBlur('building_id')}
                style={selectStyle(!!errors.building_id)}
              >
                <option value="" disabled>— Select Building —</option>
                {buildings.map((b) => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>
            )}
          </Field>

          {/* Select Wing */}
          <Field label="Select Wing" required={mode === 'add'} t={t} error={errors.wing_id}>
            {lockedHierarchy ? (
              <input type="text" readOnly disabled
                value={allWings.find((w) => String(w.w_id) === String(wingId))?.w_name ?? '—'}
                style={fieldStyle()} />
            ) : (
              <select
                value={wingId}
                disabled={!buildingId}
                onChange={(e) => {
                  setWingId(e.target.value);
                  setFloorId(''); // reset dependent
                  setErrors((p) => ({ ...p, wing_id: undefined }));
                }}
                onBlur={() => handleBlur('wing_id')}
                style={selectStyle(!!errors.wing_id, !buildingId)}
              >
                <option value="" disabled>{buildingId ? '— Select Wing —' : 'Select a building first'}</option>
                {wingsForBuilding(buildingId).map((w) => (
                  <option key={w.w_id} value={String(w.w_id)}>{w.w_name}</option>
                ))}
              </select>
            )}
          </Field>

          {/* Select Floor */}
          <Field label="Select Floor" required={mode === 'add'} t={t} error={errors.floor_id}>
            {lockedHierarchy ? (
              <input type="text" readOnly disabled
                value={allFloors.find((fl) => String(fl.f_id) === String(floorId))?.f_name ?? '—'}
                style={fieldStyle()} />
            ) : (
              <select
                value={floorId}
                disabled={!wingId}
                onChange={(e) => {
                  setFloorId(e.target.value);
                  setErrors((p) => ({ ...p, floor_id: undefined }));
                }}
                onBlur={() => handleBlur('floor_id')}
                style={selectStyle(!!errors.floor_id, !wingId)}
              >
                <option value="" disabled>{wingId ? '— Select Floor —' : 'Select a wing first'}</option>
                {floorsForWing(wingId).map((fl) => (
                  <option key={fl.f_id} value={String(fl.f_id)}>{fl.f_name}</option>
                ))}
              </select>
            )}
          </Field>

          {/* Flat Number */}
          <Field label="Flat Number" required={!isView} t={t} error={errors.flat_number}>
            <input type="text" placeholder="e.g. 101, G01"
              value={flatNumber} readOnly={isView} disabled={isView}
              onChange={(e) => { if (!isView) { setFlatNumber(e.target.value); setErrors((p) => ({ ...p, flat_number: undefined })); } }}
              onBlur={() => !isView && handleBlur('flat_number')}
              style={fieldStyle(!!errors.flat_number)} />
          </Field>

          {/* Type */}
          <Field label="Type" t={t}>
            <input type="text" placeholder="e.g. 1BHK, 2BHK, Office"
              value={flatType} readOnly={isView} disabled={isView}
              onChange={(e) => !isView && setFlatType(e.target.value)}
              style={fieldStyle()} />
          </Field>

          {/* Area */}
          <Field label="Area (sq.ft)" t={t}>
            <input type="text" inputMode="numeric" placeholder="e.g. 950"
              value={areaSqft} readOnly={isView} disabled={isView}
              onChange={(e) => { if (!isView && /^\d*$/.test(e.target.value)) setAreaSqft(e.target.value); }}
              style={fieldStyle()} />
          </Field>

          {/* Status */}
          <Field label="Status" t={t}>
            {isView ? (
              <input type="text" readOnly disabled
                value={STATUS_OPTIONS.find((s) => s.value === status)?.label ?? '—'}
                style={fieldStyle()} />
            ) : (
              <select value={status} onChange={(e) => setStatus(e.target.value as 'vacant' | 'occupied' | 'sold')} style={selectStyle()}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
          </Field>

        </div>

        {/* ── Buttons ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8 }}>
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
              disabled={!isMandatoryValid || saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{
                background: !isMandatoryValid || saving ? '#6b7280' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                border : 'none',
                cursor : !isMandatoryValid || saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlatCrudPage;
