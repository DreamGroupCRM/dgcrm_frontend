// src/pages/Admin/Masters/BankAccount/BankAccountCrudPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme, AppTheme } from '../../../../styles/theme';
import { showAlert } from '../../../../utils';
import {
  ViewBankAccount,
  CreateBankAccount,
  UpdateBankAccount,
} from '../../../../services/bankAccountService';
import axiosInstance from '../../../../services/axiosConfig';

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
      display: 'block', fontWeight: 700, fontSize: 12.5,
      marginBottom: 6, color: t.textPrimary, fontFamily: t.fontFamily,
    }}>
      {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {error && (
      <p style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4, fontFamily: t.fontFamily }}>
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

interface Company {
  id  : string;
  name: string;
}

interface FormState {
  company_id          : string;
  name                : string;
  account_holder_name : string;
  account_number      : string;
  branch_name         : string;
  ifsc_code           : string;
}

interface FormErrors {
  company_id?         : string;
  name?               : string;
  account_holder_name?: string;
  account_number?     : string;
  branch_name?        : string;
  ifsc_code?          : string;
}

const empty: FormState = {
  company_id: '', name: '', account_holder_name: '',
  account_number: '', branch_name: '', ifsc_code: '',
};

// Sticky footer height — same value/pattern as the other masters'
// FOOTER_HEIGHT, so Go Back/Create are always reachable without scrolling.
const FOOTER_HEIGHT = 76;

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

  // ── companies dropdown ─────────────────────────────────────────────────
  const [companies, setCompanies]       = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  useEffect(() => { dispatch(setPageTitle(PAGE_TITLES[mode])); }, [dispatch, mode]);

  // ── fetch companies on mount (all modes) ───────────────────────────────
  useEffect(() => {
    (async () => {
      setCompaniesLoading(true);
      try {
        const res = await axiosInstance.get('/company', {
          params: { is_active: true, page: 1, limit: 1000 },
        });
        console.log('[BankAccountCrudPage] fetchCompanies response:', res.data);
        if (res.data?.success) {
          setCompanies(res.data.rows ?? []);
        } else {
          toast.error('Failed to load companies');
        }
      } catch (e) {
        toast.error('Failed to load companies. Please try again.');
      } finally {
        setCompaniesLoading(false);
      }
    })();
  }, []);

  // ── load bank data for edit / view ─────────────────────────────────────
  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      try {
        const res = await ViewBankAccount(id);
        if (res.success && res.data) {
          setForm({
            company_id          : String(res.data.company_id ?? ''),
            name                : res.data.name                ?? '',
            account_holder_name : res.data.account_holder_name ?? '',
            account_number      : res.data.account_number      ?? '',
            branch_name         : res.data.branch_name         ?? '',
            ifsc_code           : res.data.ifsc_code           ?? '',
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

  // ── validation ─────────────────────────────────────────────────────────
  const validateAll = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.company_id)                e.company_id          = 'Please select a company.';
    if (!form.name.trim())               e.name                = 'Bank name is required.';
    if (!form.account_holder_name.trim()) e.account_holder_name = 'Account holder name is required.';
    if (!form.account_number.trim())     e.account_number      = 'Account number is required.';
    if (!form.branch_name.trim())        e.branch_name         = 'Branch name is required.';
    if (!form.ifsc_code.trim())          e.ifsc_code           = 'IFSC code is required.';
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
    form.company_id !== '' &&
    form.name.trim() !== '' &&
    form.account_holder_name.trim() !== '' &&
    form.account_number.trim() !== '' &&
    form.branch_name.trim() !== '' &&
    form.ifsc_code.trim() !== '';

  // ── submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validateAll();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        company_id          : form.company_id,
        name                : form.name.trim(),
        account_holder_name : form.account_holder_name.trim(),
        account_number      : form.account_number.trim(),
        branch_name         : form.branch_name.trim(),
        ifsc_code           : form.ifsc_code.trim().toUpperCase(),
        is_active           : isActive,
        sort_order          : 0,
      };

      const res = isEdit
        ? await UpdateBankAccount(id!, payload)
        : await CreateBankAccount(payload);

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
      // Backend duplicate-entry check (account number) throws a 409 with a
      // specific message — surface it via SweetAlert as required, instead
      // of the generic toast fallback below.
      const status = (e as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 409 && message) {
        showAlert.error(message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
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
    color             : form.company_id ? t.inputText : t.textSecondary,
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

  if (loadingData || companiesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <p style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 40 }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 28 }}>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

          {/* Company Name */}
          <Field label="Company Name" required={!isView} t={t} error={errors.company_id}>
            {isView ? (
              <input type="text" readOnly disabled
                value={companies.find((c) => String(c.id) === String(form.company_id))?.name ?? form.company_id ?? '—'}
                style={fieldStyle()} />
            ) : (
              <select
                value={form.company_id}
                onChange={(e) => { handleChange('company_id', e.target.value); }}
                onBlur={() => handleBlur('company_id')}
                style={selectStyle(!!errors.company_id)}
              >
                <option value="" disabled style={{ color: t.textSecondary }}>— Select Company —</option>
                {companies.map((c) => (
                  <option key={c.id} value={String(c.id)} style={{ background: t.inputBg, color: t.inputText }}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {/* Bank Name */}
          <Field label="Bank Name" required={!isView} t={t} error={errors.name}>
            <input type="text" placeholder="Enter bank name"
              value={form.name} readOnly={isView} disabled={isView}
              onChange={(e) => !isView && handleChange('name', e.target.value)}
              onBlur={() => !isView && handleBlur('name')}
              style={fieldStyle(!!errors.name)} />
          </Field>

          {/* Account Holder Name */}
          <Field label="Bank Account Holder Name" required={!isView} t={t} error={errors.account_holder_name}>
            <input type="text" placeholder="Enter account holder name"
              value={form.account_holder_name} readOnly={isView} disabled={isView}
              onChange={(e) => !isView && handleChange('account_holder_name', e.target.value)}
              onBlur={() => !isView && handleBlur('account_holder_name')}
              style={fieldStyle(!!errors.account_holder_name)} />
          </Field>

          {/* Bank Account Number */}
          <Field label="Bank Account Number" required={!isView} t={t} error={errors.account_number}>
            <input type="text" inputMode="numeric" placeholder="Enter bank account number"
              value={form.account_number} readOnly={isView} disabled={isView}
              onChange={(e) => !isView && handleChange('account_number', e.target.value)}
              onBlur={() => !isView && handleBlur('account_number')}
              style={fieldStyle(!!errors.account_number)} />
          </Field>

          {/* Branch Name */}
          <Field label="Branch Name" required={!isView} t={t} error={errors.branch_name}>
            <input type="text" placeholder="Enter branch name"
              value={form.branch_name} readOnly={isView} disabled={isView}
              onChange={(e) => !isView && handleChange('branch_name', e.target.value)}
              onBlur={() => !isView && handleBlur('branch_name')}
              style={fieldStyle(!!errors.branch_name)} />
          </Field>

          {/* IFSC Code */}
          <Field label="Bank IFSC Code" required={!isView} t={t} error={errors.ifsc_code}>
            <input type="text" placeholder="Enter IFSC code"
              value={form.ifsc_code} readOnly={isView} disabled={isView}
              onChange={(e) => !isView && handleChange('ifsc_code', e.target.value.toUpperCase())}
              onBlur={() => !isView && handleBlur('ifsc_code')}
              style={fieldStyle(!!errors.ifsc_code)} />
          </Field>

        </div>

      </div>

      {/* ── Buttons — fixed to the viewport bottom, always visible, both
          centered (same pattern as every other master's crud footer). ── */}
      <div
        className="master-crud-footer flex items-center justify-center flex-wrap gap-3"
        style={{ background: t.surfaceBg, borderColor: t.surfaceBorder }}
      >
          <button onClick={() => navigate('/admin/masters/bank-account')} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}>
            <MdArrowBack size={16} /> Go Back
          </button>

          {!isView && (
            <button onClick={handleSubmit} disabled={!isMandatoryValid || saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{
                background: !isMandatoryValid || saving ? '#6b7280' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                border: 'none',
                cursor: !isMandatoryValid || saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          )}
      </div>
    </div>
  );
};

export default BankAccountCrudPage;
