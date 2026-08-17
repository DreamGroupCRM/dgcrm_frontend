// ==========================================
// DREAM GROUP CRM - CUSTOMER DETAILS CRUD PAGE
// ==========================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack, MdSave, MdPerson, MdApartment, MdClose, MdKeyboardArrowDown } from 'react-icons/md';

import { useAppSelector } from '../../../../hooks';
import { getTheme } from '../../../../styles/theme';
import { fetchCustomerById, createCustomer, updateCustomer } from '../../../../services/customerDetailsService';
import { fetchBuildingList } from '../../../../services/buildingService';
import { Building, CreateCustomerPayload } from '../../../../types/index';

type Mode = 'add' | 'edit' | 'view';
interface Props { mode: Mode; }
type Theme = ReturnType<typeof getTheme>;

// ── module-scope helpers only — nothing defined inside the page component,
// so typing in any field never remounts inputs and never loses focus. ────
const getFieldStyle = (t: Theme, isView: boolean): React.CSSProperties => ({
  width: '100%', background: isView ? t.insetBg : t.inputBg,
  border: `1px solid ${t.inputBorder}`, borderRadius: 10, padding: '9px 12px',
  fontSize: 13.5, color: t.inputText, outline: 'none', fontFamily: t.fontFamily,
});
const getLabelStyle = (t: Theme): React.CSSProperties => ({
  display: 'block', fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: 6,
});

const SectionHeader: React.FC<{ t: Theme; icon: React.ReactNode; title: string; color: string }> = ({ t, icon, title, color }) => (
  <div className="flex items-center gap-2.5 mb-5">
    <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, background: `${color}1a`, color }}>
      {icon}
    </span>
    <h2 style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, margin: 0 }}>{title}</h2>
  </div>
);

