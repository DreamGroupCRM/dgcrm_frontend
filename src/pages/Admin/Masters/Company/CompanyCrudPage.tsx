// ==========================================
// DREAM GROUP CRM - COMPANY ADD / EDIT / VIEW PAGE
// ==========================================
// Single file handles all 3 modes via the `mode` prop:
//   'add'  → empty form, Create button
//   'edit' → pre-filled form, Update button
//   'view' → pre-filled form, all inputs disabled, Go Back only
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack, MdBusiness, MdClose } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { AppTheme } from '../../../../styles/theme';
import { companyService, CompanyPayload } from '../../../../services/companyService';
import { Company } from '../../../../types';
import { ROUTES, VALIDATION } from '../../../../constants';

// ── Module-level Field — NEVER define this inside the component ────────────────
// Defining it inside causes React to create a new component type every render
// → input unmounts/remounts on every keystroke → cursor disappears.
interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  t: AppTheme;
  children: React.ReactNode;
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
      <p style={{ color: '#ef4444', fontSize: 14, marginTop: 4, fontFamily: t.fontFamily }}>
        {error}
      </p>
    )}
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'add' | 'edit' | 'view';
interface Props { mode: Mode; }

interface FormState {
  name: string;
  email: string;
  phone: string;
  whatsapp_number: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  pan: string;
  gst: string;
  company_code: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  whatsapp_number?: string;
  city?: string;
  state?: string;
  country?: string;
}

const ALPHA_REGEX = /^[a-zA-Z\s]*$/;
const NUMERIC_REGEX = /^\d*$/;

const empty: FormState = {
  name: '', email: '', phone: '', whatsapp_number: '',
  city: '', state: '', country: '', pincode: '', pan: '', gst: '', company_code: '',
};

const fromCompany = (d: Company): FormState => ({
  name: d.name ?? '',
  email: d.email ?? '',
  phone: d.phone === 'string' ? '' : (d.phone ?? ''),
  whatsapp_number: d.whatsapp_number ?? '',
  city: d.city ?? '',
  state: d.state ?? '',
  country: d.country ?? '',
  pincode: d.pincode ?? '',
  pan: d.pan ?? '',
  gst: d.gst ?? '',
  company_code: d.company_code ?? '',
});

const PAGE_TITLES: Record<Mode, string> = {
  add: 'Add Company',
  edit: 'Edit Company',
  view: 'View Company',
};

