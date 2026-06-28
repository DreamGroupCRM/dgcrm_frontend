// ==========================================
// DREAM GROUP CRM - COMPANY ADD / EDIT PAGE
// ==========================================
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { AppTheme } from '../../../../styles/theme';
import { companyService } from '../../../../services/companyService';
import { ROUTES, VALIDATION } from '../../../../constants';

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL: Field is at MODULE LEVEL — not inside CompanyFormPage.
// If defined inside the parent, React creates a new component type on every
// render → unmounts/remounts the input on every keystroke → cursor disappears.
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
    <label style={{ display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 6, color: t.textPrimary, fontFamily: t.fontFamily }}>
      {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, fontFamily: t.fontFamily }}>{error}</p>}
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────

interface Props { mode: 'add' | 'edit'; }

interface FormState {
  name            : string;
  email           : string;
  phone           : string;
  whatsapp_number : string;
  city            : string;
  state           : string;
  country         : string;
  pincode         : string;
  pan             : string;
  gst             : string;
  company_code    : string;
}

interface FormErrors {
  name?           : string;
  email?          : string;
  phone?          : string;
  whatsapp_number?: string;
  city?           : string;
  state?          : string;
  country?        : string;
}

const ALPHA_REGEX   = /^[a-zA-Z\s]*$/;
const NUMERIC_REGEX = /^\d*$/;

const empty: FormState = {
  name: '', email: '', phone: '', whatsapp_number: '',
  city: '', state: '', country: '', pincode: '', pan: '', gst: '', company_code: '',
};

