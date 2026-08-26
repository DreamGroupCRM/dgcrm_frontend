// ==========================================
// DREAM GROUP CRM - CUSTOMER DETAILS CRUD PAGE
// ==========================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdArrowBack, MdSave, MdPerson, MdApartment, MdClose, MdKeyboardArrowDown,
  MdCameraAlt, MdDelete, MdInsertDriveFile, MdCloudUpload,
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
import { Building, ParkingChoice } from '../../../../types/index';
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

const SectionHeader: React.FC<{ t: Theme; icon: React.ReactNode; title: string; color: string; badge?: string }> = ({ t, icon, title, color, badge }) => (
  <div className="flex items-center gap-2.5 mb-5">
    <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, background: `${color}1a`, color }}>
      {icon}
    </span>
    <h2 className="cust-section-title">{title}</h2>
    {badge && (
      <span className="rounded-lg" style={{ fontSize: 10.5, fontWeight: 700, color: '#4338ca', background: '#4338ca1a', padding: '3px 10px' }}>
        {badge}
      </span>
    )}
  </div>
);

const SubHeading: React.FC<{ t: Theme; title: string }> = ({ t, title }) => (
<<<<<<< HEAD
  <p style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, margin: '0 0 12px', textTransform: 'camelcase', letterSpacing: 0.4 }}>{title}</p>
=======
  <p className="cust-subheading">{title}</p>
>>>>>>> V_16.0
);

const Field: React.FC<{ t: Theme; label: string; required?: boolean; children: React.ReactNode; className?: string }> = ({ t, label, required, children, className }) => (
  <div className={className}>
    <label className="cust-label">{label}{required && <span className="cust-required"> *</span>}</label>
    {children}
  </div>
);

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

