// Home — three cards in one row (You, Your Property, Your Relationship
// Manager), then the payment progress next to the latest payments. Documents have their own
// "My Documents" page in the sidebar.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { MdPerson, MdApartment, MdVerifiedUser, MdGroups, MdCall, MdEmail, MdHistory } from 'react-icons/md';
import { formatDate, resolveThumbUrl } from '../../../utils';
import { useCustomerPortal, bookingLabel } from '../CustomerPortalContext';
import { PageHead, Card, Field, rupee, AwaitingNote, useBookingTotals } from '../CustomerPortalUi';
import { fetchMyBookingPayments, PortalPaymentRow } from '../../../services/customerPortalService';
import { paymentForLabel } from '../../../services/paymentService';
import { ROUTES } from '../../../constants';

// V_29.0 — only the last 4 digits of the Aadhaar number are shown.
const maskAadhaar = (v?: string | null): string => {
  const digits = (v ?? '').replace(/\D/g, '');
  return digits.length >= 4 ? `XXXX XXXX ${digits.slice(-4)}` : '';
};

const CustomerHomePage: React.FC = () => {
  const { detail, selected, selectedId } = useCustomerPortal();
  const isCancelled = !!selected?.is_cancelled;
  const totals = useBookingTotals(selectedId, isCancelled, selected?.flat_amount);
  // V_29.0 (design B) — the three most recent payments, newest first.
  const [recent, setRecent] = useState<PortalPaymentRow[] | null>(null);
  useEffect(() => {
    if (selectedId == null) { setRecent(null); return; }
    let stale = false;
    fetchMyBookingPayments(selectedId)
      .then((rows) => { if (!stale) setRecent([...rows].sort((a, b) => new Date(b.date ?? b.created_at).getTime() - new Date(a.date ?? a.created_at).getTime()).slice(0, 3)); })
      .catch(() => { if (!stale) setRecent([]); });
    return () => { stale = true; };
  }, [selectedId]);

  if (!detail) return <div className="cp-center"><CircularProgress size={28} /></div>;

  const fullName = [detail.name, detail.middle_name, detail.last_name].filter(Boolean).join(' ');
  const isShop = (detail.unit_type ?? (detail.shop_id != null ? 'shop' : 'flat')) === 'shop';
  const unitLabel = isShop ? 'Shop' : 'Flat';
  const area = isShop ? detail.shop?.area_sqft : detail.flat?.area_sqft;
  const secondary = detail.secondary_numbers
    ?.map((n) => `${n.country_code} ${n.number}`)
    .join(', ');
  const rm = detail.assigned_employee;
  const rmPhone = rm?.mobile_number ? `${rm.mobile_country_code || ''} ${rm.mobile_number}`.trim() : '';
  const propertyTitle = [
    detail.building?.name,
    !isShop && detail.wing?.name ? (/^wing\b/i.test(detail.wing.name) ? detail.wing.name : `Wing ${detail.wing.name}`) : '',
    (isShop ? detail.shop?.shop_no : detail.flat?.flat_number) ? `${unitLabel} ${isShop ? detail.shop?.shop_no : detail.flat?.flat_number}` : '',
  ].filter(Boolean).join(' · ');
  const propertySub = [detail.building?.project_name, detail.building?.location].filter(Boolean).join(' · ');

  return (
    <>
      {/* The customer's name / ID are on the header's booking boxes now. */}
      <PageHead title="Home" subtitle={selected ? bookingLabel(selected) : undefined} />

      {/* V_29.0 (9 Nov) — the three things a customer looks for first, as three
          cards in one row: who they are, their property, and the employee
          looking after them. On a phone the cards stack in the same order. */}
      <div className="cp-home3">
        <Card icon={<MdPerson size={16} />} title="You">
          <div className="cp-home-id">
            {detail.customer_image ? (
              <img src={resolveThumbUrl(detail.customer_image)} alt="" className="cp-avatar-photo" />
            ) : (
              <div className="cp-avatar-photo cp-avatar-empty"><MdPerson size={24} /></div>
            )}
            <div style={{ minWidth: 0 }}>
              <div className="cp-person-name">{fullName || '—'}</div>
              <div className="cp-person-sub">
                Customer ID : {detail.customer_code}
                {selected?.is_cancelled && <span className="cp-cancelled-tag">CANCELLED</span>}
              </div>
            </div>
          </div>
          <div className="cp-home-grid2">
            <Field label="Mobile" value={detail.mobile_number ? `${detail.mobile_country_code || ''} ${detail.mobile_number}`.trim() : ''} />
            <Field label="Alternate Number" value={secondary || detail.alternate_number} />
            <div className="cp-home-wide"><Field label="Email" value={detail.email} /></div>
            <Field label="Date of Birth" value={detail.date_of_birth ? formatDate(detail.date_of_birth) : ''} />
            <Field label="Aadhaar Number" value={maskAadhaar(detail.aadhar_card_no)} />
            <Field label="PAN Number" value={detail.pan_card_no} />
            <div className="cp-home-wide"><Field label="Address" value={detail.address} /></div>
          </div>
        </Card>

        <Card icon={<MdApartment size={16} />} title="Your Property">
          <div className="cp-person-name">{propertyTitle || '—'}</div>
          {propertySub && <div className="cp-person-sub">{propertySub}</div>}
          <div className="cp-home-chips">
            {!isShop && detail.flat?.flat_type && <span className="cp-home-chip">{detail.flat.flat_type}</span>}
            {area != null && <span className="cp-home-chip">{area} Sq.ft</span>}
            {!isShop && detail.flat?.floor?.name && <span className="cp-home-chip">{detail.flat.floor.name}</span>}
            <span className={`cp-home-chip ${detail.possession_granted ? 'ok' : 'wait'}`}>
              <MdVerifiedUser size={12} /> Possession {detail.possession_granted ? 'granted' : 'pending'}
            </span>
          </div>
          <div className="cp-home-grid2">
            <Field label="Company" value={detail.company_name} />
            <Field label="Project" value={detail.building?.project_name} />
            <Field label="Building" value={detail.building?.name} />
            <Field label="Location" value={detail.building?.location} />
            {!isShop && <Field label="Wing" value={detail.wing?.name} />}
            <Field label={`${unitLabel} No`} value={isShop ? detail.shop?.shop_no : detail.flat?.flat_number} />
            <Field label="Parking No" value={detail.parking_no} />
            <Field label="Booking Date" value={detail.booking_date ? formatDate(detail.booking_date) : ''} />
          </div>
        </Card>

        <Card icon={<MdGroups size={16} />} title="Your Relationship Manager">
          {!rm ? (
            <div className="cp-empty" style={{ margin: 0 }}>No relationship manager is assigned to your booking yet.</div>
          ) : (
            <>
              <div className="cp-home-id">
                {rm.photo_url ? (
                  <img src={resolveThumbUrl(rm.photo_url)} alt="" className="cp-avatar-photo" />
                ) : (
                  <div className="cp-avatar-photo cp-avatar-empty"><MdPerson size={24} /></div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div className="cp-person-name">{rm.name}</div>
                  {rm.designation && <div className="cp-person-sub">{rm.designation}</div>}
                </div>
              </div>
              <div className="cp-home-grid2">
                <Field label="Department" value={rm.department} />
                <Field label="Employee ID" value={rm.employee_code} />
                <div className="cp-home-wide">
                  <Field label="Mobile" value={rmPhone ? <span className="cp-rm-contact-item"><MdCall size={13} /> {rmPhone}</span> : ''} />
                </div>
                <div className="cp-home-wide">
                  <Field label="Email" value={rm.email ? <span className="cp-rm-contact-item"><MdEmail size={13} /> {rm.email}</span> : ''} />
                </div>
              </div>
              {rmPhone && (
                <a className="cp-call-btn" href={`tel:${rmPhone.replace(/\s+/g, '')}`}>
                  <MdCall size={14} /> Call
                </a>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Money: paid so far against the cost, next to the latest payments. */}
      {selectedId != null && (
        <div className="cp-home2">
          <div>
            {/* V_29.0 (design B) — paid so far against the flat cost, as a progress bar. */}
            {selectedId != null && (() => {
              const cost = totals?.totalCost ?? 0;
              const paid = totals?.paid ?? 0;
              const pct = cost > 0 ? Math.min(100, (paid / cost) * 100) : 0;
              return (
                <section className="cp-card cp-progress-card" aria-label="Payment progress">
                  <div className="cp-progress-top">
                    <div><div className="cp-k">Paid</div><div className="cp-big cp-good">{rupee(totals?.paid)}</div></div>
                    <div style={{ textAlign: 'right' }}><div className="cp-k">{isCancelled ? 'Booking amount' : 'Flat cost'}</div><div className="cp-big">{rupee(totals?.totalCost)}</div></div>
                  </div>
                  <div className="cp-progress" role="img" aria-label={`${pct.toFixed(1)}% paid`}><i style={{ width: `${pct}%` }} /></div>
                  <div className="cp-progress-foot"><span>{pct.toFixed(1)}% paid</span>{!isCancelled && <span>Pending {rupee(totals?.pending)}</span>}</div>
                </section>
              );
            })()}
            {selectedId != null && <AwaitingNote amount={totals?.awaiting} />}
          </div>
          {/* V_29.0 (design B) — recent payments as a short timeline. */}
            {selectedId != null && (
              <Card icon={<MdHistory size={16} />} title="Recent payments">
                {recent == null ? <div className="cp-k">Loading…</div>
                  : recent.length === 0 ? <div className="cp-empty" style={{ margin: 0 }}>No payments have been recorded yet.</div>
                  : (
                    <div className="cp-timeline">
                      {recent.map((r) => (
                        <div key={r.id} className="cp-tl-row">
                          <span className={`cp-tl-dot ${r.is_approved ? 'ok' : 'wait'}`} aria-hidden="true" />
                          <span className="cp-tl-main">
                            <span className="cp-tl-title">{r.payment_tag === 'Extra Pay' ? 'Extra Pay' : paymentForLabel(r.payment_type)} · {formatDate(r.payment_date ?? r.date ?? r.created_at)}</span>
                            <span className="cp-k">{r.is_approved ? (r.receipt_number ? `Receipt ${r.receipt_number}` : 'Old record') : <span className="cp-tl-wait">Awaiting confirmation</span>}</span>
                          </span>
                          <span className="cp-tl-amt">{rupee(Number(r.amount || 0))}</span>
                        </div>
                      ))}
                      <Link className="cp-tl-all" to={ROUTES.CUSTOMER.PAYMENT_HISTORY}>See all payments ›</Link>
                    </div>
                  )}
              </Card>
            )}
        </div>
      )}
    </>
  );
};

export default CustomerHomePage;