const CompanyFormPage: React.FC<Props> = ({ mode }) => {
  const dispatch         = useAppDispatch();
  const navigate         = useNavigate();
  const { id }           = useParams<{ id: string }>();
  const { mode: uiMode } = useAppSelector((s) => s.theme);
  const isDark           = uiMode === 'dark';
  const t                = getTheme(isDark);
  const isEdit           = mode === 'edit';

  const [form, setForm]               = useState<FormState>(empty);
  const [errors, setErrors]           = useState<FormErrors>({});
  const [logoFile, setLogoFile]       = useState<File | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string>('');
  const [saving, setSaving]           = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const fileRef                       = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(setPageTitle(isEdit ? 'Edit Company' : 'Add Company'));
  }, [dispatch, isEdit]);

  // ── Load data for edit ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      try {
        const res = await companyService.getById(id);
        if (res.success && res.data) {
          const d = res.data;
          setForm({
            name            : d.name            ?? '',
            email           : d.email           ?? '',
            phone           : d.phone === 'string' ? '' : (d.phone ?? ''),
            whatsapp_number : d.whatsapp_number ?? '',
            city            : d.city            ?? '',
            state           : d.state           ?? '',
            country         : d.country         ?? '',
            pincode         : d.pincode         ?? '',
            pan             : d.pan             ?? '',
            gst             : d.gst             ?? '',
            company_code    : d.company_code    ?? '',
          });
          if (d.logo_url && d.logo_url !== 'string') {
            setExistingLogoUrl(d.logo_url);
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
  }, [isEdit, id]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.name.trim())  e.name  = 'Company name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!VALIDATION.EMAIL_REGEX.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.phone.trim()) e.phone = 'Phone number is required.';
    else if (!/^\d{10}$/.test(form.phone)) e.phone = 'Phone must be exactly 10 digits.';
    if (form.whatsapp_number && !/^\d{10}$/.test(form.whatsapp_number))
      e.whatsapp_number = 'WhatsApp must be exactly 10 digits.';
    if (form.city    && !ALPHA_REGEX.test(form.city))    e.city    = 'City must contain letters only.';
    if (form.state   && !ALPHA_REGEX.test(form.state))   e.state   = 'State must contain letters only.';
    if (form.country && !ALPHA_REGEX.test(form.country)) e.country = 'Country must contain letters only.';
    return e;
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

  // ── Build FormData — always FormData so logo file can be sent ─────────────
  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.append('name',            form.name.trim());
    fd.append('email',           form.email.trim());
    fd.append('phone',           form.phone.trim());
    fd.append('is_active',       'true');
    fd.append('company_code',    form.company_code);
    fd.append('whatsapp_number', form.whatsapp_number);
    fd.append('city',            form.city);
    fd.append('state',           form.state);
    fd.append('country',         form.country);
    fd.append('pincode',         form.pincode);
    fd.append('pan',             form.pan);
    fd.append('gst',             form.gst);

    if (logoFile) {
      fd.append('logo', logoFile);
    } else if (existingLogoUrl) {
      fd.append('logo_url', existingLogoUrl);
    }
    return fd;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const fd  = buildFormData();
      const res = isEdit
        ? await companyService.update(id!, fd)
        : await companyService.create(fd);

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

  const fieldStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', background: t.inputBg,
    border: `1px solid ${hasError ? '#ef4444' : t.inputBorder}`,
    borderRadius: 10, padding: '10px 14px',
    fontSize: 14, color: t.inputText, outline: 'none',
    boxSizing: 'border-box', fontFamily: t.fontFamily,
  });

  if (loadingData) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <p style={{ color: t.textMuted, fontFamily: t.fontFamily }}>Loading company data...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 28 }}>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">

          <Field label="Company Name" required t={t} error={errors.name}>
            <input type="text" placeholder="Enter company name" value={form.name}
              onChange={(e) => handleChange('name', e.target.value)} style={fieldStyle(!!errors.name)} />
          </Field>

          <Field label="Email" required t={t} error={errors.email}>
            <input type="email" placeholder="Enter email address" value={form.email}
              onChange={(e) => handleChange('email', e.target.value)} style={fieldStyle(!!errors.email)} />
          </Field>

          <Field label="Phone" required t={t} error={errors.phone}>
            <input type="text" inputMode="numeric" placeholder="Enter 10-digit phone number"
              value={form.phone} maxLength={10}
              onChange={(e) => { if (NUMERIC_REGEX.test(e.target.value)) handleChange('phone', e.target.value); }}
              style={fieldStyle(!!errors.phone)} />
          </Field>

          <Field label="WhatsApp Number" t={t} error={errors.whatsapp_number}>
            <input type="text" inputMode="numeric" placeholder="Enter 10-digit WhatsApp number"
              value={form.whatsapp_number} maxLength={10}
              onChange={(e) => { if (NUMERIC_REGEX.test(e.target.value)) handleChange('whatsapp_number', e.target.value); }}
              style={fieldStyle(!!errors.whatsapp_number)} />
          </Field>

          <Field label="City" t={t} error={errors.city}>
            <input type="text" placeholder="Enter city" value={form.city}
              onChange={(e) => { if (ALPHA_REGEX.test(e.target.value)) handleChange('city', e.target.value); }}
              style={fieldStyle(!!errors.city)} />
          </Field>

          <Field label="State" t={t} error={errors.state}>
            <input type="text" placeholder="Enter state" value={form.state}
              onChange={(e) => { if (ALPHA_REGEX.test(e.target.value)) handleChange('state', e.target.value); }}
              style={fieldStyle(!!errors.state)} />
          </Field>

          <Field label="Country" t={t} error={errors.country}>
            <input type="text" placeholder="Enter country" value={form.country}
              onChange={(e) => { if (ALPHA_REGEX.test(e.target.value)) handleChange('country', e.target.value); }}
              style={fieldStyle(!!errors.country)} />
          </Field>

          <Field label="Pincode" t={t}>
            <input type="text" inputMode="numeric" placeholder="Enter pincode"
              value={form.pincode} maxLength={10}
              onChange={(e) => { if (NUMERIC_REGEX.test(e.target.value)) handleChange('pincode', e.target.value); }}
              style={fieldStyle()} />
          </Field>

          <Field label="PAN" t={t}>
            <input type="text" placeholder="Enter PAN number" value={form.pan}
              onChange={(e) => handleChange('pan', e.target.value.toUpperCase())} style={fieldStyle()} />
          </Field>

          <Field label="GST" t={t}>
            <input type="text" placeholder="Enter GST number" value={form.gst}
              onChange={(e) => handleChange('gst', e.target.value.toUpperCase())} style={fieldStyle()} />
          </Field>

           <Field label="Company Logo" t={t}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: t.insetBg, border: `1px solid ${t.inputBorder}`, color: t.textSecondary, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Choose File
              </button>
              <span style={{ fontSize: 13, color: t.textMuted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {logoFile
                  ? logoFile.name
                  : existingLogoUrl
                    ? `Current: ${existingLogoUrl.split('/').pop()}`
                    : 'No file chosen'}
              </span>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: 'none' }} />
            </div>
          </Field>

        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button onClick={handleSubmit} disabled={!isMandatoryValid || saving}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: !isMandatoryValid || saving ? '#6b7280' : 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', cursor: !isMandatoryValid || saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>

          <button onClick={() => navigate(ROUTES.ADMIN.COMPANY)} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}>
            <MdArrowBack size={16} /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyFormPage;