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
import { AppTheme } from '../../../styles/theme';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { CircularProgress } from '@mui/material';
import {
  MdLogout, MdApartment, MdCalendarToday, MdCheckCircle, MdClose, MdReceiptLong,
  MdErrorOutline, MdSchedule, MdDescription, MdCreditCard, MdBadge, MdOpenInNew,
  MdHistory, MdPerson, MdPhone, MdMailOutline, MdLockOutline,
} from 'react-icons/md';
import Logo from '../../../components/ui/Logo';
import StatCard from '../../../components/masters/StatCard';
import { formatDate, resolveFileUrl } from '../../../utils';
import { statusColors } from '../../../styles/statusColors';
import DocumentViewerModal from '../../../components/common/DocumentViewerModal';
import ChangePasswordForm from '../../../components/common/ChangePasswordForm';
import { previewKindFor } from '../../../services/documentService';
import { ensureFileToken } from '../../../services/fileAccessService';
import { AccordionSection } from '../../../components/common/Accordion';
import { PaymentReceiptViewModal } from '../../../components/common/PaymentReceiptViewModal';
import { PaymentReceipt } from '../../../types/index';
import { paymentForLabel } from '../../../services/paymentService';
import {
  fetchMyBookings, fetchMyBookingDetail, fetchMyBookingPayments, fetchMyBookingDueGrid,
  fetchMyPaymentReceipt,
  PortalBookingSummary, PortalBookingDetail, PortalPaymentRow, PortalDueGrid,
} from '../../../services/customerPortalService';
import { toast } from 'react-toastify';
import './CustomerDashboard.css';

type Theme = AppTheme;

const rupee = (n: number): string => `₹ ${n.toLocaleString('en-IN')}`;

// Labels and icons are this page's own; the COLORS come from
// styles/statusColors.ts, so a 'Paid' chip here is the exact same green as
// a 'Paid' chip on the staff-side pages, in either theme.
const STATUS_META: Record<string, { label: string; icon: React.ElementType }> = {
  paid: { label: 'Paid', icon: MdCheckCircle },
  due: { label: 'Due', icon: MdErrorOutline },
  upcoming: { label: 'Upcoming', icon: MdSchedule },
};
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const key = STATUS_META[status] ? status : 'upcoming';
  const m = STATUS_META[key];
  const c = statusColors(key);
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold" style={{ background: c.bg, color: c.fg, fontSize: 11 }}>
      <Icon size={13} /> {m.label}
    </span>
  );
};
const ApprovalPill: React.FC<{ approved: boolean }> = ({ approved }) => {
  const c = statusColors(approved ? 'approved' : 'pending_approval');
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold"
      style={{ background: c.bg, color: c.fg, fontSize: 11 }}
    >
      {approved ? <MdCheckCircle size={13} /> : <MdSchedule size={13} />} {approved ? 'Approved' : 'Pending Approval'}
    </span>
  );
};

// The portal's own document preview is gone — it now uses the SAME
// DocumentViewerModal as the staff-side Employee and Customer pages
// (components/common/DocumentViewerModal). That local copy rendered the
// file by pointing an <img>/<iframe> at its URL, which only worked while
// uploaded files were publicly readable, and its "Open in new tab" link
// handed out that raw URL. The shared viewer fetches over the
// authenticated axios instance instead, so a customer sees their own
// documents and a URL on its own grants nothing.

