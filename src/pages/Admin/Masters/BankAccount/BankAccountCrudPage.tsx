// src/pages/masters/BankAccountCrudPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme, AppTheme } from '../../../../styles/theme';
import {
  fetchBankAccountById,
  createBankAccount,
  updateBankAccount,
} from '../../../../services/bankAccountService';

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

interface FormState {
  name          : string;
  account_number: string;
  branch_name   : string;
  ifsc_code     : string;
}

interface FormErrors {
  name?          : string;
  account_number?: string;
  branch_name?   : string;
  ifsc_code?     : string;
}

const empty: FormState = { name: '', account_number: '', branch_name: '', ifsc_code: '' };

const PAGE_TITLES: Record<Mode, string> = {
  add : 'Add Bank A/C',
  edit: 'Edit Bank A/C',
  view: 'View Bank A/C',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const BankAccountCrudPage: React.FC<Props> = ({ mode }) => {
  const dispatch         = useAppDispatch();
  const navigate         = useNavigate();
  const { id }           = useParams<{ id: string }>();
  const { mode: uiMode } = useAppSelector((s) => s.theme);
  const isDark           = uiMode === 'dark';
  const t                = getTheme(isDark);

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const [form, setForm]           = useState<FormState>(empty);
  const [errors, setErrors]       = useState<FormErrors>({});
  const [isActive, setIsActive]   = useState(true);
  const [saving, setSaving]       = useState(false);
  const [loadingData, setLoading] = useState(mode !== 'add');

  useEffect(() => { dispatch(setPageTitle(PAGE_TITLES[mode])); }, [dispatch, mode]);

  // ── Load for edit / view ───────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      try {
        const res = await fetchBankAccountById(id);
        if (res.success && res.data) {
          setForm({
            name          : res.data.name           ?? '',
            account_number: res.data.account_number ?? '',
            branch_name   : res.data.branch_name    ?? '',
            ifsc_code     : res.data.ifsc_code      ?? '',
          });
          setIsActive(res.data.is_active ?? true);
        } else {
          toast.error('Failed to load bank account');
          navigate('/admin/masters/bank-account');
        }
      } catch (e) {
        toast.error('Failed to load bank account data');
        navigate('/admin/masters/bank-account');
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, id]);

  // ── Validation ─────────────────────────────────────────────────────────
  const validateAll = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.name.trim())           e.name           = 'Bank name is required.';
    if (!form.account_number.trim()) e.account_number = 'Account number is required.';
    if (!form.branch_name.trim())    e.branch_name    = 'Branch name is required.';
    if (!form.ifsc_code.trim())      e.ifsc_code      = 'IFSC code is required.';
    return e;
  };

  const handleBlur = (field: keyof FormErrors) => {
    const errs = validateAll();
    setErrors((prev) => ({ ...prev, [field]: errs[field] }));
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const isMandatoryValid =
    form.name.trim() !== '' &&
    form.account_number.trim() !== '' &&
    form.branch_name.trim() !== '' &&
    form.ifsc_code.trim() !== '';

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validateAll();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        name          : form.name.trim(),
        account_number: form.account_number.trim(),
        branch_name   : form.branch_name.trim(),
        ifsc_code     : form.ifsc_code.trim().toUpperCase(),
        is_active     : isActive,
        sort_order    : 0,
      };

      const res = isEdit
        ? await updateBankAccount(id!, payload)
        : await createBankAccount(payload);

      if (res.success) {
        toast.success(
          isEdit ? 'Bank Account Updated Successfully' : 'Bank Account Created Successfully',
          { autoClose: 1000 }
        );
        navigate('/admin/masters/bank-account');
      } else {
        toast.error(res.message || 'Operation failed');
      }
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Field style ────────────────────────────────────────────────────────
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
        <p style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>Loading bank account data...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 28 }}>

        {/* ── Field grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

          {/* Bank Name */}
          <Field label="Bank Name" required={!isView} t={t} error={errors.name}>
            <input
              type="text"
              placeholder="Enter bank name"
              value={form.name}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => !isView && handleChange('name', e.target.value)}
              onBlur={() => !isView && handleBlur('name')}
              style={fieldStyle(!!errors.name)}
            />
          </Field>

          {/* Bank Account Number */}
          <Field label="Bank Account Number" required={!isView} t={t} error={errors.account_number}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter bank account number"
              value={form.account_number}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => !isView && handleChange('account_number', e.target.value)}
              onBlur={() => !isView && handleBlur('account_number')}
              style={fieldStyle(!!errors.account_number)}
            />
          </Field>

          {/* Branch Name */}
          <Field label="Branch Name" required={!isView} t={t} error={errors.branch_name}>
            <input
              type="text"
              placeholder="Enter branch name"
              value={form.branch_name}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => !isView && handleChange('branch_name', e.target.value)}
              onBlur={() => !isView && handleBlur('branch_name')}
              style={fieldStyle(!!errors.branch_name)}
            />
          </Field>

          {/* IFSC Code */}
          <Field label="Bank IFSC Code" required={!isView} t={t} error={errors.ifsc_code}>
            <input
              type="text"
              placeholder="Enter IFSC code"
              value={form.ifsc_code}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => !isView && handleChange('ifsc_code', e.target.value.toUpperCase())}
              onBlur={() => !isView && handleBlur('ifsc_code')}
              style={fieldStyle(!!errors.ifsc_code)}
            />
          </Field>

        </div>

        {/* ── Buttons ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8 }}>

          <button
            onClick={() => navigate('/admin/masters/bank-account')}
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

export default BankAccountCrudPage;