// Circular avatar upload with a camera badge — Customer Photo.
const PhotoUploadCircle: React.FC<{ t: Theme; isView?: boolean; value: FileValue; onChange: (f: File | null) => void }> = ({ t, isView, value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(typeof value === 'string' ? value : null);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-2">
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      <div style={{ position: 'relative', width: 88, height: 88 }}>
        <div className="rounded-full flex items-center justify-center overflow-hidden"
          style={{ width: 88, height: 88, background: t.insetBg, border: `1px solid ${t.inputBorder}` }}>
          {preview ? <img src={preview} alt="Customer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <MdPerson size={36} style={{ color: t.textSecondary }} />}
        </div>
        {!isView && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center rounded-full"
            style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, background: '#4338ca', border: `2px solid ${t.surfaceBg}`, cursor: 'pointer', color: '#fff' }}>
            <MdCameraAlt size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

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
          <MdInsertDriveFile size={16} style={{ color: '#4338ca', flexShrink: 0 }} />
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
      <MdCloudUpload size={26} style={{ color: '#4338ca', margin: '0 auto 6px' }} />
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
          style={{ background: 'transparent', border: 'none', cursor: isView ? 'not-allowed' : 'pointer', color: '#4338ca', fontSize: 11, fontWeight: 700, fontFamily: t.fontFamily }}>
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
    {selected ? <MdRadioButtonChecked size={18} style={{ color: '#4338ca' }} /> : <MdRadioButtonUnchecked size={18} style={{ color: t.textSecondary }} />}
    <span style={{ fontSize: 12, color: t.textPrimary, fontWeight: 600 }}>{label}</span>
  </button>
);

// A ₹-amount input — shared by every currency field in Payment Details.
const AmountField: React.FC<{ t: Theme; isView?: boolean; disabled?: boolean; placeholder: string; value: string; onChange: (v: string) => void }> = ({ t, isView, disabled, placeholder, value, onChange }) => (
  <div className={`flex items-center gap-2 ${fieldClassName(!!isView || !!disabled)}`} style={{ padding: '0 12px' }}>
    <span style={{ color: t.textSecondary }}>₹</span>
    <input type="text" inputMode="decimal" placeholder={placeholder} value={value} readOnly={isView || disabled} disabled={isView || disabled}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
      style={{ border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', width: '100%', color: t.inputText, fontSize: 12, fontFamily: t.fontFamily }} />
  </div>
);

// A plain-number input — months / tenure fields.
const NumberField: React.FC<{ t: Theme; isView?: boolean; placeholder: string; value: string; onChange: (v: string) => void }> = ({ t, isView, placeholder, value, onChange }) => (
  <input type="text" inputMode="numeric" placeholder={placeholder} value={value} readOnly={isView} disabled={isView}
    onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))} className={fieldClassName(!!isView)} />
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

  useEffect(() => {
    (async () => {
      try {
        const res = await FetchBuildingList(1, 1000);
        if (res.success) setBuildings(res.rows ?? []);
      } catch { /* dropdowns just stay empty if this fails */ }
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

  const handlePreview = () => {
    toast.info('Preview is not available yet.');
  };

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
      formData.append('building_id', selectedBuilding?.id || '');
      formData.append('building_name', selectedBuilding?.building_name || buildingName.trim());
      formData.append('wing_id', selectedWing?.id || '');
      formData.append('wing_name', selectedWing?.name || wingName.trim());
      formData.append('floor_id', selectedFloor?.id || '');
      formData.append('floor_label', selectedFloor?.label || floorLabel.trim());
      formData.append('flat_id', selectedFlat?.id || '');
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
    } catch {
      toast.error(mode === 'edit' ? 'Failed to update customer.' : 'Failed to create customer.');
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
    '--cust-surface-bg': t.surfaceBg, '--cust-surface-border': t.surfaceBorder,
  } as React.CSSProperties;

  return (
    <div style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 16, ...cssVars }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
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

      {/* ── Customer Details (Personal Details) ──────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdPerson size={16} />} title="Customer Details" color="#4338ca" badge={customerCode || undefined} />
        <SubHeading t={t} title="Personal Details" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          </div>
          <Field t={t} label="Customer Photo" required className="flex flex-col items-center justify-start">
            <PhotoUploadCircle t={t} isView={isView} value={customerPhoto} onChange={setCustomerPhoto} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <Field t={t} label="Email ID" required>
            <input type="email" placeholder="Enter email address" value={email} readOnly={isView} disabled={isView}
              onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Mobile Number" required>
            <PhoneField t={t} isView={isView} code={mobileCountryCode} onCodeChange={setMobileCountryCode} number={mobileNumber} onNumberChange={setMobileNumber} />
          </Field>
          <Field t={t} label="WhatsApp Number" required>
            <PhoneField t={t} isView={isView} icon={<FaWhatsapp size={15} style={{ color: '#25D366', flexShrink: 0 }} />}
              code={whatsappCountryCode} onCodeChange={setWhatsappCountryCode} number={whatsappNumber} onNumberChange={setWhatsappNumber} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
          <Field t={t} label="Upload Pancard Photo" required>
            <CompactFileUpload t={t} isView={isView} value={pancardPhoto} onChange={setPancardPhoto} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Field t={t} label="Address" required>
            <textarea placeholder="Enter address" value={address} readOnly={isView} disabled={isView} rows={3}
              onChange={(e) => setAddress(e.target.value)} className={fieldClass} style={{ resize: 'vertical' }} />
          </Field>
          <Field t={t} label="Date of Birth" required>
            <div className="flex items-center gap-3">
              <input type="date" value={dateOfBirth} readOnly={isView} disabled={isView}
                onClick={openPicker} onFocus={openPicker} onChange={(e) => setDateOfBirth(e.target.value)} className={fieldClass} />
              {age && (
                <div className="rounded-xl px-3 py-2 flex-shrink-0" style={{ background: t.insetBg, border: `1px solid ${t.inputBorder}` }}>
                  <p style={{ fontSize: 10, color: t.textSecondary, margin: 0, fontWeight: 600 }}>Age</p>
                  <p style={{ fontSize: 11.5, color: '#4338ca', margin: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>{age.years} Years&nbsp;&nbsp;{age.months} Months</p>
                </div>
              )}
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field t={t} label="Alternate Person to Contact (Full Name)">
            <input type="text" placeholder="Enter full name" value={alternatePersonName} readOnly={isView} disabled={isView}
              onChange={(e) => setAlternatePersonName(e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Alternate Person Mobile Number">
            <input type="tel" placeholder="Enter mobile number" value={alternatePersonMobile} readOnly={isView} disabled={isView}
              onChange={(e) => setAlternatePersonMobile(e.target.value.replace(/[^\d]/g, ''))} className={fieldClass} />
          </Field>
        </div>
      </div>

      {/* ── Property Booking Details ─────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdApartment size={16} />} title="Property Booking Details" color="#0891b2" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Field t={t} label="Company Name" required>
            <input type="text" placeholder="Enter company name" value={companyName} readOnly={isView} disabled={isView}
              onChange={(e) => setCompanyName(e.target.value)} className={fieldClass} />
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field t={t} label="Do you Want to Purchase Parking?" required>
            <div className="flex items-center gap-6" style={{ height: 38 }}>
              <RadioOption t={t} label="Yes" selected={wantsParking === 'yes'} disabled={isView} onSelect={() => setWantsParking('yes')} />
              <RadioOption t={t} label="No" selected={wantsParking === 'no'} disabled={isView} onSelect={() => { setWantsParking('no'); setParkingNo(''); }} />
            </div>
          </Field>
          {wantsParking === 'yes' && (
            <Field t={t} label="Which is the Parking No?" required>
              <input type="text" placeholder="Enter parking number" value={parkingNo} readOnly={isView} disabled={isView}
                onChange={(e) => setParkingNo(e.target.value)} className={fieldClass} />
            </Field>
          )}
        </div>
      </div>

      {/* ── Payment Details ──────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdPayments size={16} />} title="Payment Details" color="#059669" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Field t={t} label="Possession Amount (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter possession amount" value={possessionAmount} onChange={setPossessionAmount} />
          </Field>
          <Field t={t} label="Installment Date" required>
            <input type="date" value={installmentDate} readOnly={isView} disabled={isView}
              onClick={openPicker} onFocus={openPicker} onChange={(e) => setInstallmentDate(e.target.value)} className={fieldClass} />
          </Field>
          <Field t={t} label="Monthly EMI Amount Before Possession (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter amount" value={monthlyEmiBeforePossession} onChange={setMonthlyEmiBeforePossession} />
          </Field>
          <Field t={t} label="Monthly EMI Amount After Possession (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter amount" value={monthlyEmiAfterPossession} onChange={setMonthlyEmiAfterPossession} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 items-end">
          <Field t={t} label="Total EMI Tenure (Months)" required>
            <NumberField t={t} isView={isView} placeholder="e.g. 60" value={totalEmiTenure} onChange={setTotalEmiTenure} />
          </Field>
          <Field t={t} label="Booster Amount Before Possession (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter amount" value={boosterAmountBeforePossession} onChange={setBoosterAmountBeforePossession} />
          </Field>
          <Field t={t} label="Booster Amount After Possession (₹)" required>
            <AmountField t={t} isView={isView} placeholder="Enter amount" value={boosterAmountAfterPossession} onChange={setBoosterAmountAfterPossession} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <Field t={t} label="Booster Interval Before Possession (Months)" required>
            <NumberField t={t} isView={isView} placeholder="e.g. 12" value={boosterIntervalBeforePossession} onChange={setBoosterIntervalBeforePossession} />
          </Field>
          <Field t={t} label="Booster Interval After Possession (Months)" required>
            <NumberField t={t} isView={isView} placeholder="e.g. 12" value={boosterIntervalAfterPossession} onChange={setBoosterIntervalAfterPossession} />
          </Field>
          <button type="button" onClick={handlePreview}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: t.insetBg, color: '#4338ca', border: `1px solid ${t.inputBorder}`, cursor: 'pointer' }}>
            <MdVisibility size={16} /> Preview Customer Details
          </button>
        </div>
      </div>

      {/* ── Document Upload ──────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdDescription size={16} />} title="Document Upload" color="#c026d3" />

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

      {/* ── Footer — fixed to the viewport bottom, always visible, not
          just once you scroll all the way down. ───────────────────────── */}
      <div className="cust-crud-footer flex items-center justify-end gap-3">
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
    </div>
  );
};

export default CustomerDetailsCrudPage;
