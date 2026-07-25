// src/pages/Admin/Masters/Building/FloorCrudPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme, AppTheme } from '../../../../styles/theme';
import { fetchFloorById, createFloor, updateFloor, generateFlats } from '../../../../services/floorService';
import { fetchBuildingList } from '../../../../services/buildingService';
import { fetchWingList } from '../../../../services/wingService';
import { Building, Wing } from '../../../../types/index';

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
  name?        : string;
  floor_number?: string;
  flat_count?  : string;
}

const PAGE_TITLES: Record<Mode, string> = {
  add : 'Add Floor',
  edit: 'Edit Floor',
  view: 'View Floor',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const FloorCrudPage: React.FC<Props> = ({ mode }) => {
  const dispatch         = useAppDispatch();
  const navigate         = useNavigate();
  const { id }           = useParams<{ id: string }>();
  const { mode: uiMode } = useAppSelector((s) => s.theme);
  const isDark           = uiMode === 'dark';
  const t                = getTheme(isDark);

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  // ── form fields ────────────────────────────────────────────────────────
  const [buildingId, setBuildingId]   = useState('');
  const [wingId, setWingId]           = useState('');
  const [name, setName]               = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [flatCount, setFlatCount]             = useState('');
  const [originalFlatCount, setOriginalFlatCount] = useState(''); // track original for comparison
  const [isActive, setIsActive]       = useState(true);
  const [errors, setErrors]           = useState<FormErrors>({});

  // ── building/wing dropdowns ─────────────────────────────────────────────
  const [buildings, setBuildings]     = useState<Building[]>([]);
  const [allWings, setAllWings]       = useState<Wing[]>([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(false);

  // ── page state ─────────────────────────────────────────────────────────
  const [saving, setSaving]           = useState(false);
  const [loadingData, setLoadingData] = useState(mode !== 'add');
  const [floorIdStr, setFloorIdStr]   = useState(''); // store raw f_id string for update

  useEffect(() => { dispatch(setPageTitle(PAGE_TITLES[mode])); }, [dispatch, mode]);

  // ── fetch buildings + wings on mount (all modes) ───────────────────────
  useEffect(() => {
    (async () => {
      setDropdownsLoading(true);
      try {
        const [bRes, wRes] = await Promise.all([
          fetchBuildingList(1, 1000),
          fetchWingList(1, 1000),
        ]);
        if (bRes.success) setBuildings(bRes.rows ?? []);
        if (wRes.success) setAllWings(wRes.rows ?? []);
      } catch (e) {
        toast.error('Failed to load buildings/wings. Please try again.');
      } finally {
        setDropdownsLoading(false);
      }
    })();
  }, []);

  // ── fetch floor data for edit / view ───────────────────────────────────
  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      try {
        const res = await fetchFloorById(id);
        console.log('[FloorCrudPage] fetchFloorById raw response:', res);
        if (res.success && res.data) {
          const d = res.data;
          const wId = String(d.f_wing_id ?? '');
          const fc  = String(d.flat_count ?? '');

          setWingId(wId);
          setName(String(d.f_name ?? d.name ?? ''));
          setFloorNumber(String(d.f_floor_number ?? '0'));
          setFlatCount(fc);
          setOriginalFlatCount(fc);
          setIsActive(d.f_is_active ?? true);
          setFloorIdStr(String(d.f_id ?? id));
        } else {
          toast.error('Failed to load floor');
          navigate('/admin/masters/building');
        }
      } catch (e) {
        toast.error('Failed to load floor data');
        navigate('/admin/masters/building');
      } finally {
        setLoadingData(false);
      }
    })();
  }, [mode, id]);

  // derive buildingId once wings load (edit/view)
  useEffect(() => {
    if (!wingId || !allWings.length) return;
    const w = allWings.find((w) => String(w.w_id) === String(wingId));
    if (w) setBuildingId(String(w.w_building_id));
  }, [wingId, allWings]);

  const wingsForBuilding = (bId: string) => allWings.filter((w) => String(w.w_building_id) === String(bId));

  // ── validation ─────────────────────────────────────────────────────────
  const validateAll = (): FormErrors => {
    const e: FormErrors = {};
    if (!buildingId)                                  e.building_id  = 'Please select a building.';
    if (!wingId)                                       e.wing_id      = 'Please select a wing.';
    if (!name.trim())                                  e.name         = 'Floor name is required.';
    if (floorNumber.toString().trim() === '' || isNaN(Number(floorNumber)))
                                                        e.floor_number = 'Enter a valid floor number (0 for Ground Floor).';
    if (mode === 'add') {
      if (!flatCount.toString().trim())                e.flat_count = 'Number of flats is required.';
      else if (isNaN(Number(flatCount)) || Number(flatCount) <= 0)
                                                        e.flat_count = 'Enter a valid number of flats.';
    }
    return e;
  };

  const handleBlur = (field: keyof FormErrors) => setErrors((p) => ({ ...p, [field]: validateAll()[field] }));

  const isMandatoryValid =
    buildingId !== '' &&
    wingId !== '' &&
    name.trim() !== '' &&
    floorNumber.toString().trim() !== '' &&
    !isNaN(Number(floorNumber)) &&
    (mode !== 'add' || (flatCount.trim() !== '' && !isNaN(Number(flatCount)) && Number(flatCount) > 0));

  // ── submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validateAll();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      if (isEdit) {
        const payload = {
          name        : name.trim(),
          wing_id     : wingId,
          floor_number: Number(floorNumber),
          is_active   : isActive,
          sort_order  : 0,
        };
        const res = await updateFloor(id!, payload);
        console.log('[FloorCrudPage] updateFloor response:', res);

        if (!res.success) {
          toast.error(res.message || 'Failed to update floor');
          return;
        }

        // ── Add more flats ONLY if the count increased ──────────────────
        const delta = Number(flatCount) - Number(originalFlatCount);
        console.log('[FloorCrudPage] flat_count delta:', delta, `(${originalFlatCount} → ${flatCount})`);

        if (delta > 0) {
          try {
            const flatsRes = await generateFlats(floorIdStr || id!, delta);
            console.log('[FloorCrudPage] generateFlats response:', flatsRes);
            if (!flatsRes.success) {
              toast.error(flatsRes.message || 'Floor updated but adding flats failed');
              navigate('/admin/masters/building');
              return;
            }
          } catch (e) {
            console.error('[FloorCrudPage] generateFlats error:', e);
            toast.error('Floor updated but failed to add flats');
            navigate('/admin/masters/building');
            return;
          }
        } else if (delta < 0) {
          toast.warning('Flat count was lowered, but existing flats can\'t be removed here — delete them individually from Flat Details if needed.', { autoClose: 4000 });
        }

        toast.success('Floor Updated Successfully', { autoClose: 1000 });

      } else {
        const payload = {
          name        : name.trim(),
          wing_id     : wingId,
          floor_number: Number(floorNumber),
          flat_count  : Number(flatCount),
          is_active   : isActive,
          sort_order  : 0,
        };
        const res = await createFloor(payload);
        console.log('[FloorCrudPage] createFloor response:', res);
        if (!res.success) {
          toast.error(res.message || 'Failed to create floor');
          return;
        }
        toast.success('Floor Created Successfully', { autoClose: 1000 });
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

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 28 }}>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">

          {/* Select Building */}
          <Field label="Select Building" required={!isView} t={t} error={errors.building_id}>
            {isView ? (
              <input type="text" readOnly disabled
                value={buildings.find((b) => String(b.id) === String(buildingId))?.name ?? '—'}
                style={fieldStyle()} />
            ) : (
              <select
                value={buildingId}
                onChange={(e) => {
                  setBuildingId(e.target.value);
                  setWingId(''); // reset dependent dropdown
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

          {/* Select Wing (filtered by building) */}
          <Field label="Select Wing" required={!isView} t={t} error={errors.wing_id}>
            {isView ? (
              <input type="text" readOnly disabled
                value={allWings.find((w) => String(w.w_id) === String(wingId))?.w_name ?? '—'}
                style={fieldStyle()} />
            ) : (
              <select
                value={wingId}
                disabled={!buildingId}
                onChange={(e) => {
                  setWingId(e.target.value);
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

          {/* Floor Name */}
          <Field label="Floor Name" required={!isView} t={t} error={errors.name}>
            <input type="text" placeholder="e.g. Ground Floor, 1st Floor"
              value={name} readOnly={isView} disabled={isView}
              onChange={(e) => { if (!isView) { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); } }}
              onBlur={() => !isView && handleBlur('name')}
              style={fieldStyle(!!errors.name)} />
          </Field>

          {/* Floor Number */}
          <Field label="Floor Number" required={!isView} t={t} error={errors.floor_number}>
            <input type="text" inputMode="numeric" placeholder="e.g. 0 for Ground, 1, 2..."
              value={floorNumber} readOnly={isView} disabled={isView}
              onChange={(e) => { if (!isView && /^\d*$/.test(e.target.value)) { setFloorNumber(e.target.value); setErrors((p) => ({ ...p, floor_number: undefined })); } }}
              onBlur={() => !isView && handleBlur('floor_number')}
              style={fieldStyle(!!errors.floor_number)} />
          </Field>

          {/* No. of Flats — required on Add, editable count on Edit */}
          <Field label={mode === 'add' ? 'No. of Flats' : 'No. of Flats (increase only)'} required={mode === 'add' && !isView} t={t} error={errors.flat_count}>
            <input type="text" inputMode="numeric" placeholder="Enter number of flats"
              value={flatCount} readOnly={isView} disabled={isView}
              onChange={(e) => { if (!isView && /^\d*$/.test(e.target.value)) { setFlatCount(e.target.value); setErrors((p) => ({ ...p, flat_count: undefined })); } }}
              onBlur={() => !isView && handleBlur('flat_count')}
              style={fieldStyle(!!errors.flat_count)} />
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
                background: !isMandatoryValid || saving ? '#6b7280' : 'linear-gradient(135deg,#059669,#10b981)',
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

export default FloorCrudPage;