const Field: React.FC<{ t: Theme; label: string; required?: boolean; children: React.ReactNode; className?: string }> = ({ t, label, required, children, className }) => (
  <div className={className}>
    <label style={getLabelStyle(t)}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
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
}> = ({ t, placeholder, options, value, onChange, disabled }) => {
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
          style={{ background: 'transparent', border: 'none', outline: 'none', color: t.inputText, fontSize: 13.5, width: '100%' }}
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
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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

  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [wingName, setWingName] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [monthlyEmi, setMonthlyEmi] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchBuildingList(1, 1000);
        if (res.success) setBuildings(res.rows ?? []);
      } catch { /* dropdown just stays empty if this fails */ }
    })();
  }, []);

  useEffect(() => {
    if (mode === 'add' || !id) return;
    (async () => {
      setFetching(true);
      try {
        const res = await fetchCustomerById(id);
        if (res.success && res.data) {
          const c = res.data;
          setCustomerName(c.customer_name || '');
          setMobileNumber(c.mobile_number || '');
          setEmail(c.email || '');
          setBuildingName(c.building_name || '');
          setWingName(c.wing_name || '');
          setFlatNo(c.flat_no || '');
          setBookingDate(c.booking_date || '');
          setMonthlyEmi(c.monthly_emi != null ? String(c.monthly_emi) : '');
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

  // ── cascading Building -> Wing -> Flat, sourced live from the Building module ──
  const buildingNameOptions = useMemo(() => Array.from(new Set(buildings.map((b) => b.building_name))), [buildings]);
  const selectedBuilding = useMemo(() => buildings.find((b) => b.building_name === buildingName), [buildings, buildingName]);
  const wingNameOptions = useMemo(() => selectedBuilding ? selectedBuilding.wings.map((w) => w.name) : [], [selectedBuilding]);
  const selectedWing = useMemo(() => selectedBuilding?.wings.find((w) => w.name === wingName), [selectedBuilding, wingName]);
  const flatNoOptions = useMemo(
    () => selectedWing ? selectedWing.floors.flatMap((f) => f.flats.map((fl) => fl.flat_no)) : [],
    [selectedWing]
  );
  const selectedFlat = useMemo(
    () => selectedWing?.floors.flatMap((f) => f.flats).find((fl) => fl.flat_no === flatNo),
    [selectedWing, flatNo]
  );

  const isFormValid =
    customerName.trim() !== '' && mobileNumber.trim() !== '' && email.trim() !== '' &&
    buildingName.trim() !== '' && wingName.trim() !== '' && flatNo.trim() !== '' &&
    bookingDate !== '' && monthlyEmi.trim() !== '';

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error('Please fill all mandatory fields.');
      return;
    }
    if (!selectedBuilding || !selectedWing || !selectedFlat) {
      toast.error('Please select a valid Building, Wing and Flat.');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateCustomerPayload = {
        customer_name: customerName.trim(),
        mobile_number: mobileNumber.trim(),
        email: email.trim(),
        building_id: selectedBuilding.id,
        wing_id: selectedWing.id,
        flat_id: selectedFlat.id,
        flat_type: selectedFlat.flat_type,
        area_sqft: selectedFlat.area_sqft,
        booking_date: bookingDate,
        monthly_emi: monthlyEmi ? Number(monthlyEmi) : null,
        is_active: isActive,
      };
      if (mode === 'edit' && id) {
        await updateCustomer(id, payload);
        toast.success('Customer Updated Successfully');
      } else {
        await createCustomer(payload);
        toast.success('Customer Created Successfully');
      }
      navigate('/admin/crm/customer-details');
    } catch {
      toast.error(mode === 'edit' ? 'Failed to update customer.' : 'Failed to create customer.');
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = getFieldStyle(t, isView);

  if (fetching) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300, color: t.textSecondary, fontFamily: t.fontFamily }}>
        Loading customer details...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.fontFamily }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate('/admin/crm/customer-details')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textPrimary, padding: 6 }}>
          <MdArrowBack size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: t.textPrimary, margin: 0 }}>
            {mode === 'add' ? 'Add Customer' : mode === 'edit' ? 'Edit Customer' : 'View Customer'}
          </h1>
          <p style={{ fontSize: 12.5, color: t.textSecondary, margin: '2px 0 0' }}>
            {mode === 'add' ? 'Add new customer details' : 'Customer details'}
          </p>
        </div>
      </div>

      {/* ── Customer Details ─────────────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdPerson size={16} />} title="Customer Details" color="#4338ca" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <Field t={t} label="Customer Name" required>
            <input type="text" placeholder="Enter customer name" value={customerName} readOnly={isView} disabled={isView}
              onChange={(e) => setCustomerName(e.target.value)} style={fieldStyle} />
          </Field>
          <Field t={t} label="Mobile Number" required>
            <input type="tel" placeholder="Enter mobile number" value={mobileNumber} readOnly={isView} disabled={isView}
              onChange={(e) => setMobileNumber(e.target.value.replace(/[^\d]/g, ''))} style={fieldStyle} />
          </Field>
          <Field t={t} label="Email" required>
            <input type="email" placeholder="Enter email address" value={email} readOnly={isView} disabled={isView}
              onChange={(e) => setEmail(e.target.value)} style={fieldStyle} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field t={t} label="Flat Booking Date" required>
            <input type="date" value={bookingDate} readOnly={isView} disabled={isView}
              onChange={(e) => setBookingDate(e.target.value)} style={fieldStyle} />
          </Field>
          <Field t={t} label="Monthly EMI Amount" required>
            <div className="flex items-center gap-2" style={{ ...fieldStyle, padding: '0 12px' }}>
              <span style={{ color: t.textSecondary }}>₹</span>
              <input
                type="number" placeholder="Enter monthly EMI" value={monthlyEmi} readOnly={isView} disabled={isView}
                onChange={(e) => setMonthlyEmi(e.target.value.replace(/[^\d.]/g, ''))}
                style={{ border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', width: '100%', color: t.inputText, fontSize: 13.5, fontFamily: t.fontFamily }}
              />
            </div>
          </Field>
        </div>
      </div>

      {/* ── Project / Flat Details ───────────────────────────────────── */}
      <div className="rounded-2xl mb-5 p-5 sm:p-6" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <SectionHeader t={t} icon={<MdApartment size={16} />} title="Project / Flat Details" color="#0891b2" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Field t={t} label="Building Name" required>
            <SearchableSelect t={t} placeholder="Select building" options={buildingNameOptions} value={buildingName} disabled={isView}
              onChange={(v) => { setBuildingName(v); setWingName(''); setFlatNo(''); }} />
          </Field>
          <Field t={t} label="Wing" required>
            <SearchableSelect t={t} placeholder="Select wing" options={wingNameOptions} value={wingName} disabled={isView || !selectedBuilding}
              onChange={(v) => { setWingName(v); setFlatNo(''); }} />
          </Field>
          <Field t={t} label="Flat No" required>
            <SearchableSelect t={t} placeholder="Select flat number" options={flatNoOptions} value={flatNo} disabled={isView || !selectedWing}
              onChange={setFlatNo} />
          </Field>
          <Field t={t} label="Flat Type">
            <input type="text" readOnly value={selectedFlat?.flat_type || '—'} style={{ ...fieldStyle, background: t.insetBg }} />
          </Field>
        </div>

        <div style={{ maxWidth: 220 }}>
          <Field t={t} label="Flat Area (Sq Ft)">
            <input type="text" readOnly value={selectedFlat?.area_sqft != null ? String(selectedFlat.area_sqft) : '—'} style={{ ...fieldStyle, background: t.insetBg }} />
          </Field>
        </div>
      </div>

      {/* ── Action Buttons ───────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 mt-6">
        <button type="button" onClick={() => navigate('/admin/crm/customer-details')} disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: t.surfaceBg, color: t.textPrimary, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}>
          Cancel
        </button>
        {!isView && (
          <button type="button" onClick={handleSubmit} disabled={!isFormValid || saving}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{
              background: !isFormValid || saving ? '#9ca3af' : 'linear-gradient(135deg,#4338ca,#4f46e5)',
              border: 'none', cursor: !isFormValid || saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.8 : 1,
            }}>
            <MdSave size={17} /> {saving ? 'Saving...' : 'Save Customer'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailsCrudPage;
