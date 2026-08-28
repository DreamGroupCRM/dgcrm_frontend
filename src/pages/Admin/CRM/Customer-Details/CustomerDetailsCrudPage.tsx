// ==========================================
// DREAM GROUP CRM - CUSTOMER DETAILS CRUD PAGE
// ==========================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdArrowBack, MdSave, MdPerson, MdApartment, MdClose, MdKeyboardArrowDown,
  MdDelete, MdInsertDriveFile, MdCloudUpload, MdOpenInNew,
  MdPayments, MdDescription, MdVisibility, MdRadioButtonChecked, MdRadioButtonUnchecked,
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';

import { useAppSelector } from '../../../../hooks';
import { getTheme } from '../../../../styles/theme';
import {
  fetchCustomerFullDetails,
  createCustomerWithDetails,
  updateCustomerWithDetails,
} from '../../../../services/customerDetailsService';
import { FetchBuildingList, ViewBuilding } from '../../../../services/buildingService';
import { companyService } from '../../../../services/companyService';
import { Building, Company, ParkingChoice } from '../../../../types/index';
import './CustomerDetails.css';

type Mode = 'add' | 'edit' | 'view';
interface Props { mode: Mode; }
type Theme = ReturnType<typeof getTheme>;

// A file field can be: a freshly-picked File (about to be uploaded), an
// existing URL string (already on the server, from Edit/View's fetch), or
// null (nothing chosen). Every upload control in this page speaks this type.
type FileValue = File | string | null;

const COUNTRY_CODES = ['+91', '+1', '+44', '+61', '+971', '+65'];
const FOOTER_HEIGHT = 76;

// ── module-scope helpers only — nothing defined inside the page component,
// so typing in any field never remounts inputs and never loses focus. ────
// Field/label styling now lives in CustomerDetails.css as .cust-field /
// .cust-label (+ .cust-field-view for the isView background swap) — colors
// come in via the --cust-* CSS vars set on the page's outer wrapper below.
const fieldClassName = (isView: boolean) => (isView ? 'cust-field cust-field-view' : 'cust-field');

// Fires showPicker() on both click AND focus — a plain onClick alone opens
// the calendar when the browser-drawn icon is clicked, but clicking into
// the day/month/year text segments only moves focus between them without
// reopening it. Wrapped in try/catch — showPicker() throws if called
// without an active user gesture or while already open.
const openPicker = (e: React.SyntheticEvent<HTMLInputElement>) => {
  try { e.currentTarget.showPicker?.(); } catch { /* already open / no gesture — ignore */ }
};

const fileDisplayName = (v: FileValue): string => {
  if (v instanceof File) return v.name;
  if (typeof v === 'string' && v) return v.split('/').pop() || v;
  return '';
};

// ── Amount field formatting — Indian comma grouping while typing
// ("400000" reads as "4,00,000") plus the K/L/Cr shorthand shown at the
// end of the box, same pattern as the Customize Scheme page's SliderField/
// compactINR. Every amount/EMI field in Payment Details is a plain numeric
// STRING in this page's state (unlike Customize Scheme, which uses
// numbers) — these helpers work on that string directly so no field's
// underlying value type needs to change.
const formatAmountDisplay = (v: string): string => {
  if (!v) return '';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : v;
};

const trimDecimal = (x: number): string => x.toFixed(2).replace(/\.?0+$/, '');

const compactINR = (v: string): string => {
  const n = Math.max(0, Number(v) || 0);
  if (n >= 10000000) return `${trimDecimal(n / 10000000)} Cr`;
  if (n >= 100000) return `${trimDecimal(n / 100000)} L`;
  if (n >= 1000) return `${trimDecimal(n / 1000)} K`;
  return '';
};

// Years + months from a yyyy-mm-dd date-of-birth string, matching the
// "34 Years  3 Months" inset shown next to Date of Birth in the design.
const calcAge = (dob: string): { years: number; months: number } | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years < 0) return null;
  return { years, months };
};

// Full-bleed gradient header bar for each CRUD section (Customer Details /
// Property Booking Details / Payment Details / Document Upload) — same
// visual language as the ResultPanelHeader used on the Scheme pages. The
// negative margins exactly cancel the parent card's own `p-5 sm:p-6`
// padding so this bar reaches the card's edges and top corners without
// needing `overflow-hidden` on the parent (which would risk clipping any
// dropdown — e.g. Select Building/Wing/Floor in Property Booking Details —
// that opens near a section's bottom edge). `rounded-t-2xl` matches the
// parent's own top corner radius instead, and `mb-5` restores the original
// spacing before the fields grid below.
const SectionHeader: React.FC<{ t: Theme; icon: React.ReactNode; title: string; gradient: string; badge?: string }> = ({ icon, title, gradient, badge }) => (
  <div
    className="flex items-center gap-2.5 -mt-5 -mx-5 sm:-mt-6 sm:-mx-6 mb-5 px-5 sm:px-6 py-3.5 rounded-t-2xl"
    style={{ background: gradient }}
  >
    <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.22)' }}>
      {icon}
    </span>
    <h2 className="cust-section-title">{title}</h2>
    {badge && (
      <span className="rounded-lg" style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.22)', padding: '3px 10px' }}>
        {badge}
      </span>
    )}
  </div>
);

const SubHeading: React.FC<{ t: Theme; title: string }> = ({ t, title }) => (
  <p className="cust-subheading">{title}</p>
);

const Field: React.FC<{ t: Theme; label: string; required?: boolean; children: React.ReactNode; className?: string }> = ({ t, label, required, children, className }) => (
  <div className={className}>
    <label className="cust-label">{label}{required && <span className="cust-required"> *</span>}</label>
    {children}
  </div>
);

// ── View Customer — label-over-value cell, same visual language as
// Employee View's ViewValue. ────────────────────────────────────────────
const ViewValue: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
  <div className={className}>
    <div className="cust-view-label">{label}</div>
    <div className="cust-view-value">
      {value === '' || value == null ? <span style={{ opacity: 0.5 }}>—</span> : value}
    </div>
  </div>
);

