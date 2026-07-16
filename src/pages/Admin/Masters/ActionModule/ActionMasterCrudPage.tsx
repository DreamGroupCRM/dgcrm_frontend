// src/pages/Admin/Masters/ActionModule/ActionMasterCrudPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme, AppTheme } from '../../../../styles/theme';
import { fetchActionMasterById, createActionMaster, updateActionMaster } from '../../../../services/actionMasterService';

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

type Mode = 'add' | 'edit' | 'view';
interface Props { mode: Mode; }

interface FormErrors {
  name?: string;
}

const PAGE_TITLES: Record<Mode, string> = {
  add : 'Add Action',
  edit: 'Edit Action',
  view: 'View Action',
};

const ActionMasterCrudPage: React.FC<Props> = ({ mode }) => {
  const dispatch         = useAppDispatch();
  const navigate         = useNavigate();
  const { id }           = useParams<{ id: string }>();
  const { mode: uiMode } = useAppSelector((s) => s.theme);
  const isDark           = uiMode === 'dark';
  const t                = getTheme(isDark);

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const [name, setName]               = useState('');
  const [code, setCode]               = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive]       = useState(true);
  const [errors, setErrors]           = useState<FormErrors>({});

  const [saving, setSaving]           = useState(false);
  const [loadingData, setLoadingData] = useState(mode !== 'add');

  useEffect(() => { dispatch(setPageTitle(PAGE_TITLES[mode])); }, [dispatch, mode]);

  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      try {
        const res = await fetchActionMasterById(id);
        if (res.success && res.data) {
          setName(res.data.name ?? '');
          setCode(res.data.code ?? '');
          setDescription(res.data.description ?? '');
          setIsActive(res.data.is_active ?? true);
        } else {
          toast.error('Failed to load action');
          navigate('/admin/masters/action-module');
        }
      } catch (e) {
        toast.error('Failed to load action data');
        navigate('/admin/masters/action-module');
      } finally {
        setLoadingData(false);
      }
    })();
  }, [mode, id]);

  const validateAll = (): FormErrors => {
    const e: FormErrors = {};
    if (!name.trim()) e.name = 'Action name is required.';
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
        name       : name.trim(),
        code       : code.trim() || undefined,
        description: description.trim() || undefined,
      };

      const res = isEdit
        ? await updateActionMaster(id!, { ...payload, is_active: isActive })
        : await createActionMaster(payload);

      if (res.success) {
        toast.success(isEdit ? 'Action Updated Successfully' : 'Action Created Successfully', { autoClose: 1000 });
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

          <Field label="Action Name" required={!isView} t={t} error={errors.name}>
            <input type="text" placeholder="e.g. View, Create, Delete"
              value={name} readOnly={isView} disabled={isView}
              onChange={(e) => { if (!isView) { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); } }}
              onBlur={() => !isView && handleBlurName()}
              style={fieldStyle(!!errors.name)} />
          </Field>

          <Field label="Code" t={t}>
            <input type="text" placeholder="e.g. view, create, delete"
              value={code} readOnly={isView} disabled={isView}
              onChange={(e) => !isView && setCode(e.target.value)}
              style={fieldStyle()} />
          </Field>

          <Field label="Description" t={t}>
            <input type="text" placeholder="e.g. Allows viewing records"
              value={description} readOnly={isView} disabled={isView}
              onChange={(e) => !isView && setDescription(e.target.value)}
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

export default ActionMasterCrudPage;
