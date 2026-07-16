// src/pages/Admin/Masters/Building/WingCrudPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme, AppTheme } from '../../../../styles/theme';
import { fetchWingById, createWing, updateWing, updateWingFloors } from '../../../../services/wingService';
import { fetchBuildingList } from '../../../../services/buildingService';
import { Building } from '../../../../types/index';

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
  name?        : string;
  floor_count? : string;
}

const PAGE_TITLES: Record<Mode, string> = {
  add : 'Add Wing',
  edit: 'Edit Wing',
  view: 'View Wing',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const WingCrudPage: React.FC<Props> = ({ mode }) => {
  const dispatch         = useAppDispatch();
  const navigate         = useNavigate();
  const { id }           = useParams<{ id: string }>();
  const { mode: uiMode } = useAppSelector((s) => s.theme);
  const isDark           = uiMode === 'dark';
  const t                = getTheme(isDark);

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  // ── form fields ────────────────────────────────────────────────────────
  const [buildingId, setBuildingId]             = useState('');
  const [name, setName]                         = useState('');
  const [floorCount, setFloorCount]             = useState('');
  const [originalFloorCount, setOriginalFloorCount] = useState(''); // track original for comparison
  const [isActive, setIsActive]                 = useState(true);
  const [errors, setErrors]                     = useState<FormErrors>({});

  // ── buildings dropdown ─────────────────────────────────────────────────
  const [buildings, setBuildings]   = useState<Building[]>([]);
  const [bldgLoading, setBldgLoading] = useState(false);

  // ── page state ─────────────────────────────────────────────────────────
  const [saving, setSaving]           = useState(false);
  const [loadingData, setLoadingData] = useState(mode !== 'add');
  const [wingIdStr, setWingIdStr]     = useState(''); // store raw w_id string for delete/update

  useEffect(() => { dispatch(setPageTitle(PAGE_TITLES[mode])); }, [dispatch, mode]);

  // ── fetch buildings on mount (all modes) ───────────────────────────────
  useEffect(() => {
    (async () => {
      setBldgLoading(true);
      try {
        const res = await fetchBuildingList(1, 1000);
        if (res.success) {
          setBuildings(res.rows ?? []);
        } else {
          toast.error('Failed to load buildings');
        }
      } catch (e) {
        toast.error('Failed to load buildings. Please try again.');
      } finally {
        setBldgLoading(false);
      }
    })();
  }, []);

  // ── fetch wing data for edit / view ────────────────────────────────────
  // IMPORTANT: API returns w_building_id (not building_id) — must use correct field
  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      try {
        const res = await fetchWingById(id);
        console.log('[WingCrudPage] fetchWingById raw response:', res);
        if (res.success && res.data) {
          const d = res.data;

          // ── FIX: use w_building_id (correct field from API response) ──
          const bldId = String(d.w_building_id ?? d.building_id ?? '');
          const fc    = String(d.floor_count ?? '');

          setBuildingId(bldId);
          setName(String(d.w_name ?? d.name ?? '').toUpperCase());
          setFloorCount(fc);
          setOriginalFloorCount(fc);   // save original to compare on submit
          setIsActive(d.w_is_active ?? true);
          setWingIdStr(String(d.w_id ?? id)); // store for floors API call
        } else {
          toast.error('Failed to load wing');
          navigate('/admin/masters/building');
        }
      } catch (e) {
        toast.error('Failed to load wing data');
        navigate('/admin/masters/building');
      } finally {
        setLoadingData(false);
      }
    })();
  }, [mode, id]);

  // ── validation ─────────────────────────────────────────────────────────
  const ALPHA_ONLY = /^[A-Z]+$/;

  const validateAll = (): FormErrors => {
    const e: FormErrors = {};
    if (!buildingId)                               e.building_id = 'Please select a building.';
    if (!name.trim())                              e.name        = 'Wing name is required.';
    else if (!ALPHA_ONLY.test(name))               e.name        = 'Wing name must be letters only, no spaces (e.g. A, B, AB).';
    if (!floorCount.toString().trim())             e.floor_count = 'Number of floors is required.';
    else if (isNaN(Number(floorCount)) || Number(floorCount) <= 0)
                                                   e.floor_count = 'Enter a valid number of floors.';
    return e;
  };

  const handleBlurBuilding = () => setErrors((p) => ({ ...p, building_id: validateAll().building_id }));
  const handleBlurName     = () => setErrors((p) => ({ ...p, name: validateAll().name }));
  const handleBlurFloor    = () => setErrors((p) => ({ ...p, floor_count: validateAll().floor_count }));

  const handleNameChange = (val: string) => {
    // strip non-letters, force uppercase
    const clean = val.replace(/[^a-zA-Z]/g, '').toUpperCase();
    setName(clean);
    setErrors((p) => ({ ...p, name: undefined }));
  };

  const isMandatoryValid =
    buildingId !== '' &&
    name.trim() !== '' &&
    ALPHA_ONLY.test(name) &&
    floorCount.trim() !== '' &&
    !isNaN(Number(floorCount)) &&
    Number(floorCount) > 0;

  // ── submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validateAll();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        name        : name.trim(),
        building_id : buildingId,   // always string, API accepts it
        floor_count : Number(floorCount),
        is_active   : isActive,
        sort_order  : 0,
      };

      if (isEdit) {
        // ── Step 1: Update wing ──────────────────────────────────────────
        const res = await updateWing(id!, payload);
        console.log('[WingCrudPage] updateWing response:', res);

        if (!res.success) {
          toast.error(res.message || 'Failed to update wing');
          return;
        }

        // ── Step 2: Call floors API ONLY if floor_count changed ──────────
        const floorChanged = String(floorCount).trim() !== String(originalFloorCount).trim();
        console.log('[WingCrudPage] floor_count changed:', floorChanged, `(${originalFloorCount} → ${floorCount})`);

        if (floorChanged) {
          try {
            const floorsRes = await updateWingFloors(wingIdStr || id!);
            console.log('[WingCrudPage] updateWingFloors response:', floorsRes);
            if (!floorsRes.success) {
              toast.error(floorsRes.message || 'Wing updated but floor sync failed');
              navigate('/admin/masters/building');
              return;
            }
          } catch (e) {
            console.error('[WingCrudPage] updateWingFloors error:', e);
            toast.error('Wing updated but failed to sync floors');
            navigate('/admin/masters/building');
            return;
          }
        }

        toast.success('Wing Updated Successfully', { autoClose: 1000 });

      } else {
        // ── Add mode ─────────────────────────────────────────────────────
        const res = await createWing(payload);
        console.log('[WingCrudPage] createWing response:', res);
        if (!res.success) {
          toast.error(res.message || 'Failed to create wing');
          return;
        }
        toast.success('Wing Created Successfully', { autoClose: 1000 });
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

  const selectStyle = (hasError?: boolean): React.CSSProperties => ({
    width             : '100%',
    background        : isView ? t.insetBg : t.inputBg,
    border            : `1px solid ${hasError ? '#ef4444' : t.inputBorder}`,
    borderRadius      : 10,
    padding           : '10px 14px',
    fontSize          : 14,
    color             : buildingId ? t.inputText : t.textSecondary,
    outline           : 'none',
    boxSizing         : 'border-box' as const,
    fontFamily        : t.fontFamily,
    cursor            : isView ? 'not-allowed' : 'pointer',
    opacity           : isView ? 0.85 : 1,
    appearance        : 'none' as const,
    WebkitAppearance  : 'none' as const,
    backgroundImage   : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat  : 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight      : 36,
  });

  if (loadingData || bldgLoading) {
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
              <input
                type="text" readOnly disabled
                value={buildings.find((b) => String(b.id) === String(buildingId))?.name ?? '—'}
                style={fieldStyle()}
              />
            ) : (
              <select
                value={buildingId}
                onChange={(e) => {
                  setBuildingId(e.target.value);
                  setErrors((p) => ({ ...p, building_id: undefined }));
                }}
                onBlur={handleBlurBuilding}
                style={selectStyle(!!errors.building_id)}
              >
                <option value="" disabled style={{ color: t.textSecondary }}>— Select Building —</option>
                {buildings.map((b) => (
                  <option
                    key={b.id}
                    value={String(b.id)}
                    style={{ background: t.inputBg, color: t.inputText }}
                  >
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {/* Wing Name */}
          <Field label="Wing Name" required={!isView} t={t} error={errors.name}>
            <input
              type="text"
              placeholder="Enter wing name (e.g. A, B, AB)"
              value={name}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => !isView && handleNameChange(e.target.value)}
              onBlur={() => !isView && handleBlurName()}
              style={fieldStyle(!!errors.name)}
            />
          </Field>

          {/* No. of Floors */}
          <Field label="No. of Floors" required={!isView} t={t} error={errors.floor_count}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter number of floors"
              value={floorCount}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => {
                if (!isView && /^\d*$/.test(e.target.value)) {
                  setFloorCount(e.target.value);
                  setErrors((p) => ({ ...p, floor_count: undefined }));
                }
              }}
              onBlur={() => !isView && handleBlurFloor()}
              style={fieldStyle(!!errors.floor_count)}
            />
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
                background: !isMandatoryValid || saving ? '#6b7280' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
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

export default WingCrudPage;