// ── View Customer — one uploaded-document card (Aadhar/PAN/Application
// Form/Declaration Form/Allotment Letter). Real preview — an image renders
// as an actual thumbnail, a PDF/other document gets an icon block — and
// the whole card opens the file in a new tab, matching Employee View's
// DocumentCard exactly (item 16's "same document-preview behavior").
const CustomerDocumentCard: React.FC<{ t: Theme; label: string; url?: string | null }> = ({ t, label, url }) => {
  const isImage = !!url && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
  const content = (
    <>
      <div className="w-full flex items-center justify-center overflow-hidden"
        style={{ height: 120, background: isImage ? t.insetBg : url ? 'var(--grad-purple)' : t.insetBg }}>
        {isImage && url ? (
          <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <MdDescription size={34} color={url ? '#fff' : t.textSecondary} />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="cust-doc-card-label">{label}</div>
          <div className="cust-doc-card-status">{url ? 'Uploaded' : 'Not uploaded'}</div>
        </div>
        {url && <span className="cust-doc-card-link" style={{ flexShrink: 0 }}><MdOpenInNew size={12} /> Open</span>}
      </div>
    </>
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="cust-doc-card" style={{ border: `1px solid ${t.surfaceBorder}`, background: t.insetBg, textDecoration: 'none' }}>
      {content}
    </a>
  ) : (
    <div className="cust-doc-card" style={{ border: `1px solid ${t.surfaceBorder}`, background: t.insetBg, cursor: 'default' }}>
      {content}
    </div>
  );
};

// Same searchable dropdown as the List page's filters — click to open, type
// to filter, select, or clear. Duplicated locally rather than pulled from a
// new shared file, since only these two pages were part of this deliverable.
const SearchableSelect: React.FC<{
  t: Theme; isView?: boolean;
  placeholder: string; options: string[]; value: string;
  onChange: (v: string) => void; disabled?: boolean;
  // Overrides only the DISPLAYED text of each dropdown option — filtering,
  // the stored value, and what lands in the input box on selection all
  // still work off the plain option string. Used by the Flat No select to
  // show "A-101 · 2 BHK · 850 Sqft" per option.
  labelFor?: (opt: string) => string;
}> = ({ t, placeholder, options, value, onChange, disabled, labelFor }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
        style={{ background: disabled ? t.insetBg : t.inputBg, border: `1px solid ${t.inputBorder}`, cursor: disabled ? 'not-allowed' : 'text' }}
        onClick={() => !disabled && setOpen(true)}
      >
        <input
          type="text" placeholder={placeholder} value={query} disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 12, width: '100%' }}
        />
        {value && !disabled && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex', flexShrink: 0 }}>
            <MdClose size={15} />
          </button>
        )}
        <MdKeyboardArrowDown size={16} style={{ color: t.textSecondary, flexShrink: 0 }} />
      </div>
      {open && !disabled && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 30, maxHeight: 220, overflowY: 'auto',
          background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px 0',
        }}>
          {filtered.map((opt) => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setQuery(opt); setOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-sm" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, fontFamily: t.fontFamily }}>
              {labelFor ? labelFor(opt) : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// A country-code prefixed phone input — the "+91 | 9876543210" combo used
// for Mobile Number and WhatsApp Number.
const PhoneField: React.FC<{
  t: Theme; isView?: boolean; icon?: React.ReactNode;
  code: string; onCodeChange: (v: string) => void;
  number: string; onNumberChange: (v: string) => void;
}> = ({ t, isView, icon, code, onCodeChange, number, onNumberChange }) => (
  <div className={`flex items-center gap-2 ${fieldClassName(!!isView)}`} style={{ padding: '0 8px 0 12px' }}>
    {icon}
    <select value={code} disabled={isView} onChange={(e) => onCodeChange(e.target.value)}
      style={{ border: 'none', outline: 'none', background: 'transparent', color: t.inputText, fontSize: 12, fontFamily: t.fontFamily, padding: '9px 2px' }}>
      {COUNTRY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
    <span style={{ width: 1, height: 18, background: t.inputBorder, flexShrink: 0 }} />
    <input type="tel" placeholder="Enter number" value={number} readOnly={isView} disabled={isView}
      onChange={(e) => onNumberChange(e.target.value.replace(/[^\d]/g, ''))}
      style={{ border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', width: '100%', color: t.inputText, fontSize: 12, fontFamily: t.fontFamily }} />
  </div>
);

// Compact "chosen file" chip with a trash icon (Aadhar / PAN photo), or an
// upload prompt when nothing is chosen yet — matches "AadharCard.jpg [🗑]".
const CompactFileUpload: React.FC<{ t: Theme; isView?: boolean; accept?: string; value: FileValue; onChange: (f: File | null) => void }> = ({ t, isView, accept = 'image/*,.pdf', value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayName = fileDisplayName(value);

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {displayName ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: t.insetBg, border: `1px solid ${t.inputBorder}` }}>
          <MdInsertDriveFile size={16} style={{ color: '#0284c7', flexShrink: 0 }} />
          <span className="truncate" style={{ fontSize: 11.5, color: t.textPrimary, flex: 1 }}>{displayName}</span>
          {!isView && (
            <button type="button" onClick={() => onChange(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex', flexShrink: 0 }}>
              <MdDelete size={16} />
            </button>
          )}
        </div>
      ) : (
        <button type="button" disabled={isView} onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl w-full"
          style={{ background: t.inputBg, border: `1px dashed ${t.inputBorder}`, cursor: isView ? 'not-allowed' : 'pointer', color: t.textSecondary, fontSize: 11.5, fontFamily: t.fontFamily }}>
          <MdInsertDriveFile size={16} /> Choose file
        </button>
      )}
    </div>
  );
};

// Larger dashed drop-card (Application Form / Declaration Form / Allotment Letter).
const DocumentDropCard: React.FC<{ t: Theme; isView?: boolean; label: string; value: FileValue; onChange: (f: File | null) => void }> = ({ t, isView, label, value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayName = fileDisplayName(value);

  return (
    <div className="rounded-xl p-4 text-center" style={{ border: `1.5px dashed ${t.inputBorder}`, background: t.inputBg }}>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      <MdCloudUpload size={26} style={{ color: '#0284c7', margin: '0 auto 6px' }} />
      {displayName ? (
        <div className="flex items-center justify-center gap-2">
          <span className="truncate" style={{ fontSize: 11, color: t.textPrimary, maxWidth: 150 }}>{displayName}</span>
          {!isView && (
            <button type="button" onClick={() => onChange(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex' }}>
              <MdDelete size={15} />
            </button>
          )}
        </div>
      ) : (
        <button type="button" disabled={isView} onClick={() => inputRef.current?.click()}
          style={{ background: 'transparent', border: 'none', cursor: isView ? 'not-allowed' : 'pointer', color: '#0284c7', fontSize: 11, fontWeight: 700, fontFamily: t.fontFamily }}>
          Upload {label}
        </button>
      )}
      <p style={{ fontSize: 10, color: t.textSecondary, margin: '4px 0 0' }}>PDF, JPG, PNG (Max 2MB)</p>
    </div>
  );
};

const RadioOption: React.FC<{ t: Theme; label: string; selected: boolean; onSelect: () => void; disabled?: boolean }> = ({ t, label, selected, onSelect, disabled }) => (
  <button type="button" disabled={disabled} onClick={onSelect}
    className="flex items-center gap-2" style={{ background: 'transparent', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: 0 }}>
    {selected ? <MdRadioButtonChecked size={18} style={{ color: '#0284c7' }} /> : <MdRadioButtonUnchecked size={18} style={{ color: t.textSecondary }} />}
    <span style={{ fontSize: 12, color: t.textPrimary, fontWeight: 600 }}>{label}</span>
  </button>
);

// A ₹-amount input — shared by every currency field in Payment Details.
// Displays the value comma-grouped ("4,00,000") while the underlying state
// stays a plain digit string, and shows the K/L/Cr shorthand at the end of
// the box — same as every ₹ field on the Customize Scheme page.
const AmountField: React.FC<{ t: Theme; isView?: boolean; disabled?: boolean; placeholder: string; value: string; onChange: (v: string) => void }> = ({ t, isView, disabled, placeholder, value, onChange }) => {
  const compact = compactINR(value);
  return (
    <div className={`flex items-center gap-1.5 ${fieldClassName(!!isView || !!disabled)}`} style={{ padding: '0 10px' }}>
      <span style={{ color: t.textSecondary, flexShrink: 0 }}>₹</span>
      <input type="text" inputMode="decimal" placeholder={placeholder} value={formatAmountDisplay(value)} readOnly={isView || disabled} disabled={isView || disabled}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        style={{ border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', width: '100%', minWidth: 0, color: t.inputText, fontSize: 12, fontFamily: t.fontFamily }} />
      {compact && <span style={{ color: '#0284c7', fontWeight: 700, fontSize: 10, flexShrink: 0, whiteSpace: 'nowrap' }}>{compact}</span>}
    </div>
  );
};

// A plain-number input — months / tenure fields.
// `max`/`maxLength` are both opt-in (undefined everywhere except Total EMI
// Tenure, which needs a max-99/2-digit restriction) — Booster Interval's two
// callers pass neither, so their behavior is unchanged.
const NumberField: React.FC<{
  t: Theme; isView?: boolean; placeholder: string; value: string; onChange: (v: string) => void;
  max?: number; maxLength?: number;
}> = ({ t, isView, placeholder, value, onChange, max, maxLength }) => (
  <input type="text" inputMode="numeric" placeholder={placeholder} value={value} readOnly={isView} disabled={isView} maxLength={maxLength}
    onChange={(e) => {
      const digitsOnly = e.target.value.replace(/[^\d]/g, '');
      const clamped = max !== undefined && digitsOnly !== '' ? String(Math.min(max, Number(digitsOnly))) : digitsOnly;
      onChange(clamped);
    }} className={fieldClassName(!!isView)} />
);

// ── Preview modal (item 13) — reads straight from the form's current
// (possibly unsaved) state, purely presentational; it never touches the
// form fields themselves, so closing it leaves every entered value intact.
// Grouped into the same 4 sections as the form itself so it reads as a
// professional customer profile/document rather than a raw field dump. ──
const PreviewRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--cust-text-secondary)', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--cust-text-primary)', wordBreak: 'break-word' }}>{value || '—'}</div>
  </div>
);

const PreviewSection: React.FC<{ icon: React.ReactNode; title: string; gradient: string; children: React.ReactNode }> = ({ icon, title, gradient, children }) => (
  <div className="rounded-2xl mb-4" style={{ border: '1px solid var(--cust-surface-border)', overflow: 'hidden' }}>
    <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: gradient }}>
      <span className="flex items-center justify-center rounded-lg" style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.22)', color: '#fff' }}>{icon}</span>
      <h3 style={{ fontSize: 12.5, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h3>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4" style={{ background: 'var(--cust-surface-bg)' }}>
      {children}
    </div>
  </div>
);

interface PreviewData {
  photoUrl: string | null; fullName: string; email: string; mobile: string; whatsapp: string;
  aadhar: string; pan: string; address: string; dob: string; age: string;
  altName: string; altMobile: string;
  companyName: string; projectName: string; buildingName: string; wingName: string; floorLabel: string;
  flatNo: string; flatType: string; flatArea: string; parking: string;
  totalCost: string; bookingDate: string; bookingAmount: string; remainingAmount: string; remainingDate: string;
  possessionAmount: string; installmentDate: string; emiBefore: string; emiAfter: string; tenure: string;
  boosterBefore: string; boosterAfter: string; boosterIntervalBefore: string; boosterIntervalAfter: string;
  documents: { label: string; value: FileValue }[];
}

const CustomerPreviewModal: React.FC<{ data: PreviewData; onClose: () => void }> = ({ data, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
    <div className="rounded-2xl w-full" style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', background: 'var(--cust-surface-bg)', border: '1px solid var(--cust-surface-border)' }}
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--cust-divider)' }}>
        <div className="flex items-center gap-3">
          {data.photoUrl ? (
            <img src={data.photoUrl} alt="" className="rounded-full" style={{ width: 44, height: 44, objectFit: 'cover' }} />
          ) : (
            <div className="flex items-center justify-center rounded-full text-white font-bold" style={{ width: 44, height: 44, background: 'var(--grad-purple)' }}>
              {(data.fullName || '—').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--cust-text-primary)' }}>{data.fullName || 'Customer Preview'}</div>
            <div style={{ fontSize: 10.5, color: 'var(--cust-text-secondary)' }}>Customer Profile Preview — unsaved</div>
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--cust-text-secondary)' }}>
          <MdClose size={20} />
        </button>
      </div>

      <div className="p-5">
        <PreviewSection icon={<MdPerson size={13} />} title="Personal Details" gradient="var(--grad-sky)">
          <PreviewRow label="Full Name" value={data.fullName} />
          <PreviewRow label="Email ID" value={data.email} />
          <PreviewRow label="Mobile Number" value={data.mobile} />
          <PreviewRow label="WhatsApp Number" value={data.whatsapp} />
          <PreviewRow label="Aadhar Number" value={data.aadhar} />
          <PreviewRow label="PAN Number" value={data.pan} />
          <PreviewRow label="Date of Birth" value={data.dob ? `${data.dob}${data.age ? ` (${data.age})` : ''}` : ''} />
          <PreviewRow label="Alternate Contact" value={data.altName ? `${data.altName}${data.altMobile ? ` · ${data.altMobile}` : ''}` : ''} />
          <PreviewRow label="Address" value={data.address} />
        </PreviewSection>

        <PreviewSection icon={<MdApartment size={13} />} title="Property Booking Details" gradient="var(--grad-teal)">
          <PreviewRow label="Company Name" value={data.companyName} />
          <PreviewRow label="Project Name" value={data.projectName} />
          <PreviewRow label="Building" value={data.buildingName} />
          <PreviewRow label="Wing / Floor" value={[data.wingName, data.floorLabel].filter(Boolean).join(' / ')} />
          <PreviewRow label="Flat No" value={data.flatNo} />
          <PreviewRow label="Flat Type" value={data.flatType} />
          <PreviewRow label="Flat Area" value={data.flatArea} />
          <PreviewRow label="Parking" value={data.parking} />
        </PreviewSection>

        <PreviewSection icon={<MdPayments size={13} />} title="Payment Details" gradient="var(--grad-green)">
          <PreviewRow label="Total Cost" value={data.totalCost && `₹ ${data.totalCost}`} />
          <PreviewRow label="Booking Date" value={data.bookingDate} />
          <PreviewRow label="Booking Amount" value={data.bookingAmount && `₹ ${data.bookingAmount}`} />
          <PreviewRow label="Remaining Booking Amount" value={data.remainingAmount && `₹ ${data.remainingAmount}${data.remainingDate ? ` (${data.remainingDate})` : ''}`} />
          <PreviewRow label="Possession Amount" value={data.possessionAmount && `₹ ${data.possessionAmount}`} />
          <PreviewRow label="Installment Date" value={data.installmentDate} />
          <PreviewRow label="Monthly EMI Before Possession" value={data.emiBefore && `₹ ${data.emiBefore}`} />
          <PreviewRow label="Monthly EMI After Possession" value={data.emiAfter && `₹ ${data.emiAfter}`} />
          <PreviewRow label="Total EMI Tenure" value={data.tenure && `${data.tenure} months`} />
          <PreviewRow label="Booster Before Possession" value={data.boosterBefore && `₹ ${data.boosterBefore} / ${data.boosterIntervalBefore || '—'} mo`} />
          <PreviewRow label="Booster After Possession" value={data.boosterAfter && `₹ ${data.boosterAfter} / ${data.boosterIntervalAfter || '—'} mo`} />
        </PreviewSection>

        <PreviewSection icon={<MdDescription size={13} />} title="Uploaded Documents" gradient="var(--grad-purple)">
          {data.documents.map((d) => (
            <PreviewRow key={d.label} label={d.label} value={fileDisplayName(d.value) || 'Not uploaded'} />
          ))}
        </PreviewSection>
      </div>

      <div className="flex items-center justify-end gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--cust-divider)' }}>
        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold cust-btn-secondary">
          Close Preview
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
const CustomerDetailsCrudPage: React.FC<Props> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mode: themeMode } = useAppSelector((s) => s.theme);
  const isDark = themeMode === 'dark';
  const t = getTheme(isDark);
  const isView = mode === 'view';

  const [fetching, setFetching] = useState(mode !== 'add');
  const [saving, setSaving] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customerCode, setCustomerCode] = useState('');

  // ── Personal Details ──────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerPhoto, setCustomerPhoto] = useState<FileValue>(null);
  const [email, setEmail] = useState('');
  const [mobileCountryCode, setMobileCountryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+91');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [aadharPhoto, setAadharPhoto] = useState<FileValue>(null);
  const [pancardNumber, setPancardNumber] = useState('');
  const [pancardPhoto, setPancardPhoto] = useState<FileValue>(null);
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [alternatePersonName, setAlternatePersonName] = useState('');
  const [alternatePersonMobile, setAlternatePersonMobile] = useState('');

  // ── Property Booking Details ──────────────────────────────────────────
  const [companyName, setCompanyName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [wingName, setWingName] = useState('');
  const [floorLabel, setFloorLabel] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [wantsParking, setWantsParking] = useState<ParkingChoice>('yes');
  const [parkingNo, setParkingNo] = useState('');

  // ── Payment Details ───────────────────────────────────────────────────
  const [totalCost, setTotalCost] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingAmount, setBookingAmount] = useState('');
  const [remainingBookingAmount, setRemainingBookingAmount] = useState('');
  const [remainingBookingDate, setRemainingBookingDate] = useState('');
  const [possessionAmount, setPossessionAmount] = useState('');
  const [installmentDate, setInstallmentDate] = useState('');
  const [monthlyEmiBeforePossession, setMonthlyEmiBeforePossession] = useState('');
  const [monthlyEmiAfterPossession, setMonthlyEmiAfterPossession] = useState('');
  const [totalEmiTenure, setTotalEmiTenure] = useState('');
  const [boosterAmountBeforePossession, setBoosterAmountBeforePossession] = useState('');
  const [boosterAmountAfterPossession, setBoosterAmountAfterPossession] = useState('');
  const [boosterIntervalBeforePossession, setBoosterIntervalBeforePossession] = useState('');
  const [boosterIntervalAfterPossession, setBoosterIntervalAfterPossession] = useState('');

  // ── Document Upload ───────────────────────────────────────────────────
  const [applicationForm, setApplicationForm] = useState<FileValue>(null);
  const [declarationForm, setDeclarationForm] = useState<FileValue>(null);
  const [allotmentLetter, setAllotmentLetter] = useState<FileValue>(null);

  const [isActive, setIsActive] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await FetchBuildingList(1, 1000);
        if (res.success) setBuildings(res.rows ?? []);
      } catch { /* dropdowns just stay empty if this fails */ }
    })();
    (async () => {
      try {
        const res = await companyService.FetchCompanyList(1, 1000);
        if (res.success) setCompanies(res.rows ?? []);
      } catch { /* dropdown just stays empty if this fails */ }
    })();
  }, []);

  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      setFetching(true);
      try {
        const res = await fetchCustomerFullDetails(id);
        if (res.success && res.data) {
          const c = res.data;
          setCustomerCode(c.customer_code || '');
          setFirstName(c.first_name || '');
          setMiddleName(c.middle_name || '');
          setLastName(c.last_name || '');
          setCustomerPhoto(c.customer_photo_url || null);
          setEmail(c.email || '');
          setMobileCountryCode(c.mobile_country_code || '+91');
          setMobileNumber(c.mobile_number || '');
          setWhatsappCountryCode(c.whatsapp_country_code || '+91');
          setWhatsappNumber(c.whatsapp_number || '');
          setAadharNumber(c.aadhar_number || '');
          setAadharPhoto(c.aadhar_photo_url || null);
          setPancardNumber(c.pancard_number || '');
          setPancardPhoto(c.pancard_photo_url || null);
          setAddress(c.address || '');
          setDateOfBirth(c.date_of_birth || '');
          setAlternatePersonName(c.alternate_person_name || '');
          setAlternatePersonMobile(c.alternate_person_mobile || '');

          setCompanyName(c.company_name || '');
          setProjectName(c.project_name || '');
          setLocation(c.location || '');
          setBuildingName(c.building_name || '');
          setWingName(c.wing_name || '');
          setFloorLabel(c.floor_label || '');
          setFlatNo(c.flat_no || '');
          setWantsParking(c.wants_parking || 'yes');
          setParkingNo(c.parking_no || '');

          setTotalCost(c.total_cost != null ? String(c.total_cost) : '');
          setBookingDate(c.booking_date || '');
          setBookingAmount(c.booking_amount != null ? String(c.booking_amount) : '');
          setRemainingBookingAmount(c.remaining_booking_amount != null ? String(c.remaining_booking_amount) : '');
          setRemainingBookingDate(c.remaining_booking_date || '');
          setPossessionAmount(c.possession_amount != null ? String(c.possession_amount) : '');
          setInstallmentDate(c.installment_date || '');
          setMonthlyEmiBeforePossession(c.monthly_emi_before_possession != null ? String(c.monthly_emi_before_possession) : '');
          setMonthlyEmiAfterPossession(c.monthly_emi_after_possession != null ? String(c.monthly_emi_after_possession) : '');
          setTotalEmiTenure(c.total_emi_tenure_months != null ? String(c.total_emi_tenure_months) : '');
          setBoosterAmountBeforePossession(c.booster_amount_before_possession != null ? String(c.booster_amount_before_possession) : '');
          setBoosterAmountAfterPossession(c.booster_amount_after_possession != null ? String(c.booster_amount_after_possession) : '');
          setBoosterIntervalBeforePossession(c.booster_interval_before_possession_months != null ? String(c.booster_interval_before_possession_months) : '');
          setBoosterIntervalAfterPossession(c.booster_interval_after_possession_months != null ? String(c.booster_interval_after_possession_months) : '');

          setApplicationForm(c.application_form_url || null);
          setDeclarationForm(c.declaration_form_url || null);
          setAllotmentLetter(c.allotment_letter_url || null);

          setIsActive(c.is_active);
        } else {
          toast.error('Failed to load customer details.');
        }
      } catch {
        toast.error('Failed to load customer details.');
      } finally {
        setFetching(false);
      }
    })();
  }, [mode, id]);

  // ── cascading Project -> Building -> Wing -> Floor -> Flat ──────────────
  // FetchBuildingList (used for Project/Building Name options below) is a
  // LIST endpoint — its wings/floors/flats are placeholder entries sized to
  // match aggregate counts only (empty name/label/flat_no AND non-numeric
  // placeholder ids like "wing_1" on every one of them; see
  // buildingService.ts's fromListRow), never real data. Submitting those
  // placeholder ids as wing_id/floor_id/flat_id would silently save a
  // booking with no real link to any actual wing/floor/flat row. Once a
  // specific building is selected, its real detail is fetched (ViewBuilding)
  // and THAT backs the Wing/Floor/Flat option lists and the ids actually
  // submitted below — not the list row's placeholders.
  const companyNameOptions = useMemo(() => Array.from(new Set(companies.map((c) => c.name))), [companies]);
  const projectNameOptions = useMemo(() => Array.from(new Set(buildings.map((b) => b.project_name))), [buildings]);
  const buildingsForProject = useMemo(
    () => (projectName ? buildings.filter((b) => b.project_name === projectName) : buildings),
    [buildings, projectName]
  );
  const buildingNameOptions = useMemo(() => Array.from(new Set(buildingsForProject.map((b) => b.building_name))), [buildingsForProject]);
  const selectedBuilding = useMemo(() => buildingsForProject.find((b) => b.building_name === buildingName), [buildingsForProject, buildingName]);

  const [buildingDetail, setBuildingDetail] = useState<Building | null>(null);
  const [loadingBuildingDetail, setLoadingBuildingDetail] = useState(false);
  useEffect(() => {
    if (!selectedBuilding) { setBuildingDetail(null); return; }
    let cancelled = false;
    setLoadingBuildingDetail(true);
    (async () => {
      try {
        const res = await ViewBuilding(selectedBuilding.id);
        if (!cancelled && res.success) setBuildingDetail(res.data);
      } catch { /* Wing/Floor/Flat just stay empty if this fails */ }
      finally { if (!cancelled) setLoadingBuildingDetail(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedBuilding?.id]);

  const wingNameOptions = useMemo(() => (buildingDetail ? buildingDetail.wings.map((w) => w.name) : []), [buildingDetail]);
  const selectedWing = useMemo(() => buildingDetail?.wings.find((w) => w.name === wingName), [buildingDetail, wingName]);
  const floorLabelOptions = useMemo(() => (selectedWing ? selectedWing.floors.map((f) => f.label) : []), [selectedWing]);
  const selectedFloor = useMemo(() => selectedWing?.floors.find((f) => f.label === floorLabel), [selectedWing, floorLabel]);
  const flatNoOptions = useMemo(() => (selectedFloor ? selectedFloor.flats.map((fl) => fl.flat_no) : []), [selectedFloor]);
  const selectedFlat = useMemo(() => selectedFloor?.flats.find((fl) => fl.flat_no === flatNo), [selectedFloor, flatNo]);

  // Location is informational and auto-filled from the selected Building —
  // it has no dropdown of its own in the design.
  useEffect(() => { if (selectedBuilding) setLocation(selectedBuilding.location || ''); }, [selectedBuilding]);

  const age = useMemo(() => calcAge(dateOfBirth), [dateOfBirth]);

  const isFormValid =
    firstName.trim() !== '' && middleName.trim() !== '' && lastName.trim() !== '' && !!customerPhoto &&
    email.trim() !== '' && mobileNumber.trim() !== '' && whatsappNumber.trim() !== '' &&
    !!aadharPhoto && !!pancardPhoto &&
    address.trim() !== '' && dateOfBirth !== '' &&
    companyName.trim() !== '' && projectName.trim() !== '' &&
    (wantsParking === 'no' || parkingNo.trim() !== '') &&
    totalCost.trim() !== '' && bookingDate !== '' && bookingAmount.trim() !== '' &&
    remainingBookingAmount.trim() !== '' && remainingBookingDate !== '' && possessionAmount.trim() !== '' &&
    installmentDate !== '' && monthlyEmiBeforePossession.trim() !== '' && monthlyEmiAfterPossession.trim() !== '' &&
    totalEmiTenure.trim() !== '' &&
    boosterAmountBeforePossession.trim() !== '' && boosterAmountAfterPossession.trim() !== '' &&
    boosterIntervalBeforePossession.trim() !== '' && boosterIntervalAfterPossession.trim() !== '' &&
    !!applicationForm && !!declarationForm && !!allotmentLetter;

  const handlePreview = () => setPreviewOpen(true);

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error('Please fill all mandatory fields.');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();

      // Personal Details
      formData.append('first_name', firstName.trim());
      formData.append('middle_name', middleName.trim());
      formData.append('last_name', lastName.trim());
      if (customerPhoto instanceof File) formData.append('customer_photo', customerPhoto);
      formData.append('email', email.trim());
      formData.append('mobile_country_code', mobileCountryCode);
      formData.append('mobile_number', mobileNumber.trim());
      formData.append('whatsapp_country_code', whatsappCountryCode);
      formData.append('whatsapp_number', whatsappNumber.trim());
      formData.append('aadhar_number', aadharNumber.trim());
      if (aadharPhoto instanceof File) formData.append('aadhar_photo', aadharPhoto);
      formData.append('pancard_number', pancardNumber.trim());
      if (pancardPhoto instanceof File) formData.append('pancard_photo', pancardPhoto);
      formData.append('address', address.trim());
      formData.append('date_of_birth', dateOfBirth);
      formData.append('alternate_person_name', alternatePersonName.trim());
      formData.append('alternate_person_mobile', alternatePersonMobile.trim());

      // Property Booking Details
      formData.append('company_name', companyName.trim());
      formData.append('project_name', projectName.trim());
      formData.append('location', location.trim());
      // building_id/wing_id/flat_id are genuinely optional (Building/Wing/
      // Flat No have no required-marker on this form) — CreateCustomerSchema's
      // optionalId is z.coerce.number().positive().optional(), which only
      // skips validation when the KEY IS ABSENT. Appending '' for a
      // not-yet-selected id used to send the key anyway, which z.coerce
      // turns into 0 and ".positive()" then rejects with a 400 on every
      // submission that didn't pick a Building/Wing/Flat No.
      if (selectedBuilding?.id) formData.append('building_id', selectedBuilding.id);
      formData.append('building_name', selectedBuilding?.building_name || buildingName.trim());
      if (selectedWing?.id) formData.append('wing_id', selectedWing.id);
      formData.append('wing_name', selectedWing?.name || wingName.trim());
      formData.append('floor_id', selectedFloor?.id || '');
      formData.append('floor_label', selectedFloor?.label || floorLabel.trim());
      if (selectedFlat?.id) formData.append('flat_id', selectedFlat.id);
      formData.append('flat_no', selectedFlat?.flat_no || flatNo.trim());
      formData.append('flat_type', selectedFlat?.flat_type || '');
      formData.append('area_sqft', selectedFlat?.area_sqft != null ? String(selectedFlat.area_sqft) : '');
      formData.append('wants_parking', wantsParking);
      formData.append('parking_no', wantsParking === 'yes' ? parkingNo.trim() : '');

      // Payment Details
      formData.append('total_cost', totalCost);
      formData.append('booking_date', bookingDate);
      formData.append('booking_amount', bookingAmount);
      formData.append('remaining_booking_amount', remainingBookingAmount);
      formData.append('remaining_booking_date', remainingBookingDate);
      formData.append('possession_amount', possessionAmount);
      formData.append('installment_date', installmentDate);
      formData.append('monthly_emi_before_possession', monthlyEmiBeforePossession);
      formData.append('monthly_emi_after_possession', monthlyEmiAfterPossession);
      formData.append('total_emi_tenure_months', totalEmiTenure);
      formData.append('booster_amount_before_possession', boosterAmountBeforePossession);
      formData.append('booster_amount_after_possession', boosterAmountAfterPossession);
      formData.append('booster_interval_before_possession_months', boosterIntervalBeforePossession);
      formData.append('booster_interval_after_possession_months', boosterIntervalAfterPossession);

      // Document Upload
      if (applicationForm instanceof File) formData.append('application_form', applicationForm);
      if (declarationForm instanceof File) formData.append('declaration_form', declarationForm);
      if (allotmentLetter instanceof File) formData.append('allotment_letter', allotmentLetter);

      formData.append('is_active', String(isActive));

      if (mode === 'edit' && id) {
        await updateCustomerWithDetails(id, formData);
        toast.success('Customer Updated Successfully');
      } else {
        await createCustomerWithDetails(formData);
        toast.success('Customer Created Successfully');
      }
      navigate('/admin/crm/customer-details');
    } catch (e: any) {
      const backendErrors = e?.response?.data?.errors as { field: string; message: string }[] | undefined;
      const detail = backendErrors?.length
        ? backendErrors.map((er) => `${er.field}: ${er.message}`).join('; ')
        : e?.response?.data?.message;
      toast.error(detail || (mode === 'edit' ? 'Failed to update customer.' : 'Failed to create customer.'));
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = fieldClassName(isView);

  if (fetching) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300, color: t.textSecondary, fontFamily: t.fontFamily }}>
        Loading customer details...
      </div>
    );
  }

  // ── CSS custom properties for CustomerDetails.css — set once here from
  // this page's own getTheme(isDark) values, consumed by the cust-* classes
  // used throughout this page's form fields/labels/footer below. ────────
  const cssVars = {
    '--cust-field-bg': t.inputBg, '--cust-field-border': t.inputBorder, '--cust-field-text': t.inputText,
    '--cust-inset-bg': t.insetBg, '--cust-text-primary': t.textPrimary, '--cust-text-secondary': t.textSecondary,
    '--cust-surface-bg': t.surfaceBg, '--cust-surface-border': t.surfaceBorder, '--cust-divider': t.divider,
  } as React.CSSProperties;

  // ── View Customer — read-only "ID card" layout (item 14): 4 professional
  // info boxes (Personal/Customer Details, Property Booking Details,
  // Payment Details, Uploaded Documents) with label-over-value cells,
  // instead of the same editable-looking form with every field disabled.
  // Same visual language as View Employee (ViewValue + real doc previews). ──
  if (isView) {
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    return (
      <div style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 16, ...cssVars }}>

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/admin/crm/customer-details')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, padding: 6 }}>
              <MdArrowBack size={20} />
            </button>
            <div>
              <h1 className="cust-crud-title">View Customer</h1>
              <p className="cust-crud-subtitle">Customer details</p>
            </div>
          </div>
          {customerCode && (
            <div className="cust-id-badge">
              <span className="cust-id-value">Customer ID - {customerCode}</span>
            </div>
          )}
        </div>

        {/* ── Identity strip — photo + name + email, above the boxes ─────── */}
        <div className="flex items-center gap-3 mb-5">
          {typeof customerPhoto === 'string' && customerPhoto ? (
            <img src={customerPhoto} alt="" className="rounded-full flex-shrink-0" style={{ width: 56, height: 56, objectFit: 'cover' }} />
          ) : (
            <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ width: 56, height: 56, background: 'var(--grad-purple)', fontSize: 18 }}>
              {(firstName[0] || '')}{(lastName[0] || '')}
            </div>
          )}
          <div className="min-w-0">
            <div style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary, wordBreak: 'break-word' }}>{fullName || '—'}</div>
            <div style={{ fontSize: 11.5, color: t.textSecondary }}>{email}</div>
          </div>
          <span className="cust-view-status-badge" style={{ background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#16a34a' : '#dc2626' }}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* ── Row 1: Personal Details + Property Booking Details ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <SectionHeader t={t} icon={<MdPerson size={16} />} title="Personal Details" gradient="var(--grad-sky)" />
            <div className="cust-view-grid">
              <ViewValue label="First Name" value={firstName} />
              <ViewValue label="Middle Name" value={middleName} />
              <ViewValue label="Last Name" value={lastName} />
              <ViewValue label="Mobile Number" value={mobileNumber ? `${mobileCountryCode} ${mobileNumber}` : ''} />
              <ViewValue label="WhatsApp Number" value={whatsappNumber ? `${whatsappCountryCode} ${whatsappNumber}` : ''} />
              <ViewValue label="Date of Birth" value={dateOfBirth ? `${dateOfBirth}${age ? ` (${age.years}y ${age.months}m)` : ''}` : ''} />
              <ViewValue label="Aadhar Number" value={aadharNumber} />
              <ViewValue label="PAN Number" value={pancardNumber} />
              <ViewValue label="Alternate Contact" value={alternatePersonName ? `${alternatePersonName}${alternatePersonMobile ? ` · ${alternatePersonMobile}` : ''}` : ''} />
              <ViewValue label="Address" value={address} className="cust-view-field-wide" />
            </div>
          </div>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <SectionHeader t={t} icon={<MdApartment size={16} />} title="Property Booking Details" gradient="var(--grad-teal)" />
            <div className="cust-view-grid">
              <ViewValue label="Company Name" value={companyName} />
              <ViewValue label="Project Name" value={projectName} />
              <ViewValue label="Building" value={buildingName} />
              <ViewValue label="Wing / Floor" value={[wingName, floorLabel].filter(Boolean).join(' / ')} />
              <ViewValue label="Flat No" value={selectedFlat?.flat_no || flatNo} />
              <ViewValue label="Flat Type" value={selectedFlat?.flat_type} />
              <ViewValue label="Flat Area" value={selectedFlat?.area_sqft != null ? `${selectedFlat.area_sqft} Sqft` : ''} />
              <ViewValue label="Parking" value={wantsParking === 'yes' ? `Yes${parkingNo ? ` · ${parkingNo}` : ''}` : 'No'} />
            </div>
          </div>
        </div>

        {/* ── Row 2: Payment Details + Uploaded Documents ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <SectionHeader t={t} icon={<MdPayments size={16} />} title="Payment Details" gradient="var(--grad-green)" />
            <div className="cust-view-grid">
              <ViewValue label="Total Cost" value={totalCost && `₹ ${totalCost}`} />
              <ViewValue label="Booking Date" value={bookingDate} />
              <ViewValue label="Booking Amount" value={bookingAmount && `₹ ${bookingAmount}`} />
              <ViewValue label="Remaining Booking Amount" value={remainingBookingAmount && `₹ ${remainingBookingAmount}`} />
              <ViewValue label="Remaining Booking Date" value={remainingBookingDate} />
              <ViewValue label="Possession Amount" value={possessionAmount && `₹ ${possessionAmount}`} />
              <ViewValue label="Installment Date" value={installmentDate} />
              <ViewValue label="Monthly EMI Before Possession" value={monthlyEmiBeforePossession && `₹ ${monthlyEmiBeforePossession}`} />
              <ViewValue label="Monthly EMI After Possession" value={monthlyEmiAfterPossession && `₹ ${monthlyEmiAfterPossession}`} />
              <ViewValue label="Total EMI Tenure" value={totalEmiTenure && `${totalEmiTenure} months`} />
              <ViewValue label="Booster Before Possession" value={boosterAmountBeforePossession && `₹ ${boosterAmountBeforePossession} / ${boosterIntervalBeforePossession || '—'} mo`} />
              <ViewValue label="Booster After Possession" value={boosterAmountAfterPossession && `₹ ${boosterAmountAfterPossession} / ${boosterIntervalAfterPossession || '—'} mo`} />
            </div>
          </div>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
            <SectionHeader t={t} icon={<MdDescription size={16} />} title="Uploaded Documents" gradient="var(--grad-purple)" />
            <div className="cust-doc-grid">
              <CustomerDocumentCard t={t} label="Aadhar Card" url={typeof aadharPhoto === 'string' ? aadharPhoto : null} />
              <CustomerDocumentCard t={t} label="Pancard" url={typeof pancardPhoto === 'string' ? pancardPhoto : null} />
              <CustomerDocumentCard t={t} label="Application Form" url={typeof applicationForm === 'string' ? applicationForm : null} />
              <CustomerDocumentCard t={t} label="Declaration Form" url={typeof declarationForm === 'string' ? declarationForm : null} />
              <CustomerDocumentCard t={t} label="Allotment Letter" url={typeof allotmentLetter === 'string' ? allotmentLetter : null} />
            </div>
          </div>
        </div>

        {/* ── Sticky footer — Go Back only, same shared class every other
            CRUD page's footer uses. ────────────────────────────────────── */}
        <div className="master-crud-footer flex items-center justify-center gap-3 z-10" style={{ background: t.surfaceBg, borderColor: t.surfaceBorder }}>
          <button type="button" onClick={() => navigate('/admin/crm/customer-details')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold cust-btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 16, ...cssVars }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/admin/crm/customer-details')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, padding: 6 }}>
            <MdArrowBack size={20} />
          </button>
          <div>
            <h1 className="cust-crud-title">
              {mode === 'add' ? 'Create Customer' : mode === 'edit' ? 'Edit Customer' : 'View Customer'}
            </h1>
            <p className="cust-crud-subtitle">
              {mode === 'add' ? 'Add new customer details' : 'Customer details'}
            </p>
          </div>
        </div>

        {/* Top-right "Customer ID - C001" badge, at 28px — matches the
            Employee CRUD page's top-right ID badge, sized per item 5's
            spec (Customer ID is shown larger than Employee's 18px). Only
            shown once a code exists (Edit/View — a not-yet-created
            customer has none yet). */}
        {customerCode && (
          <div className="cust-id-badge">
            <span className="cust-id-value">Customer ID - {customerCode}</span>
          </div>
        )}
      </div>

      {/* ── Customer Details (Personal Details) ──────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdPerson size={16} />} title="Customer Details" gradient="var(--grad-sky)" />
        <SubHeading t={t} title="Personal Details" />

        {/* Row 1 of 3 — Name + Photo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <Field t={t} label="First Name" required>
            <input type="text" placeholder="Enter first name" value={firstName} readOnly={isView} disabled={isView}
              onChange={(e) => setFirstName(e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Middle Name" required>
            <input type="text" placeholder="Enter middle name" value={middleName} readOnly={isView} disabled={isView}
              onChange={(e) => setMiddleName(e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Last Name" required>
            <input type="text" placeholder="Enter last name" value={lastName} readOnly={isView} disabled={isView}
              onChange={(e) => setLastName(e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Email ID" required>
            <input type="email" placeholder="Enter email address" value={email} readOnly={isView} disabled={isView}
              onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Customer Photo" required>
            <CompactFileUpload t={t} isView={isView} accept="image/*" value={customerPhoto} onChange={setCustomerPhoto} />
          </Field>
        </div>

        {/* Row 2 of 3 — Contact + ID proofs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <Field t={t} label="Mobile Number" required>
            <PhoneField t={t} isView={isView} code={mobileCountryCode} onCodeChange={setMobileCountryCode} number={mobileNumber} onNumberChange={setMobileNumber} />
          </Field>
          <Field t={t} label="WhatsApp Number" required>
            <PhoneField t={t} isView={isView} icon={<FaWhatsapp size={15} style={{ color: '#25D366', flexShrink: 0 }} />}
              code={whatsappCountryCode} onCodeChange={setWhatsappCountryCode} number={whatsappNumber} onNumberChange={setWhatsappNumber} />
          </Field>
          <Field t={t} label="Aadhar Number">
            <input type="text" placeholder="Enter Aadhar number" value={aadharNumber} readOnly={isView} disabled={isView}
              onChange={(e) => setAadharNumber(e.target.value.replace(/[^\d]/g, ''))} className={fieldClass} />
          </Field>
          <Field t={t} label="Upload Aadhar Card Photo" required>
            <CompactFileUpload t={t} isView={isView} value={aadharPhoto} onChange={setAadharPhoto} />
          </Field>
          <Field t={t} label="Pancard Number">
            <input type="text" placeholder="Enter PAN number" value={pancardNumber} readOnly={isView} disabled={isView}
              onChange={(e) => setPancardNumber(e.target.value.toUpperCase())} className={fieldClass} />
          </Field>
        </div>

        {/* Row 3 of 3 — remaining ID proof, DOB, address, alternate contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Field t={t} label="Upload Pancard Photo" required>
            <CompactFileUpload t={t} isView={isView} value={pancardPhoto} onChange={setPancardPhoto} />
          </Field>
          <Field t={t} label="Date of Birth" required>
            <div className="flex items-center gap-2">
              <input type="date" value={dateOfBirth} readOnly={isView} disabled={isView}
                onClick={openPicker} onFocus={openPicker} onChange={(e) => setDateOfBirth(e.target.value)} className={fieldClass} />
              {age && (
                <div className="rounded-xl px-2 py-2 flex-shrink-0" style={{ background: t.insetBg, border: `1px solid ${t.inputBorder}` }}>
                  <p style={{ fontSize: 9, color: t.textSecondary, margin: 0, fontWeight: 600 }}>Age</p>
                  <p style={{ fontSize: 10.5, color: '#0284c7', margin: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>{age.years}y {age.months}m</p>
                </div>
              )}
            </div>
          </Field>
          <Field t={t} label="Alternate Contact Name">
            <input type="text" placeholder="Enter full name" value={alternatePersonName} readOnly={isView} disabled={isView}
              onChange={(e) => setAlternatePersonName(e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Alternate Contact Mobile">
            <input type="tel" placeholder="Enter mobile number" value={alternatePersonMobile} readOnly={isView} disabled={isView}
              onChange={(e) => setAlternatePersonMobile(e.target.value.replace(/[^\d]/g, ''))} className={fieldClass} />
          </Field>
          <Field t={t} label="Address" required>
            <textarea placeholder="Enter address" value={address} readOnly={isView} disabled={isView} rows={2}
              onChange={(e) => setAddress(e.target.value)} className={fieldClass} style={{ resize: 'vertical' }} />
          </Field>
        </div>
      </div>

      {/* ── Property Booking Details ─────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdApartment size={16} />} title="Property Booking Details" gradient="var(--grad-teal)" />

        {/* Row 1 of 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
          <Field t={t} label="Company Name" required>
            <SearchableSelect t={t} placeholder="Select company" options={companyNameOptions} value={companyName} disabled={isView}
              onChange={setCompanyName} />
          </Field>
          <Field t={t} label="Project Name" required>
            <SearchableSelect t={t} placeholder="Select project" options={projectNameOptions} value={projectName} disabled={isView}
              onChange={(v) => { setProjectName(v); setBuildingName(''); setWingName(''); setFloorLabel(''); setFlatNo(''); }} />
          </Field>
          <Field t={t} label="Location">
            <input type="text" readOnly value={location || '—'} className="cust-field cust-field-view" />
          </Field>
          <Field t={t} label="Building Name">
            <SearchableSelect t={t} placeholder="Select building" options={buildingNameOptions} value={buildingName} disabled={isView}
              onChange={(v) => { setBuildingName(v); setWingName(''); setFloorLabel(''); setFlatNo(''); }} />
          </Field>
          <Field t={t} label="Wing">
            <SearchableSelect
              t={t} placeholder={loadingBuildingDetail ? 'Loading wings...' : 'Select wing'} options={wingNameOptions} value={wingName}
              disabled={isView || !selectedBuilding || loadingBuildingDetail}
              onChange={(v) => { setWingName(v); setFloorLabel(''); setFlatNo(''); }} />
          </Field>
          <Field t={t} label="Floor">
            <SearchableSelect t={t} placeholder="Select floor" options={floorLabelOptions} value={floorLabel} disabled={isView || !selectedWing}
              onChange={(v) => { setFloorLabel(v); setFlatNo(''); }} />
          </Field>
        </div>

        {/* Row 2 of 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <Field t={t} label="Flat No">
            <SearchableSelect
              t={t} placeholder="Select flat number" options={flatNoOptions} value={flatNo} disabled={isView || !selectedFloor}
              onChange={setFlatNo}
              labelFor={(no) => {
                const fl = selectedFloor?.flats.find((f) => f.flat_no === no);
                if (!fl) return no;
                return [no, fl.flat_type, fl.area_sqft != null ? `${fl.area_sqft} Sqft` : null].filter(Boolean).join(' · ');
              }}
            />
          </Field>
          <Field t={t} label="Flat Type">
            <input type="text" readOnly value={selectedFlat?.flat_type || '—'} className="cust-field cust-field-view" />
          </Field>
          <Field t={t} label="Flat Area">
            <input type="text" readOnly value={selectedFlat?.area_sqft != null ? `${selectedFlat.area_sqft} Sqft` : '—'} className="cust-field cust-field-view" />
          </Field>
          <Field t={t} label="Purchase Parking?" required>
            <div className="flex items-center gap-4" style={{ height: 38 }}>
              <RadioOption t={t} label="Yes" selected={wantsParking === 'yes'} disabled={isView} onSelect={() => setWantsParking('yes')} />
              <RadioOption t={t} label="No" selected={wantsParking === 'no'} disabled={isView} onSelect={() => { setWantsParking('no'); setParkingNo(''); }} />
            </div>
          </Field>
          {wantsParking === 'yes' && (
            <Field t={t} label="Parking No?" required>
              <input type="text" placeholder="Enter parking number" value={parkingNo} readOnly={isView} disabled={isView}
                onChange={(e) => setParkingNo(e.target.value)} className={fieldClass} />
            </Field>
          )}
        </div>
      </div>

      {/* ── Payment Details ──────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdPayments size={16} />} title="Payment Details" gradient="var(--grad-green)" />

        {/* Row 1 of 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <Field t={t} label="Total Cost of Flat (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter total cost" value={totalCost} onChange={setTotalCost} />
          </Field>
          <Field t={t} label="Booking Date" required>
            <input type="date" value={bookingDate} readOnly={isView} disabled={isView}
              onClick={openPicker} onFocus={openPicker} onChange={(e) => setBookingDate(e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Booking Amount (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter booking amount" value={bookingAmount} onChange={setBookingAmount} />
          </Field>
          <Field t={t} label="Remaining Booking Amount & Date" required>
            <div className="flex items-center gap-2">
              <AmountField t={t} isView={isView} placeholder="Amount" value={remainingBookingAmount} onChange={setRemainingBookingAmount} />
              <input type="date" value={remainingBookingDate} readOnly={isView} disabled={isView}
                onClick={openPicker} onFocus={openPicker} onChange={(e) => setRemainingBookingDate(e.target.value)} className={fieldClass} />
            </div>
          </Field>
          <Field t={t} label="Possession Amount (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter possession amount" value={possessionAmount} onChange={setPossessionAmount} />
          </Field>
        </div>

        {/* Row 2 of 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <Field t={t} label="Installment Date" required>
            <input type="date" value={installmentDate} readOnly={isView} disabled={isView}
              onClick={openPicker} onFocus={openPicker} onChange={(e) => setInstallmentDate(e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Monthly EMI Before Possession (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter amount" value={monthlyEmiBeforePossession} onChange={setMonthlyEmiBeforePossession} />
          </Field>
          <Field t={t} label="Monthly EMI After Possession (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter amount" value={monthlyEmiAfterPossession} onChange={setMonthlyEmiAfterPossession} />
          </Field>
          <Field t={t} label="Total EMI Tenure (Months)" required>
            {/* Max 99 / 2-digit cap (Task 6) — maxLength blocks typing a 3rd
                digit, and the max clamp inside NumberField covers paste
                edge cases so the stored value can never exceed 99. */}
            <NumberField t={t} isView={isView} placeholder="e.g. 60" value={totalEmiTenure} onChange={setTotalEmiTenure} max={99} maxLength={2} />
          </Field>
          <Field t={t} label="Booster Amount Before Possession (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter amount" value={boosterAmountBeforePossession} onChange={setBoosterAmountBeforePossession} />
          </Field>
        </div>

        {/* Row 3 of 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <Field t={t} label="Booster Amount After Possession (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter amount" value={boosterAmountAfterPossession} onChange={setBoosterAmountAfterPossession} />
          </Field>
          <Field t={t} label="Booster Interval Before Possession (Months)" required>
            <NumberField t={t} isView={isView} placeholder="e.g. 12" value={boosterIntervalBeforePossession} onChange={setBoosterIntervalBeforePossession} />
          </Field>
          <Field t={t} label="Booster Interval After Possession (Months)" required>
            <NumberField t={t} isView={isView} placeholder="e.g. 12" value={boosterIntervalAfterPossession} onChange={setBoosterIntervalAfterPossession} />
          </Field>
          <button type="button" onClick={handlePreview}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold lg:col-span-2"
            style={{ background: t.insetBg, color: '#0284c7', border: `1px solid ${t.inputBorder}`, cursor: 'pointer' }}>
            <MdVisibility size={16} /> Preview Customer Details
          </button>
        </div>
      </div>

      {/* ── Document Upload ──────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdDescription size={16} />} title="Document Upload" gradient="var(--grad-purple)" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field t={t} label="Application Form" required>
            <DocumentDropCard t={t} isView={isView} label="Application Form" value={applicationForm} onChange={setApplicationForm} />
          </Field>
          <Field t={t} label="Declaration Form" required>
            <DocumentDropCard t={t} isView={isView} label="Declaration Form" value={declarationForm} onChange={setDeclarationForm} />
          </Field>
          <Field t={t} label="Allotment Letter" required>
            <DocumentDropCard t={t} isView={isView} label="Allotment Letter" value={allotmentLetter} onChange={setAllotmentLetter} />
          </Field>
        </div>
      </div>

      {/* ── Footer — same shared `master-crud-footer` class every other
          CRUD page (Building/Employee/Company/...) uses: a floating card
          inset 16px from the edges, offset past the sidebar's own width
          via --sidebar-w (set by DashboardLayout), instead of the old
          `cust-crud-footer` which was flush to `left:0` — spanning
          underneath the sidebar itself. Center-aligned buttons, matching
          Building/Employee CRUD's footer layout. ─────────────────────── */}
      <div className="master-crud-footer flex items-center justify-center gap-3 z-10"
        style={{ background: t.surfaceBg, borderColor: t.surfaceBorder }}>
        <button type="button" onClick={() => navigate('/admin/crm/customer-details')} disabled={saving}
          className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold cust-btn-secondary">
          <MdClose size={16} /> Cancel
        </button>
        {!isView && (
          <button type="button" onClick={handleSubmit} disabled={!isFormValid || saving}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white cust-btn-primary"
            style={{ opacity: saving ? 0.8 : 1 }}>
            <MdSave size={17} /> {saving ? 'Saving...' : mode === 'edit' ? 'Update Customer' : 'Create Customer'}
          </button>
        )}
      </div>

      {previewOpen && (
        <CustomerPreviewModal
          onClose={() => setPreviewOpen(false)}
          data={{
            photoUrl: typeof customerPhoto === 'string' ? customerPhoto : null,
            fullName: [firstName, middleName, lastName].filter(Boolean).join(' '),
            email, mobile: mobileNumber ? `${mobileCountryCode} ${mobileNumber}` : '',
            whatsapp: whatsappNumber ? `${whatsappCountryCode} ${whatsappNumber}` : '',
            aadhar: aadharNumber, pan: pancardNumber, address, dob: dateOfBirth,
            age: age ? `${age.years}y ${age.months}m` : '',
            altName: alternatePersonName, altMobile: alternatePersonMobile,
            companyName, projectName, buildingName, wingName, floorLabel,
            flatNo: selectedFlat?.flat_no || flatNo,
            flatType: selectedFlat?.flat_type || '',
            flatArea: selectedFlat?.area_sqft != null ? `${selectedFlat.area_sqft} Sqft` : '',
            parking: wantsParking === 'yes' ? `Yes${parkingNo ? ` · ${parkingNo}` : ''}` : 'No',
            totalCost, bookingDate, bookingAmount, remainingAmount: remainingBookingAmount, remainingDate: remainingBookingDate,
            possessionAmount, installmentDate, emiBefore: monthlyEmiBeforePossession, emiAfter: monthlyEmiAfterPossession, tenure: totalEmiTenure,
            boosterBefore: boosterAmountBeforePossession, boosterAfter: boosterAmountAfterPossession,
            boosterIntervalBefore: boosterIntervalBeforePossession, boosterIntervalAfter: boosterIntervalAfterPossession,
            documents: [
              { label: 'Aadhar Card', value: aadharPhoto },
              { label: 'Pancard', value: pancardPhoto },
              { label: 'Application Form', value: applicationForm },
              { label: 'Declaration Form', value: declarationForm },
              { label: 'Allotment Letter', value: allotmentLetter },
            ],
          }}
        />
      )}
    </div>
  );
};

export default CustomerDetailsCrudPage;
