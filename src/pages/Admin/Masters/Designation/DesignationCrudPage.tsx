// src/pages/Admin/Masters/Designation/DesignationCrudPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme, AppTheme } from '../../../../styles/theme';
import {
  fetchDesignationById,
  createDesignation,
  updateDesignation,
} from '../../../../services/designationService';
import { fetchDepartmentList } from '../../../../services/departmentService';
import { Department } from '../../../../types/index';

// ─────────────────────────────────────────────────────────────────────────────
// Field — MODULE LEVEL — prevents cursor loss on every keystroke
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
  name?         : string;
  department_id?: string;
}

const PAGE_TITLES: Record<Mode, string> = {
  add : 'Add Designation',
  edit: 'Edit Designation',
  view: 'View Designation',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const DesignationCrudPage: React.FC<Props> = ({ mode }) => {
  const dispatch         = useAppDispatch();
  const navigate         = useNavigate();
  const { id }           = useParams<{ id: string }>();
  const { mode: uiMode } = useAppSelector((s) => s.theme);
  const isDark           = uiMode === 'dark';
  const t                = getTheme(isDark);

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  // ── form state ─────────────────────────────────────────────────────────
  const [name, setName]                   = useState('');
  const [departmentId, setDepartmentId]   = useState('');
  const [isActive, setIsActive]           = useState(true);
  const [errors, setErrors]               = useState<FormErrors>({});

  // ── departments dropdown ───────────────────────────────────────────────
  const [departments, setDepartments]     = useState<Department[]>([]);
  const [deptLoading, setDeptLoading]     = useState(false);

  // ── page state ─────────────────────────────────────────────────────────
  const [saving, setSaving]               = useState(false);
  const [loadingData, setLoadingData]     = useState(mode !== 'add');

  useEffect(() => { dispatch(setPageTitle(PAGE_TITLES[mode])); }, [dispatch, mode]);

  // ── fetch departments on mount (all modes) ─────────────────────────────
  useEffect(() => {
    (async () => {
      setDeptLoading(true);
      try {
        const res = await fetchDepartmentList(1, 1000);
        if (res.success) {
          setDepartments(res.rows ?? []);
        } else {
          toast.error('Failed to load departments');
        }
      } catch (e) {
        toast.error('Failed to load departments. Please try again.');
      } finally {
        setDeptLoading(false);
      }
    })();
  }, []);

  // ── fetch designation data for edit / view ─────────────────────────────
  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      try {
        const res = await fetchDesignationById(id);
        if (res.success && res.data) {
          setName(res.data.name ?? '');
          setDepartmentId(res.data.department_id ?? '');
          setIsActive(res.data.is_active ?? true);
        } else {
          toast.error('Failed to load designation');
          navigate('/admin/masters/designation');
        }
      } catch (e) {
        toast.error('Failed to load designation data');
        navigate('/admin/masters/designation');
      } finally {
        setLoadingData(false);
      }
    })();
  }, [mode, id]);

  // ── validation ─────────────────────────────────────────────────────────
  const validateAll = (): FormErrors => {
    const e: FormErrors = {};
    if (!name.trim())      e.name          = 'Designation name is required.';
    if (!departmentId)     e.department_id = 'Please select a department.';
    return e;
  };

  const handleBlurName = () => {
    const errs = validateAll();
    setErrors((prev) => ({ ...prev, name: errs.name }));
  };

  const handleBlurDept = () => {
    const errs = validateAll();
    setErrors((prev) => ({ ...prev, department_id: errs.department_id }));
  };

  const isMandatoryValid = name.trim() !== '' && departmentId !== '';

  // ── submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validateAll();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        name         : name.trim(),
        department_id: departmentId,
        is_active    : isActive,
        sort_order   : 0,
      };

      const res = isEdit
        ? await updateDesignation(id!, payload)
        : await createDesignation(payload);

      if (res.success) {
        toast.success(
          isEdit ? 'Designation Updated Successfully' : 'Designation Created Successfully',
          { autoClose: 1000 }
        );
        navigate('/admin/masters/designation');
      } else {
        toast.error(res.message || 'Operation failed');
      }
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── shared field style ─────────────────────────────────────────────────
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

  // ── select style (same dimensions as fieldStyle) ───────────────────────
  const selectStyle = (hasError?: boolean): React.CSSProperties => ({
    width           : '100%',
    background      : isView ? t.insetBg : t.inputBg,
    border          : `1px solid ${hasError ? '#ef4444' : t.inputBorder}`,
    borderRadius    : 10,
    padding         : '10px 14px',
    fontSize        : 14,
    color           : departmentId ? t.inputText : t.textSecondary,
    outline         : 'none',
    boxSizing       : 'border-box' as const,
    fontFamily      : t.fontFamily,
    cursor          : isView ? 'not-allowed' : 'pointer',
    opacity         : isView ? 0.85 : 1,
    appearance      : 'none' as const,
    WebkitAppearance: 'none' as const,
    backgroundImage : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat  : 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight      : 36,
  });

  if (loadingData || deptLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <p style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 28 }}>

        {/* ── Field grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

          {/* Designation Name */}
          <Field label="Designation Name" required={!isView} t={t} error={errors.name}>
            <input
              type="text"
              placeholder="Enter designation name"
              value={name}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => { if (!isView) { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); } }}
              onBlur={() => !isView && handleBlurName()}
              style={fieldStyle(!!errors.name)}
            />
          </Field>

          {/* Select Department */}
          <Field label="Select Department" required={!isView} t={t} error={errors.department_id}>
            {isView ? (
              /* View mode — show department name as plain read-only input */
              <input
                type="text"
                readOnly
                disabled
                value={departments.find((d) => d.id === departmentId)?.name ?? departmentId ?? '—'}
                style={fieldStyle()}
              />
            ) : (
              <select
                value={departmentId}
                disabled={isView}
                onChange={(e) => { setDepartmentId(e.target.value); setErrors((p) => ({ ...p, department_id: undefined })); }}
                onBlur={handleBlurDept}
                style={selectStyle(!!errors.department_id)}
              >
                <option value="" disabled style={{ color: t.textSecondary }}>
                  — Select Department —
                </option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id} style={{ background: t.inputBg, color: t.inputText }}>
                    {dept.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

        </div>

        {/* ── Buttons ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8 }}>

          <button
            onClick={() => navigate('/admin/masters/designation')}
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

export default DesignationCrudPage;
