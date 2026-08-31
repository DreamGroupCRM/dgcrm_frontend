// ==========================================
// DREAM GROUP CRM - CUSTOMER SCHEME VIEW PAGE
// ==========================================
// Reachable from the Customer Details list's "Show Scheme" (MdLoyalty)
// button. Unlike CustomizeSchemePage (a what-if calculator with no real
// customer behind it), this fetches ONE real customer's own saved Payment
// Details from the backend (GET /customers/:id/scheme — see backend
// customer.controller.ts's getCustomerScheme / scheduleGenerator.ts) and
// renders the EMI Scheme summary + EMI Schedule that were actually derived
// from what was entered on that customer's Create/Edit form, alongside the
// customer's own info at the top. Nothing here is editable — it's a report.
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdArrowBack, MdCalculate, MdListAlt, MdPerson, MdApartment, MdPhone,
  MdEmail, MdChat, MdLocationOn, MdBadge,
} from 'react-icons/md';

import { AppTheme } from '../../../../styles/theme';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { fetchCustomerScheme } from '../../../../services/customerDetailsService';
import { CustomerSchemeData, CustomerSchemeSummaryRow, CustomerScheduleRow } from '../../../../types/index';

type Theme = AppTheme;

const FOOTER_HEIGHT = 76;

const formatINR = (n: number): string => `₹ ${Math.max(0, Math.round(n || 0)).toLocaleString('en-IN')}`;

// Schedule rows come from the backend already as 'yyyy-mm-dd' strings; the
// customer info block's booking_date is a raw TypeORM Date column instead,
// which serializes as a full ISO timestamp ('2026-08-10T00:00:00.000Z') —
// slicing to the first 10 chars normalizes both to the same 'yyyy-mm-dd'
// shape before splitting, so neither format renders garbled.
const formatDMY = (iso: string | null): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
};

const fullName = (c: CustomerSchemeData['customer']): string =>
  [c.name, c.middle_name, c.last_name].filter(Boolean).join(' ') || c.customer_code;

// ── module-scope sub-components — same "outside the page function" rule
//    established throughout this app, so nothing here remounts on re-render. ──
const SectionCard: React.FC<{ t: Theme; isDark: boolean; children: React.ReactNode; className?: string }> = ({ t, isDark, children, className }) => (
  <div className={`rounded-2xl mb-5 overflow-hidden ${className || ''}`} style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)' }}>
    {children}
  </div>
);

const ResultPanelHeader: React.FC<{ icon: React.ReactNode; title: string; gradient: string; subtitle: string }> = ({ icon, title, gradient, subtitle }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 py-4" style={{ background: gradient }}>
    <div className="flex items-center gap-2.5">
      <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)' }}>
        {icon}
      </span>
      <h2 style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
    </div>
    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{subtitle}</div>
  </div>
);

const InfoField: React.FC<{ t: Theme; icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ t, icon, label, value }) => (
  <div className="flex items-start gap-2.5">
    <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.15)', color: '#fff', marginTop: 1 }}>
      {icon}
    </span>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>
  </div>
);