// ── One document tile ─────────────────────────────────────────────────
const DocumentTile: React.FC<{
  t: Theme; label: string; url: string | null; onOpen: (label: string, url: string) => void;
}> = ({ t, label, url, onOpen }) => {
  const resolved = resolveFileUrl(url);
  const isImage = !!resolved && previewKindFor(resolved) === 'image';
  const disabled = !resolved;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => resolved && onOpen(label, resolved)}
      className="rounded-xl overflow-hidden text-left"
      style={{
        width: 168, border: `1px solid ${t.surfaceBorder}`, background: t.insetBg,
        cursor: disabled ? 'default' : 'pointer', padding: 0,
      }}
    >
      <div className="w-full flex items-center justify-center overflow-hidden"
        style={{ height: 104, background: isImage ? t.insetBg : disabled ? t.insetBg : 'var(--brand-gradient)' }}>
        {isImage
          ? <img src={resolved} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <MdDescription size={32} color={disabled ? t.textMuted : '#fff'} />}
      </div>
      <div className="px-3 py-2">
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>{label}</div>
        <div style={{ fontSize: 10.5, color: disabled ? t.textMuted : t.hoverText, fontWeight: 600 }}>
          {disabled ? 'Not uploaded' : 'Quick View'}
        </div>
      </div>
    </button>
  );
};

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
  const { profile } = useAppSelector((s) => s.profile);
  const { isDark, t } = useAppearanceTokens();

  useEffect(() => { if (!profile) dispatch(fetchProfileThunk()); }, [profile, dispatch]);

  const [bookings, setBookings] = useState<PortalBookingSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState(false);

  const [detail, setDetail] = useState<PortalBookingDetail | null>(null);
  const [payments, setPayments] = useState<PortalPaymentRow[]>([]);
  const [dueGrid, setDueGrid] = useState<PortalDueGrid | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Which document is open in the preview popup, and which transaction's
  // receipt is open. Both null when nothing is showing.
  const [docPreview, setDocPreview] = useState<{ label: string; url: string } | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<number | null>(null);

  // Payment Schedule and Payment History are now collapsible, so a
  // customer with a long EMI schedule can fold it away and get to their
  // history without scrolling past forty rows. Both start open — that is
  // the state they were effectively in before.
  const [openSchedule, setOpenSchedule] = useState(true);
  const [openHistory, setOpenHistory] = useState(true);

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

  // Receipts are only issued for approved payments (the same rule staff
  // see) — an unapproved row's button says so instead of failing silently.
  const openReceipt = async (p: PortalPaymentRow) => {
    if (!p.is_approved) {
      toast.info('This payment is still awaiting approval — its receipt will be available once approved.');
      return;
    }
    setReceiptLoadingId(p.id);
    try {
      setReceipt(await fetchMyPaymentReceipt(p.id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load this receipt. Please try again.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  // Uploaded files are behind a credential now, and an <img src> cannot
  // send a header — so it carries a short-lived file token instead. A
  // session that logged in AFTER this shipped already has one; this covers
  // one that was already open, so thumbnails resolve instead of 401ing.
  useEffect(() => {
    void ensureFileToken();
    // A long-running session can outlive a file token, and an expired one
    // shows up as every image breaking at once with nothing for the app to
    // catch (an <img> error never reaches axios). ensureFileToken() is a
    // no-op unless the token is missing or close to expiring.
    const id = window.setInterval(() => { void ensureFileToken(); }, 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

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

  // Total Paid is derived from the same per-installment schedule status
  // (getCustomerDueGrid) the "Payment Schedule" table below renders — the
  // single source of truth staff already see for this same customer on
  // Payment Dues, rather than a second, independently-computed figure from
  // the raw payments list (which could disagree with the schedule, e.g. a
  // payment recorded against a booster row with no tracked "paid" column).
  // Total Due is then just Total Amount minus that, floored at 0 — the
  // same "never negative" convention payment.service.ts's
  // getCurrentRemainingAmount already uses.
  const totalPaid = useMemo(
    () => (dueGrid?.rows ?? []).filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0),
    [dueGrid]
  );
  const totalAmount = detail?.flat_amount ?? 0;
  // Summed off each row's own due_amount (not totalAmount - totalPaid) —
  // a row can be still-unpaid but partially covered by a leftover Extra Pay
  // credit smaller than one full EMI, in which case its due_amount is
  // already netted down (see getCustomerDueGrid) while it hasn't flipped to
  // 'paid' yet; the plain subtraction would double-count that shortfall.
  const totalDue = useMemo(
    () => (dueGrid?.rows ?? []).filter((r) => r.status !== 'paid').reduce((s, r) => s + r.due_amount, 0),
    [dueGrid]
  );

  const firstName = profile?.first_name || '';
  // Every document the booking can carry, uploaded or not. The old
  // .filter(d => d.url) meant a customer whose Aadhar/PAN/forms hadn't
  // been uploaded yet saw NO Documents section at all and no way to tell
  // whether that was a bug or simply nothing on file — each tile now says
  // which it is.
  const documents = detail
    ? [
        { label: 'Aadhar Card', url: detail.aadhar_card },
        { label: 'PAN Card', url: detail.pan_card },
        { label: 'Application Form', url: detail.application_form },
        { label: 'Declaration Form', url: detail.declaration_form },
        { label: 'Allotment Letter', url: detail.allotment_letter },
      ]
    : [];

  // A shop booking carries no wing/floor/flat (the two sides are mutually
  // exclusive), so the property fields have to branch rather than render
  // an empty flat row.
  const isShop = detail?.unit_type === 'shop' || (detail?.shop_id != null);
  const unitNo = isShop ? detail?.shop?.shop_no : detail?.flat?.flat_number;
  const unitArea = isShop ? detail?.shop?.area_sqft : detail?.flat?.area_sqft;
  const photoUrl = resolveFileUrl(detail?.customer_image);
  const fullName = [detail?.name, detail?.middle_name, detail?.last_name].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: t.subtleBg, fontFamily: t.fontFamily }}>
      {/* Change Password — same shared form as the staff side. */}
      {showChangePassword && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowChangePassword(false)}
          role="dialog" aria-modal="true" aria-label="Change password"
        >
          <div
            className="rounded-2xl w-full"
            style={{ maxWidth: 420, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <h3 className="flex items-center gap-2" style={{ fontSize: 14.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>
                <MdLockOutline size={17} style={{ color: t.accentText }} /> Change Password
              </h3>
              <button
                type="button" onClick={() => setShowChangePassword(false)} aria-label="Close"
                className="flex items-center justify-center rounded-lg"
                style={{ width: 30, height: 30, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <MdClose size={16} />
              </button>
            </div>
            <div className="px-5 py-4">
              <ChangePasswordForm t={t} onSuccess={() => setShowChangePassword(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="cd-topbar flex items-center justify-between gap-2 px-5 py-3" style={{ background: t.pageBg, borderBottom: `1px solid ${t.divider}` }}>
        <Logo size="sm" withText textColor={isDark ? 'text-white' : 'text-gray-900'} />
        <div className="cd-topbar-right flex items-center gap-3">
          <span className="cd-welcome-text" style={{ fontSize: 13.5, color: t.textSecondary, fontWeight: 500 }}>
            {firstName ? `Welcome, ${firstName}` : 'Welcome'}
          </span>
          {/* Change Password — the customer's self-service entry point,
              sitting beside Logout where an account action is expected.
              Opens the SAME form employees use (ChangePasswordForm), which
              posts to the same /api/auth/change-password endpoint: one
              `users` table, one session mechanism, one implementation. */}
          <button
            type="button"
            onClick={() => setShowChangePassword(true)}
            className="cd-logout-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: 'none', cursor: 'pointer' }}
          >
            <MdLockOutline size={16} /> <span className="cd-logout-btn-text">Change Password</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="cd-logout-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: 'none', cursor: 'pointer' }}
          >
            <MdLogout size={16} /> <span className="cd-logout-btn-text">Logout</span>
          </button>
        </div>
      </div>

      {loadingBookings ? (
        <div className="flex-1 flex items-center justify-center"><CircularProgress size={28} sx={{ color: 'var(--brand-ink)' }} /></div>
      ) : bookingsError ? (
        <div className="flex-1 flex items-center justify-center"><p style={{ color: t.textMuted }}>Couldn't load your bookings. Please try again later.</p></div>
      ) : bookings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: t.textPrimary }}>No bookings found</h1>
          <p style={{ fontSize: 13.5, color: t.textMuted, marginTop: 6 }}>Your account isn't linked to any booking yet. Contact your relationship manager if this looks wrong.</p>
        </div>
      ) : (
        <div className="cd-content" style={{ maxWidth: 980, margin: '0 auto', width: '100%', padding: '20px 16px 40px' }}>
          {/* Multi-flat tab strip — only shown when there's something to switch between */}
          {bookings.length > 1 && (
            <div className="flex gap-2 flex-wrap" style={{ marginBottom: 18 }}>
              {bookings.map((b) => {
                const active = b.id === selectedId;
                const label = (b.unit_type === 'shop'
                  ? [b.building_name, b.shop_no ? `Shop ${b.shop_no}` : null]
                  : [b.building_name, b.wing_name, b.flat_no ? `Flat ${b.flat_no}` : null]
                ).filter(Boolean).join(' • ') || b.customer_code;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className="px-3.5 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: active ? 'var(--brand-gradient)' : t.surfaceBg,
                      color: active ? '#fff' : t.textSecondary,
                      border: `1px solid ${active ? 'var(--brand-gradient)' : t.surfaceBorder}`,
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
            <div className="flex items-center justify-center" style={{ padding: 60 }}><CircularProgress size={26} sx={{ color: 'var(--brand-ink)' }} /></div>
          ) : (
            <>
              {/* Who you are — photo, name, customer code and the contact
                  details on file. This used to be absent entirely: the
                  portal opened straight into payment figures, and a
                  customer's own photo and mobile number were only visible
                  buried inside the Personal Details grid below. */}
              <div className="cd-profile-card flex items-center gap-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 18, marginBottom: 18 }}>
                <div className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
                  style={{ width: 76, height: 76, background: t.insetBg, border: `2px solid ${t.surfaceBorder}` }}>
                  {photoUrl
                    ? <img src={photoUrl} alt={fullName || 'Customer photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <MdPerson size={38} color={t.textMuted} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div style={{ fontSize: 17, fontWeight: 800, color: t.textPrimary, lineHeight: 1.25 }}>
                    {fullName || '—'}
                  </div>
                  <div style={{ fontSize: 11.5, color: t.textMuted, fontWeight: 600, marginTop: 1 }}>
                    Customer ID · {detail.customer_code}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1" style={{ marginTop: 7 }}>
                    <span className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: t.textSecondary, fontWeight: 500 }}>
                      <MdPhone size={14} />
                      {detail.mobile_number ? `${detail.mobile_country_code || ''} ${detail.mobile_number}`.trim() : '—'}
                    </span>
                    <span className="flex items-center gap-1.5 min-w-0" style={{ fontSize: 12.5, color: t.textSecondary, fontWeight: 500 }}>
                      <MdMailOutline size={14} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail.email || '—'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment summary — Total Amount / Total Paid / Total Due, the
                  headline numbers a customer needs to understand where they
                  stand at a glance. */}
              <div className="cd-stat-grid grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ marginBottom: 18 }}>
                <StatCard label="Total Amount" value={rupee(totalAmount)} icon={MdApartment} color="#0000FF" bg="" surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
                <StatCard label="Total Paid" value={rupee(totalPaid)} icon={MdCheckCircle} color="#16a34a" bg="" surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
                <StatCard label="Total Due" value={rupee(totalDue)} icon={MdErrorOutline} color={totalDue > 0 ? '#dc2626' : '#16a34a'} bg="" surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
              </div>

              {/* Booking overview */}
              <Section t={t} title={isShop ? 'Shop Booking' : 'Flat Booking'} icon={MdApartment}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field t={t} label="Company" value={detail.company_name} />
                  <Field t={t} label="Building" value={detail.building?.name} />
                  {/* Wing and Floor only exist on the flat side — a shop is
                      a ground-level unit with neither. */}
                  {!isShop && <Field t={t} label="Wing" value={detail.wing?.name} />}
                  {!isShop && <Field t={t} label="Floor" value={detail.flat?.floor?.name} />}
                  <Field t={t} label={isShop ? 'Shop No' : 'Flat No'} value={unitNo} />
                  {/* Area and type were never shown at all, which is what
                      "flat details area etc" was asking for. */}
                  <Field t={t} label={isShop ? 'Unit Type' : 'Flat Type'} value={isShop ? 'Shop' : detail.flat?.flat_type} />
                  <Field t={t} label="Area" value={unitArea != null ? `${unitArea} Sqft` : null} />
                  <Field t={t} label="Parking No" value={detail.parking_no} />
                  <Field t={t} label="Possession" value={detail.possession_granted ? <span style={{ color: '#16a34a' }}>Granted</span> : <span style={{ color: '#ea580c' }}>Pending</span>} />
                </div>
              </Section>

              {/* Personal details */}
              <Section t={t} title="Personal Details" icon={MdBadge}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field t={t} label="Full Name" value={fullName} />
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

              {/* Documents — each opens in the in-page preview above rather
                  than a new tab against an unresolved path. */}
              <Section t={t} title="My Documents" icon={MdDescription}>
                <div className="flex flex-wrap gap-3">
                  {documents.map((d) => (
                    <DocumentTile
                      key={d.label} t={t} label={d.label} url={d.url}
                      onOpen={(label, url) => setDocPreview({ label, url })}
                    />
                  ))}
                </div>
                {documents.every((d) => !d.url) && (
                  <p style={{ fontSize: 12.5, color: t.textMuted, marginTop: 12 }}>
                    None of your documents have been uploaded yet. Contact your relationship manager if you expected to see them here.
                  </p>
                )}
              </Section>

              {/* Due grid — read-only, no Add Payment (that's staff-only).
                  Collapsible: a 60-month EMI schedule is a lot to scroll
                  past on a phone just to reach the history below. */}
              <AccordionSection
                theme={t} icon={<MdCalendarToday size={16} color="#fff" />}
                title={`Payment Schedule (${(dueGrid?.rows ?? []).length})`}
                gradient="var(--grad-green)"
                open={openSchedule} onToggle={() => setOpenSchedule((o) => !o)}
              >
                <p style={{ fontSize: 12, color: t.textMuted, marginTop: 0, marginBottom: 12 }}>
                  {dueCounts.due} due now &middot; {dueCounts.upcoming} upcoming &middot; {dueCounts.paid} paid
                </p>
                <div className="overflow-x-auto">
                  <table className="cd-table w-full" style={{ borderCollapse: 'collapse', minWidth: 620 }}>
                    <thead>
                      <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                        {['#', 'Installment', 'Date', 'Amount', 'Status'].map((h) => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(dueGrid?.rows ?? []).map((r) => (
                        <tr key={r.sr} style={{ borderBottom: `1px solid ${t.tableRowBorder}` }}>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: t.textMuted, textDecoration: r.settled_via_extra_pay ? 'line-through' : 'none' }}>{r.sr}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: t.textPrimary, fontWeight: 500, textDecoration: r.settled_via_extra_pay ? 'line-through' : 'none' }}>{r.label}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: t.textSecondary, textDecoration: r.settled_via_extra_pay ? 'line-through' : 'none' }}>{r.date ? formatDate(r.date) : '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: t.textPrimary, fontWeight: 600 }}>
                            <span style={{ textDecoration: r.settled_via_extra_pay ? 'line-through' : 'none', color: r.settled_via_extra_pay ? t.textMuted : t.textPrimary }}>{rupee(r.amount)}</span>
                            {!r.settled_via_extra_pay && r.status !== 'paid' && r.due_amount < r.amount && (
                              <div style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                                {rupee(r.due_amount)} due &middot; {rupee(r.amount - r.due_amount)} covered via Extra Pay
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {r.settled_via_extra_pay ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: 11 }}>
                                Settled via Extra Pay
                              </span>
                            ) : (
                              <StatusPill status={r.status} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionSection>

              {/* Payment history — every transaction on this booking, each
                  with its own receipt. The list was already unfiltered
                  server-side (findAllForCustomer returns all of them); what
                  was missing was a way to actually open the receipt for a
                  given row, which is what the Receipt button adds. */}
              <AccordionSection
                theme={t} icon={<MdHistory size={16} color="#fff" />}
                title={`Payment History (${payments.length})`}
                gradient="var(--grad-green)"
                open={openHistory} onToggle={() => setOpenHistory((o) => !o)}
              >
                {payments.length === 0 ? (
                  <p style={{ fontSize: 13, color: t.textMuted, textAlign: 'center', padding: '20px 0' }}>No payments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="cd-table w-full" style={{ borderCollapse: 'collapse', minWidth: 720 }}>
                      <thead>
                        <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                          {['Receipt #', 'Payment For', 'Amount', 'Mode', 'Date', 'Status', 'Receipt'].map((h) => (
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
                            <td style={{ padding: '10px 12px' }}>
                              <button
                                type="button"
                                onClick={() => openReceipt(p)}
                                disabled={receiptLoadingId === p.id}
                                title={p.is_approved ? 'View receipt' : 'Available once this payment is approved'}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                                style={{
                                  background: p.is_approved ? 'var(--brand-gradient)' : t.insetBg,
                                  color: p.is_approved ? '#fff' : t.textMuted,
                                  border: p.is_approved ? 'none' : `1px solid ${t.surfaceBorder}`,
                                  fontSize: 11.5, fontWeight: 700,
                                  cursor: receiptLoadingId === p.id ? 'wait' : 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <MdReceiptLong size={14} />
                                {receiptLoadingId === p.id ? 'Loading...' : 'Receipt'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AccordionSection>
            </>
          )}
        </div>
      )}

      {/* Quick View — the shared viewer, identical to the one the staff
          pages use. Fetches over the authenticated API, shows images and
          PDFs inline, and offers Download throughout. */}
      {docPreview && (
        <DocumentViewerModal
          t={t} label={docPreview.label} url={docPreview.url}
          onClose={() => setDocPreview(null)}
        />
      )}

      {/* Transaction receipt — the same component, and the same underlying
          receipt data, staff see on Payment Received. Download simply opens
          the browser's own print dialog: the jsPDF exporter used on the
          staff side is part of the admin bundle, and pulling it into the
          customer bundle for this one button is not worth the weight. */}
      {receipt && (
        <PaymentReceiptViewModal
          data={receipt}
          onClose={() => setReceipt(null)}
          onDownload={() => window.print()}
        />
      )}
    </div>
  );
};

export default CustomerDashboard;