const CompanyCrudPage: React.FC<Props> = ({ mode }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { mode: uiMode } = useAppSelector((s) => s.theme);
  const isDark = uiMode === 'dark';
  const t = getTheme(isDark);

  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isAdd = mode === 'add';

  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<FormErrors>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(!isAdd);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { dispatch(setPageTitle(PAGE_TITLES[mode])); }, [dispatch, mode]);

  // ── Load data (edit & view) ────────────────────────────────────────────────
  useEffect(() => {
    if (isAdd || !id) return;
    (async () => {
      try {
        const res = await companyService.getById(id);
        if (res.success && res.data) {
          setForm(fromCompany(res.data));
          if (res.data.logo_url && res.data.logo_url !== 'string') {
            setExistingLogoUrl(res.data.logo_url);
          }
        } else {
          toast.error(res.message || 'Failed to load company');
        }
      } catch {
        toast.error('Failed to load company data');
      } finally {
        setLoadingData(false);
      }
    })();
  }, [isAdd, id]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validateAll = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Company name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!VALIDATION.EMAIL_REGEX.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.phone.trim()) e.phone = 'Phone number is required.';
    else if (!/^\d{10}$/.test(form.phone)) e.phone = 'Phone must be exactly 10 digits.';
    if (form.whatsapp_number && !/^\d{10}$/.test(form.whatsapp_number))
      e.whatsapp_number = 'WhatsApp must be exactly 10 digits.';
    if (form.city && !ALPHA_REGEX.test(form.city)) e.city = 'City must contain letters only.';
    if (form.state && !ALPHA_REGEX.test(form.state)) e.state = 'State must contain letters only.';
    if (form.country && !ALPHA_REGEX.test(form.country)) e.country = 'Country must contain letters only.';
    return e;
  };

  // Shows error as soon as user leaves the field — not just on submit
  const handleBlur = (field: keyof FormErrors) => {
    const errs = validateAll();
    setErrors((prev) => ({ ...prev, [field]: errs[field] }));
  };

  const isMandatoryValid =
    form.name.trim() !== '' &&
    VALIDATION.EMAIL_REGEX.test(form.email) &&
    /^\d{10}$/.test(form.phone);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoFile(e.target.files?.[0] ?? null);
  };



  // ── Submit ────────────────────────────────────────────────────────────────
  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validateAll();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const fields: Record<string, string | boolean> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        is_active: true,
        company_code: form.company_code,
        whatsapp_number: form.whatsapp_number,
        city: form.city,
        state: form.state,
        country: form.country,
        pincode: form.pincode,
        pan: form.pan,
        gst: form.gst,
      };

      let payload: CompanyPayload | FormData;

      if (logoFile) {
        const fd = new FormData();
        Object.entries(fields).forEach(([key, value]) => fd.append(key, String(value)));
        fd.append('logo', logoFile);
        payload = fd;
      } else {
        payload = { ...fields, logo_url: existingLogoUrl } as CompanyPayload;
      }

      const res = isEdit
        ? await companyService.update(id!, payload)
        : await companyService.create(payload);

      if (res.success) {
        toast.success(
          isEdit ? 'Company Updated Successfully' : 'Company Created Successfully',
          { autoClose: 1000 }
        );
        navigate(ROUTES.ADMIN.COMPANY);
      } else {
        toast.error(res.message || 'Operation failed');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Field style ────────────────────────────────────────────────────────────
  const fieldStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%',
    background: isView ? t.insetBg : t.inputBg,
    border: `1px solid ${hasError ? '#ef4444' : t.inputBorder}`,
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    color: t.inputText,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: t.fontFamily,
    cursor: isView ? 'not-allowed' : 'text',
    opacity: isView ? 0.85 : 1,
  });

  if (loadingData) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <p style={{ color: t.textPrimary, fontFamily: t.fontFamily }}>Loading company data...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div style={{
        background: t.surfaceBg,
        border: `1px solid ${t.surfaceBorder}`,
        borderRadius: 14,
        padding: 28,
      }}>

        {/* ── Field grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">

          <Field label="Company Name" required={!isView} t={t} error={errors.name}>
            <input
              type="text"
              placeholder="Enter company name"
              value={form.name}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => !isView && handleChange('name', e.target.value)}
              onBlur={() => !isView && handleBlur('name')}
              style={fieldStyle(!!errors.name)}
            />
          </Field>

          <Field label="Email" required={!isView} t={t} error={errors.email}>
            <input
              type="email"
              placeholder="Enter email address"
              value={form.email}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => !isView && handleChange('email', e.target.value)}
              onBlur={() => !isView && handleBlur('email')}
              style={fieldStyle(!!errors.email)}
            />
          </Field>

          <Field label="Phone" required={!isView} t={t} error={errors.phone}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter 10-digit phone number"
              value={form.phone}
              readOnly={isView}
              disabled={isView}
              maxLength={10}
              onChange={(e) => {
                if (!isView && NUMERIC_REGEX.test(e.target.value))
                  handleChange('phone', e.target.value);
              }}
              onBlur={() => !isView && handleBlur('phone')}
              style={fieldStyle(!!errors.phone)}
            />
          </Field>

          <Field label="WhatsApp Number" t={t} error={errors.whatsapp_number}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter 10-digit WhatsApp number"
              value={form.whatsapp_number}
              readOnly={isView}
              disabled={isView}
              maxLength={10}
              onChange={(e) => {
                if (!isView && NUMERIC_REGEX.test(e.target.value))
                  handleChange('whatsapp_number', e.target.value);
              }}
              onBlur={() => !isView && handleBlur('whatsapp_number')}
              style={fieldStyle(!!errors.whatsapp_number)}
            />
          </Field>

          <Field label="City" t={t} error={errors.city}>
            <input
              type="text"
              placeholder="Enter city"
              value={form.city}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => {
                if (!isView && ALPHA_REGEX.test(e.target.value))
                  handleChange('city', e.target.value);
              }}
              onBlur={() => !isView && handleBlur('city')}
              style={fieldStyle(!!errors.city)}
            />
          </Field>

          <Field label="State" t={t} error={errors.state}>
            <input
              type="text"
              placeholder="Enter state"
              value={form.state}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => {
                if (!isView && ALPHA_REGEX.test(e.target.value))
                  handleChange('state', e.target.value);
              }}
              onBlur={() => !isView && handleBlur('state')}
              style={fieldStyle(!!errors.state)}
            />
          </Field>

          <Field label="Country" t={t} error={errors.country}>
            <input
              type="text"
              placeholder="Enter country"
              value={form.country}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => {
                if (!isView && ALPHA_REGEX.test(e.target.value))
                  handleChange('country', e.target.value);
              }}
              onBlur={() => !isView && handleBlur('country')}
              style={fieldStyle(!!errors.country)}
            />
          </Field>

          <Field label="Pincode" t={t}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter pincode"
              value={form.pincode}
              readOnly={isView}
              disabled={isView}
              maxLength={10}
              onChange={(e) => {
                if (!isView && NUMERIC_REGEX.test(e.target.value))
                  handleChange('pincode', e.target.value);
              }}
              style={fieldStyle()}
            />
          </Field>

          <Field label="PAN" t={t}>
            <input
              type="text"
              placeholder="Enter PAN number"
              value={form.pan}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => !isView && handleChange('pan', e.target.value.toUpperCase())}
              style={fieldStyle()}
            />
          </Field>

          <Field label="GST" t={t}>
            <input
              type="text"
              placeholder="Enter GST number"
              value={form.gst}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => !isView && handleChange('gst', e.target.value.toUpperCase())}
              style={fieldStyle()}
            />
          </Field>

          <Field label="Company Code" t={t}>
            <input
              type="text"
              placeholder="Enter company code"
              value={form.company_code}
              readOnly={isView}
              disabled={isView}
              onChange={(e) => !isView && handleChange('company_code', e.target.value)}
              style={fieldStyle()}
            />
          </Field>

          {/* ── Logo ── */}
          <Field label="Company Logo" t={t}>
            {isView ? (
              /* View mode: thumbnail + path */
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}
                >
                  {existingLogoUrl ? (
                    <img src={existingLogoUrl} alt="logo" className="w-full h-full object-contain" />
                  ) : (
                    <MdBusiness size={20} style={{ color: '#2563eb' }} />
                  )}
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={existingLogoUrl || 'No logo uploaded'}
                  style={{ ...fieldStyle(), flex: 1 }}
                />
              </div>
            ) : (
              /* Add / Edit mode: file picker styled like other fields */
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: t.inputBg,
                border: `1px solid ${t.inputBorder}`,
                borderRadius: 10,
                padding: '6px 10px 6px 6px',
                boxSizing: 'border-box',
                width: '100%',
              }}>
                {/* Choose File button — sits inside the field box */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    flexShrink: 0,
                    background: t.insetBg,
                    border: `1px solid ${t.inputBorder}`,
                    borderRadius: 7,
                    padding: '5px 12px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: t.textSecondary,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontFamily: t.fontFamily,
                    lineHeight: '20px',
                  }}
                >
                  Choose File
                </button>

                {/* Filename text — fills remaining space */}
                <span style={{
                  flex: 1,
                  fontSize: 14,
                  color: logoFile ? t.textPrimary : t.textSecondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: t.fontFamily,
                }}>
                  {logoFile
                    ? logoFile.name
                    : existingLogoUrl
                      ? `Current: ${existingLogoUrl.split('/').pop()}`
                      : 'No file chosen'}
                </span>

                {/* ✕ cancel — only when a new file is selected */}
                {logoFile && (
                  <button
                    type="button"
                    title="Remove selected file"
                    onClick={() => {
                      setLogoFile(null);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                    style={{
                      flexShrink: 0,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: t.textSecondary,
                      display: 'flex',
                      alignItems: 'center',
                      padding: 2,
                      borderRadius: 4,
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = t.textSecondary)}
                  >
                    <MdClose size={17} />
                  </button>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFilePick}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </Field>

        </div>

        {/* ── Buttons — centered, Go Back left, Create/Update right ── */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8 }}>

          <button
            onClick={() => navigate(ROUTES.ADMIN.COMPANY)}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: t.btnSecondaryBg,
              color: t.btnSecondaryText,
              border: `1px solid ${t.surfaceBorder}`,
              cursor: 'pointer',
            }}
          >
            <MdArrowBack size={16} /> Go Back
          </button>

          {!isView && (
            <button
              onClick={handleSubmit}
              disabled={!isMandatoryValid || saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{
                background: !isMandatoryValid || saving
                  ? '#6b7280'
                  : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                border: 'none',
                cursor: !isMandatoryValid || saving ? 'not-allowed' : 'pointer',
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

export default CompanyCrudPage;