const SummaryTable: React.FC<{ t: Theme; accent: string; heading: string; rows: CustomerSchemeSummaryRow[]; total: number; totalLabel: string }> = ({ t, accent, heading, rows, total, totalLabel }) => (
  <div className="mb-5">
    <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>{heading}</div>
    <div style={{ overflowX: 'auto', border: `1px solid ${t.surfaceBorder}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
        <thead>
          <tr style={{ background: t.insetBg }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 40 }}>#</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Payment Details</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${t.divider}` }}>
              <td style={{ padding: '8px 12px', fontSize: 11.5, color: t.textSecondary }}>{i + 1}</td>
              <td style={{ padding: '8px 12px', fontSize: 12, color: t.textPrimary }}>{r.label}</td>
              <td style={{ padding: '8px 12px', fontSize: 12, color: t.textPrimary, textAlign: 'right', fontWeight: 600 }}>{formatINR(r.amount)}</td>
            </tr>
          ))}
          <tr style={{ borderTop: `1px solid ${t.surfaceBorder}`, background: t.insetBg }}>
            <td colSpan={2} style={{ padding: '9px 12px', fontSize: 12, fontWeight: 700, color: t.textPrimary }}>{totalLabel}</td>
            <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 800, color: accent, textAlign: 'right' }}>{formatINR(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const ScheduleTable: React.FC<{ t: Theme; accent: string; section: 'A' | 'B'; rows: CustomerScheduleRow[]; total: number; totalLabel: string }> = ({ t, accent, section, rows, total, totalLabel }) => (
  <div className="mb-5">
    <div style={{ overflowX: 'auto', border: `1px solid ${t.surfaceBorder}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
        <thead>
          <tr style={{ background: t.insetBg }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 56 }}>Sr No</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 110 }}>Inst Date</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>({section}) Mode Of Payment</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', fontSize: 11.5, color: t.textSecondary }}>No installments in this phase.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.sr} style={{ borderTop: `1px solid ${t.divider}` }}>
              <td style={{ padding: '7px 12px', fontSize: 11.5, color: t.textSecondary }}>{r.sr}</td>
              <td style={{ padding: '7px 12px', fontSize: 11.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>{formatDMY(r.date)}</td>
              <td style={{ padding: '7px 12px', fontSize: 11.5, color: t.textPrimary }}>{r.label}</td>
              <td style={{ padding: '7px 12px', fontSize: 11.5, color: t.textPrimary, textAlign: 'right', fontWeight: 600 }}>{formatINR(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginTop: 8 }}>
      {totalLabel} : <span style={{ color: accent }}>{formatINR(total)}</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
const CustomerSchemeViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark, t, accent } = useAppearanceTokens();

  const [data, setData] = useState<CustomerSchemeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCustomerScheme(id)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.message || 'Failed to load customer scheme.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load customer scheme.');
          toast.error('Failed to load customer scheme.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const goBack = () => navigate('/admin/crm/customer-details');

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '50vh', fontFamily: t.fontFamily, color: t.textSecondary, fontSize: 12.5 }}>
        Loading customer scheme...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 16 }}>
        <div className="rounded-2xl p-6 text-center" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, color: t.textSecondary, fontSize: 12 }}>
          {error || 'Customer not found.'}
        </div>
        <div className="master-crud-footer flex items-center justify-center" style={{ background: t.surfaceBg, borderColor: t.surfaceBorder }}>
          <button type="button" onClick={goBack}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: t.surfaceBg, color: t.textPrimary, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}>
            <MdArrowBack size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const c = data.customer;
  const flatLine = [c.building_name, c.wing_name, c.flat_no ? `Flat ${c.flat_no}` : null].filter(Boolean).join(' · ');

  // Item 12: "your payment will be end as on" — the last dated row across
  // both schedule phases, i.e. whichever of scheduleB/scheduleA actually
  // has rows (scheduleB is the later phase when it exists at all).
  const finalScheduleRow = data.scheduleB.length > 0
    ? data.scheduleB[data.scheduleB.length - 1]
    : data.scheduleA[data.scheduleA.length - 1];
  const paymentsCompleteBy = finalScheduleRow?.date ?? null;

  return (
    <div style={{ fontFamily: t.fontFamily, paddingBottom: FOOTER_HEIGHT + 16 }}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }}>
          <MdCalculate size={22} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 19.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Customer Scheme</h1>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '2px 0 0' }}>EMI Scheme &amp; Schedule computed from this customer's saved Payment Details</p>
        </div>
      </div>

      {/* ── Customer Info ───────────────────────────────────────────── */}
      <SectionCard t={t} isDark={isDark}>
        <div className="px-5 sm:px-6 py-5" style={{ background: 'var(--grad-sky)' }}>
          <div className="flex items-center gap-3.5 mb-5">
            {c.customer_image ? (
              <img src={c.customer_image} alt="" className="rounded-full flex-shrink-0" style={{ width: 56, height: 56, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }} />
            ) : (
              <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 17.5, fontWeight: 800 }}>
                {fullName(c).charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{fullName(c)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{c.customer_code}{flatLine ? ` · ${flatLine}` : ''}</div>
            </div>
          </div>
          <div className="grid gap-x-5 gap-y-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            <InfoField t={t} icon={<MdPhone size={15} />} label="Mobile" value={c.mobile_number} />
            <InfoField t={t} icon={<MdChat size={15} />} label="WhatsApp" value={c.whatsapp_number} />
            <InfoField t={t} icon={<MdEmail size={15} />} label="Email" value={c.email} />
            <InfoField t={t} icon={<MdLocationOn size={15} />} label="Address" value={c.address} />
            <InfoField t={t} icon={<MdApartment size={15} />} label="Building / Wing" value={[c.building_name, c.wing_name].filter(Boolean).join(' / ')} />
            <InfoField t={t} icon={<MdBadge size={15} />} label="Flat" value={[c.flat_no, c.flat_type].filter(Boolean).join(' · ')} />
            <InfoField t={t} icon={<MdApartment size={15} />} label="Area (Sq.Ft.)" value={c.area_sqft} />
            <InfoField t={t} icon={<MdPerson size={15} />} label="Booking Date" value={formatDMY(c.booking_date)} />
          </div>
        </div>
      </SectionCard>

      {/* ── Item 12: "your payment will be end as on" — highlighted final
          payment date, computed from the last row of whichever schedule
          phase actually has one (see paymentsCompleteBy above). ────────── */}
      {paymentsCompleteBy && (
        <div
          className="flex items-center gap-3 rounded-2xl mb-5 px-5 py-4"
          style={{ background: isDark ? 'rgba(16,185,129,0.14)' : '#ecfdf5', border: `1px solid ${isDark ? 'rgba(16,185,129,0.35)' : '#a7f3d0'}` }}
        >
          <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 38, height: 38, background: isDark ? 'rgba(16,185,129,0.25)' : '#d1fae5' }}>
            <MdCalculate size={19} style={{ color: '#059669' }} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.4 }}>Payments Complete By</div>
            <div style={{ fontSize: 16.5, fontWeight: 800, color: isDark ? '#6ee7b7' : '#047857' }}>{formatDMY(paymentsCompleteBy)}</div>
          </div>
        </div>
      )}

      {/* ── EMI Scheme summary ──────────────────────────────────────── */}
      <SectionCard t={t} isDark={isDark}>
        <ResultPanelHeader
          icon={<MdCalculate size={17} color="#fff" />} title="EMI Scheme"
          gradient="var(--grad-sky)"
          subtitle={`Total Cost of Flat: ${formatINR(c.flat_amount)}`}
        />
        <div className="p-5 sm:p-6">
          <SummaryTable t={t} accent={accent} heading="A) Mode of Payment (Before Possession)" rows={data.summaryA} total={data.totalA} totalLabel="Total (A) (Before Possession)" />
          <SummaryTable t={t} accent={accent} heading="B) After Possession" rows={data.summaryB} total={data.totalB} totalLabel="Total (B) (After Possession)" />
          <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: isDark ? 'rgba(67,56,202,0.12)' : '#eef2ff' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>Total Cost of Flat (A + B)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: accent }}>{formatINR(data.grandTotal)}</span>
          </div>
        </div>
      </SectionCard>

      {/* ── EMI Schedule — full dated breakdown ─────────────────────── */}
      <SectionCard t={t} isDark={isDark}>
        <ResultPanelHeader
          icon={<MdListAlt size={17} color="#fff" />} title="EMI Schedule"
          gradient="var(--grad-green)"
          subtitle={`Schedule ${formatINR(c.flat_amount)}`}
        />
        <div className="p-5 sm:p-6">
          <ScheduleTable t={t} accent={accent} section="A" rows={data.scheduleA} total={data.totalA} totalLabel="(A) Total Before Possession" />
          <ScheduleTable t={t} accent={accent} section="B" rows={data.scheduleB} total={data.totalB} totalLabel="(B) Total After Possession" />
          <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: isDark ? 'rgba(67,56,202,0.12)' : '#eef2ff' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>Total (A + B)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: accent }}>{formatINR(data.grandTotal)}</span>
          </div>
        </div>
      </SectionCard>

      {/* ── Footer — same shared `master-crud-footer` class every other
          CRUD page uses: a floating card inset 16px from the edges,
          offset past the sidebar via --sidebar-w, instead of a raw
          `left:0` fixed bar that spanned underneath the sidebar itself.
          Single centered "Go Back" button (unlike the CRUD pages'
          right-aligned Cancel/Save pair — this page is a read-only
          report, not a form) — same Go Back behavior as before. ──────── */}
      <div className="master-crud-footer flex items-center justify-center" style={{ background: t.surfaceBg, borderColor: t.surfaceBorder }}>
        <button type="button" onClick={goBack}
          className="flex items-center gap-1.5 px-8 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: t.surfaceBg, color: t.textPrimary, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}>
          <MdArrowBack size={16} /> Go Back
        </button>
      </div>
    </div>
  );
};

export default CustomerSchemeViewPage;
