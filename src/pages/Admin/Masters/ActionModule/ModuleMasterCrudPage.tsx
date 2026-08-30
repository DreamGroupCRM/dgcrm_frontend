// src/pages/Admin/Masters/ActionModule/ModuleMasterCrudPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack } from 'react-icons/md';
import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { FormField, getFormLabelStyle, getFormInputStyle } from '../../../../components/common/MasterListUI';
import { fetchModuleMasterById, createModuleMaster, updateModuleMaster } from '../../../../services/moduleMasterService';

interface FieldProps {
  label    : string;
  required?: boolean;
  error?   : string;
  t        : AppTheme;
  children : React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, required, error, t, children }) => (
  <FormField
    label={label} t={t} required={required} error={error}
    labelStyle={getFormLabelStyle(t, { fontWeight: 700, fontSize: 12.5, marginBottom: 6, color: t.textPrimary })}
    errorStyle={{ color: '#ef4444', fontSize: 11.5, marginTop: 4, fontFamily: t.fontFamily }}
  >
    {children}
  </FormField>
);

type Mode = 'add' | 'edit' | 'view';
interface Props { mode: Mode; }

interface FormErrors {
  name?: string;
}

const PAGE_TITLES: Record<Mode, string> = {
  add : 'Add Module',
  edit: 'Edit Module',
  view: 'View Module',
};

const ModuleMasterCrudPage: React.FC<Props> = ({ mode }) => {
  const dispatch         = useAppDispatch();
  const navigate         = useNavigate();
  const { id }           = useParams<{ id: string }>();
  const { isDark, t } = useAppearanceTokens();

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const [name, setName]           = useState('');
  const [slug, setSlug]           = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive]   = useState(true);
  const [errors, setErrors]       = useState<FormErrors>({});

  const [saving, setSaving]           = useState(false);
  const [loadingData, setLoadingData] = useState(mode !== 'add');

  useEffect(() => { dispatch(setPageTitle(PAGE_TITLES[mode])); }, [dispatch, mode]);

  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      try {
        const res = await fetchModuleMasterById(id);
        if (res.success && res.data) {
          const d = res.data;
          setName(String(d.m_name ?? d.name ?? ''));
          setSlug(String(d.m_slug ?? ''));
          setSortOrder(String(d.m_sort_order ?? '0'));
          setIsActive(d.m_is_active ?? true);
        } else {
          toast.error('Failed to load module');
          navigate('/admin/masters/action-module');
        }
      } catch (e) {
        toast.error('Failed to load module data');
        navigate('/admin/masters/action-module');
      } finally {
        setLoadingData(false);
      }
    })();
  }, [mode, id]);

  const validateAll = (): FormErrors => {
    const e: FormErrors = {};
    if (!name.trim()) e.name = 'Module name is required.';
    return e;
  };

  const handleBlurName = () => setErrors((p) => ({ ...p, name: validateAll().name }));

  const isMandatoryValid = name.trim() !== '';

  const handleSubmit = async () => {
    const errs = validateAll();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        name      : name.trim(),
        slug      : slug.trim() || undefined,
        sort_order: Number(sortOrder) || 0,
      };

      const res = isEdit
        ? await updateModuleMaster(id!, { ...payload, is_active: isActive })
        : await createModuleMaster(payload);

      if (res.success) {
        toast.success(isEdit ? 'Module Updated Successfully' : 'Module Created Successfully', { autoClose: 1000 });
        navigate('/admin/masters/action-module');
      } else {
        toast.error(res.message || 'Operation failed');
      }
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = (hasError?: boolean): React.CSSProperties => getFormInputStyle(t, {
    background  : isView ? t.insetBg : t.inputBg,
    border      : `1px solid ${hasError ? '#ef4444' : t.inputBorder}`,
    borderRadius: 10,
    padding     : '10px 14px',
    fontSize    : 14,
    outline     : 'none',
    fontFamily  : t.fontFamily,
    cursor      : isView ? 'not-allowed' : 'text',
    opacity     : isView ? 0.85 : 1,
  });

  if (loadingData) {
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

          <Field label="Module Name" required={!isView} t={t} error={errors.name}>
            <input type="text" placeholder="e.g. Leads, Employees"
              value={name} readOnly={isView} disabled={isView}
              onChange={(e) => { if (!isView) { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); } }}
              onBlur={() => !isView && handleBlurName()}
              style={fieldStyle(!!errors.name)} />
          </Field>

          <Field label="Description" t={t}>
            <input type="text" placeholder="e.g. leads, employees"
              value={slug} readOnly={isView} disabled={isView}
              onChange={(e) => !isView && setSlug(e.target.value)}
              style={fieldStyle()} />
          </Field>

          <Field label="Sort Order" t={t}>
            <input type="text" inputMode="numeric" placeholder="0"
              value={sortOrder} readOnly={isView} disabled={isView}
              onChange={(e) => { if (!isView && /^\d*$/.test(e.target.value)) setSortOrder(e.target.value); }}
              style={fieldStyle()} />
          </Field>

        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <button
            onClick={() => navigate('/admin/masters/action-module')}
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
                background: !isMandatoryValid || saving ? '#6b7280' : 'linear-gradient(135deg,#d97706,#f59e0b)',
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

export default ModuleMasterCrudPage;
