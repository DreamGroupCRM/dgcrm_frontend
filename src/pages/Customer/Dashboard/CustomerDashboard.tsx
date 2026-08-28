// ==========================================
// DREAM GROUP CRM - CUSTOMER DASHBOARD (item 17)
// ==========================================
// Replaces the earlier placeholder with the real customer-facing portal:
// booking overview, personal details, documents, the same per-installment
// Due grid staff see on Payment Dues (read-only here — a customer can view
// but not collect payment), and full payment history. Every call goes
// through /api/customer-portal/*, which is ownership-scoped to this login
// server-side (see customerPortal.repository.ts) — a customer can only
// ever see their own booking(s), never another customer's by guessing an id.
//
// A login can be linked to more than one booking (item 17: "handle if
// someone has multiple flats") — when fetchMyBookings returns more than
// one row, a tab strip lets the customer switch between them; the rest of
// the page always reflects whichever booking is currently selected.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { logoutThunk } from '../../../redux/thunks/authThunks';
import { fetchProfileThunk } from '../../../redux/thunks/profileThunks';
import { ROUTES } from '../../../constants';
import { getTheme } from '../../../styles/theme';
import { CircularProgress } from '@mui/material';
import {
  MdLogout, MdApartment, MdCall, MdEmail, MdHome, MdCalendarToday, MdCheckCircle,
  MdErrorOutline, MdSchedule, MdDescription, MdCreditCard, MdBadge,
} from 'react-icons/md';
import Logo from '../../../components/ui/Logo';
import StatCard from '../../../components/masters/StatCard';
import { formatDate } from '../../../utils';
import { paymentForLabel } from '../../../services/paymentService';
import {
  fetchMyBookings, fetchMyBookingDetail, fetchMyBookingPayments, fetchMyBookingDueGrid,
  PortalBookingSummary, PortalBookingDetail, PortalPaymentRow, PortalDueGrid,
} from '../../../services/customerPortalService';

type Theme = ReturnType<typeof getTheme>;

const rupee = (n: number): string => `₹ ${n.toLocaleString('en-IN')}`;

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  paid: { label: 'Paid', color: '#16a34a', bg: '#dcfce7', icon: MdCheckCircle },
  due: { label: 'Due', color: '#dc2626', bg: '#fee2e2', icon: MdErrorOutline },
  upcoming: { label: 'Upcoming', color: '#ea580c', bg: '#ffedd5', icon: MdSchedule },
};
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const m = STATUS_META[status] ?? STATUS_META.upcoming;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold" style={{ background: m.bg, color: m.color, fontSize: 11 }}>
      <Icon size={13} /> {m.label}
    </span>
  );
};
const ApprovalPill: React.FC<{ approved: boolean }> = ({ approved }) => (
  <span
    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold"
    style={{ background: approved ? '#dcfce7' : '#ffedd5', color: approved ? '#16a34a' : '#ea580c', fontSize: 11 }}
  >
    {approved ? <MdCheckCircle size={13} /> : <MdSchedule size={13} />} {approved ? 'Approved' : 'Pending Approval'}
  </span>
);

const Section: React.FC<{ t: Theme; title: string; icon: React.ElementType; children: React.ReactNode }> = ({ t, title, icon: Icon, children }) => (
  <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 20, marginBottom: 18 }}>
    <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
      <Icon size={18} style={{ color: t.hoverText }} />
      <h2 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, margin: 0 }}>{title}</h2>
    </div>
    {children}
  </div>
);

const Field: React.FC<{ t: Theme; label: string; value: React.ReactNode }> = ({ t, label, value }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13.5, color: t.textPrimary, fontWeight: 500 }}>{value || <span style={{ color: t.textMuted }}>—</span>}</div>
  </div>
);

const CustomerDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const { profile } = useAppSelector((s) => s.profile);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);

  useEffect(() => { if (!profile) dispatch(fetchProfileThunk()); }, [profile, dispatch]);

  const [bookings, setBookings] = useState<PortalBookingSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState(false);

  const [detail, setDetail] = useState<PortalBookingDetail | null>(null);
  const [payments, setPayments] = useState<PortalPaymentRow[]>([]);
  const [dueGrid, setDueGrid] = useState<PortalDueGrid | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchMyBookings();
        setBookings(rows);
        if (rows.length > 0) setSelectedId(rows[0].id);
      } catch {
        setBookingsError(true);
      } finally {
        setLoadingBookings(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingDetail(true);
    (async () => {
      try {
        const [d, p, g] = await Promise.all([
          fetchMyBookingDetail(selectedId),
          fetchMyBookingPayments(selectedId),
          fetchMyBookingDueGrid(selectedId),
        ]);
        setDetail(d);
        setPayments(p);
        setDueGrid(g);
      } catch {
        setDetail(null); setPayments([]); setDueGrid(null);
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [selectedId]);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const dueCounts = useMemo(() => {
    const rows = dueGrid?.rows ?? [];
    return {
      due: rows.filter((r) => r.status === 'due').length,
      upcoming: rows.filter((r) => r.status === 'upcoming').length,
      paid: rows.filter((r) => r.status === 'paid').length,
    };
  }, [dueGrid]);

  const totalPaid = useMemo(
    () => payments.filter((p) => p.is_approved).reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  const firstName = profile?.first_name || '';
  const documents = detail
    ? [
        { label: 'Aadhar Card', url: detail.aadhar_card },
        { label: 'PAN Card', url: detail.pan_card },
        { label: 'Application Form', url: detail.application_form },
        { label: 'Declaration Form', url: detail.declaration_form },
        { label: 'Allotment Letter', url: detail.allotment_letter },
      ].filter((d) => d.url)
    : [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: t.subtleBg, fontFamily: t.fontFamily }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: t.pageBg, borderBottom: `1px solid ${t.divider}` }}>
        <Logo size="sm" withText textColor={isDark ? 'text-white' : 'text-gray-900'} />
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 13.5, color: t.textSecondary, fontWeight: 500 }}>
            {firstName ? `Welcome, ${firstName}` : 'Welcome'}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: 'none', cursor: 'pointer' }}
          >
            <MdLogout size={16} /> Logout
          </button>
        </div>
      </div>

      {loadingBookings ? (
        <div className="flex-1 flex items-center justify-center"><CircularProgress size={28} sx={{ color: '#2563eb' }} /></div>
      ) : bookingsError ? (
        <div className="flex-1 flex items-center justify-center"><p style={{ color: t.textMuted }}>Couldn't load your bookings. Please try again later.</p></div>
      ) : bookings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: t.textPrimary }}>No bookings found</h1>
          <p style={{ fontSize: 13.5, color: t.textMuted, marginTop: 6 }}>Your account isn't linked to any booking yet. Contact your relationship manager if this looks wrong.</p>
        </div>
      ) : (
        <div style={{ maxWidth: 980, margin: '0 auto', width: '100%', padding: '20px 16px 40px' }}>
          {/* Multi-flat tab strip — only shown when there's something to switch between */}
          {bookings.length > 1 && (
            <div className="flex gap-2 flex-wrap" style={{ marginBottom: 18 }}>
              {bookings.map((b) => {
                const active = b.id === selectedId;
                const label = [b.building_name, b.wing_name, b.flat_no ? `Flat ${b.flat_no}` : null].filter(Boolean).join(' • ') || b.customer_code;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className="px-3.5 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: active ? '#2563eb' : t.surfaceBg,
                      color: active ? '#fff' : t.textSecondary,
                      border: `1px solid ${active ? '#2563eb' : t.surfaceBorder}`,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {loadingDetail || !detail ? (
            <div className="flex items-center justify-center" style={{ padding: 60 }}><CircularProgress size={26} sx={{ color: '#2563eb' }} /></div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginBottom: 18 }}>
                <StatCard label="Flat Amount" value={rupee(detail.flat_amount)} icon={MdApartment} color="#2563eb" bg="" surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
                <StatCard label="Amount Paid" value={rupee(totalPaid)} icon={MdCheckCircle} color="#16a34a" bg="" surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
                <StatCard label="Due Installments" value={dueCounts.due} icon={MdErrorOutline} color="#dc2626" bg="" surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
                <StatCard label="Upcoming" value={dueCounts.upcoming} icon={MdSchedule} color="#ea580c" bg="" surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
              </div>

              {/* Booking overview */}
              <Section t={t} title="Booking Overview" icon={MdApartment}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field t={t} label="Customer Code" value={detail.customer_code} />
                  <Field t={t} label="Building" value={detail.building?.name} />
                  <Field t={t} label="Wing" value={detail.wing?.name} />
                  <Field t={t} label="Flat No" value={detail.flat?.flat_number} />
                  <Field t={t} label="Floor" value={detail.flat?.floor?.name} />
                  <Field t={t} label="Company" value={detail.company_name} />
                  <Field t={t} label="Possession" value={detail.possession_granted ? <span style={{ color: '#16a34a' }}>Granted</span> : <span style={{ color: '#ea580c' }}>Pending</span>} />
                </div>
              </Section>

              {/* Personal details */}
              <Section t={t} title="Personal Details" icon={MdBadge}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field t={t} label="Full Name" value={[detail.name, detail.middle_name, detail.last_name].filter(Boolean).join(' ')} />
                  <Field t={t} label="Mobile" value={detail.mobile_number ? `${detail.mobile_country_code || ''} ${detail.mobile_number}` : null} />
                  <Field t={t} label="WhatsApp" value={detail.whatsapp_number ? `${detail.whatsapp_country_code || ''} ${detail.whatsapp_number}` : null} />
                  <Field t={t} label="Alternate Number" value={detail.alternate_number} />
                  <Field t={t} label="Email" value={detail.email} />
                  <Field t={t} label="Date of Birth" value={detail.date_of_birth ? formatDate(detail.date_of_birth) : null} />
                  <Field t={t} label="Address" value={detail.address} />
                  {detail.secondary_numbers.length > 0 && (
                    <Field t={t} label="Other Numbers" value={detail.secondary_numbers.map((n) => `${n.country_code} ${n.number}`).join(', ')} />
                  )}
                </div>
              </Section>

              {/* Documents */}
              {documents.length > 0 && (
                <Section t={t} title="Documents" icon={MdDescription}>
                  <div className="flex flex-wrap gap-3">
                    {documents.map((d) => (
                      <a
                        key={d.label}
                        href={d.url!}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold"
                        style={{ background: t.insetBg, color: t.hoverText, border: `1px solid ${t.surfaceBorder}`, textDecoration: 'none' }}
                      >
                        <MdCreditCard size={15} /> {d.label}
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* Due grid — read-only, no Add Payment (that's staff-only) */}
              <Section t={t} title="Payment Schedule" icon={MdCalendarToday}>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: t.tableHeaderBg }}>
                        {['#', 'Installment', 'Date', 'Amount', 'Status'].map((h) => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(dueGrid?.rows ?? []).map((r) => (
                        <tr key={r.sr} style={{ borderBottom: `1px solid ${t.tableRowBorder}` }}>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: t.textMuted }}>{r.sr}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: t.textPrimary, fontWeight: 500 }}>{r.label}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: t.textSecondary }}>{r.date ? formatDate(r.date) : '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: t.textPrimary, fontWeight: 600 }}>{rupee(r.amount)}</td>
                          <td style={{ padding: '10px 12px' }}><StatusPill status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Payment history */}
              <Section t={t} title="Payment History" icon={MdCall}>
                {payments.length === 0 ? (
                  <p style={{ fontSize: 13, color: t.textMuted, textAlign: 'center', padding: '20px 0' }}>No payments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: t.tableHeaderBg }}>
                          {['Receipt #', 'Payment For', 'Amount', 'Mode', 'Date', 'Status'].map((h) => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id} style={{ borderBottom: `1px solid ${t.tableRowBorder}` }}>
                            <td style={{ padding: '10px 12px', fontSize: 13, color: t.textPrimary, fontWeight: 600 }}>{p.receipt_number}</td>
                            <td style={{ padding: '10px 12px', fontSize: 13, color: t.textSecondary }}>{paymentForLabel(p.payment_type)}</td>
                            <td style={{ padding: '10px 12px', fontSize: 13, color: t.textPrimary, fontWeight: 600 }}>{rupee(p.amount)}</td>
                            <td style={{ padding: '10px 12px', fontSize: 13, color: t.textSecondary }}>{p.mode_of_payment || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 13, color: t.textSecondary }}>{p.created_at ? formatDate(p.created_at) : '—'}</td>
                            <td style={{ padding: '10px 12px' }}><ApprovalPill approved={p.is_approved} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
