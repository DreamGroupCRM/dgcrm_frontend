// Home — the customer's own details, the employee looking after their
// booking, and the property itself: three sections stacked one below the
// other, each section's details in one row on a desktop, under the money
// tiles (V_29.0 — moved here from Payment History). Documents have their own
// "My Documents" page in the sidebar.
import React from 'react';
import { CircularProgress } from '@mui/material';
import { MdPerson, MdApartment, MdVerifiedUser, MdGroups, MdCall, MdEmail, MdTrendingUp, MdAccountBalanceWallet, MdHourglassEmpty } from 'react-icons/md';
import { formatDate, resolveFileUrl, resolveThumbUrl } from '../../../utils';
import { useCustomerPortal, bookingLabel } from '../CustomerPortalContext';
import { PageHead, Card, Field, Stat, STAT_GRADIENTS, rupee, AwaitingNote, useBookingTotals } from '../CustomerPortalUi';

// V_29.0 — only the last 4 digits of the Aadhaar number are shown.
const maskAadhaar = (v?: string | null): string => {
  const digits = (v ?? '').replace(/\D/g, '');
  return digits.length >= 4 ? `XXXX XXXX ${digits.slice(-4)}` : '';
};

const CustomerHomePage: React.FC = () => {
  const { detail, selected, selectedId } = useCustomerPortal();
  const isCancelled = !!selected?.is_cancelled;
  const totals = useBookingTotals(selectedId, isCancelled, selected?.flat_amount);

  if (!detail) return <div className="cp-center"><CircularProgress size={28} /></div>;

  const fullName = [detail.name, detail.middle_name, detail.last_name].filter(Boolean).join(' ');
  const isShop = (detail.unit_type ?? (detail.shop_id != null ? 'shop' : 'flat')) === 'shop';
  const unitLabel = isShop ? 'Shop' : 'Flat';
  const area = isShop ? detail.shop?.area_sqft : detail.flat?.area_sqft;
  const secondary = detail.secondary_numbers
    ?.map((n) => `${n.country_code} ${n.number}`)
    .join(', ');
  const rm = detail.assigned_employee;

  return (
    <>
      {/* The customer's name / ID are on the header's booking boxes now. */}
      <PageHead title="Home" subtitle={selected ? bookingLabel(selected) : undefined} />

      {/* V_29.0 (A5) — the booking's money at a glance, at the top of Home. */}
      {selectedId != null && (
        <div className="cp-stats">
          <Stat icon={<MdTrendingUp size={19} />} label="Total Flat Amount" value={rupee(totals?.totalCost)} gradient={STAT_GRADIENTS.total} />
          <Stat icon={<MdAccountBalanceWallet size={19} />} label="Total Amount Paid" value={rupee(totals?.paid)} gradient={STAT_GRADIENTS.paid} />
          {!isCancelled && <Stat icon={<MdHourglassEmpty size={19} />} label="Total Amount Pending" value={rupee(totals?.pending)} gradient={STAT_GRADIENTS.pending} />}
        </div>
      )}
      {selectedId != null && <AwaitingNote amount={totals?.awaiting} />}

      {/* Three full-width sections, one below the other: Personal Details,
          Relationship Manager, Property Details. On a desktop each section's
          details sit in a single row; on a phone they fold into a compact
          two-column grid (CustomerPortal.css, .cp-home-*). */}
      <Card icon={<MdPerson size={16} />} title="Personal Details">
        <div className="cp-home-row">
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
          <div className="cp-home-fields">
            <Field label="Email" value={detail.email} />
            <Field label="Mobile" value={detail.mobile_number ? `${detail.mobile_country_code || ''} ${detail.mobile_number}`.trim() : ''} />
            <Field label="Alternate Number" value={secondary || detail.alternate_number} />
            <Field label="Date of Birth" value={detail.date_of_birth ? formatDate(detail.date_of_birth) : ''} />
            <Field label="Aadhaar Number" value={maskAadhaar(detail.aadhar_card_no)} />
            <Field label="PAN Number" value={detail.pan_card_no} />
            <div className="cp-home-wide"><Field label="Address" value={detail.address} /></div>
          </div>
        </div>
      </Card>

      <Card icon={<MdGroups size={16} />} title="Relationship Manager">
        {!rm ? (
          <div className="cp-empty" style={{ margin: 0 }}>No relationship manager is assigned to your booking yet.</div>
        ) : (
          <div className="cp-home-row">
            <div className="cp-home-id">
              {rm.photo_url ? (
                <img src={resolveThumbUrl(rm.photo_url)} alt="" className="cp-avatar-photo" />
              ) : (
                <div className="cp-avatar-photo cp-avatar-empty"><MdPerson size={24} /></div>
              )}
              <div style={{ minWidth: 0 }}>
                <div className="cp-person-name">{rm.name}</div>
                {rm.employee_code && <div className="cp-person-sub">Employee ID : {rm.employee_code}</div>}
              </div>
            </div>
            <div className="cp-home-fields">
              <Field label="Designation" value={rm.designation} />
              <Field label="Department" value={rm.department} />
              <Field
                label="Mobile"
                value={rm.mobile_number ? <span className="cp-rm-contact-item"><MdCall size={13} /> {`${rm.mobile_country_code || ''} ${rm.mobile_number}`.trim()}</span> : ''}
              />
              <div className="cp-home-wide">
                <Field label="Email" value={rm.email ? <span className="cp-rm-contact-item"><MdEmail size={13} /> {rm.email}</span> : ''} />
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card icon={<MdApartment size={16} />} title="Property Details">
        <div className="cp-home-fields">
          <Field label="Company" value={detail.company_name} />
          <Field label="Project" value={detail.building?.project_name} />
          <Field label="Building" value={detail.building?.name} />
          {!isShop && <Field label="Wing" value={detail.wing?.name} />}
          {!isShop && <Field label="Floor" value={detail.flat?.floor?.name} />}
          <Field label={`${unitLabel} No`} value={isShop ? detail.shop?.shop_no : detail.flat?.flat_number} />
          {!isShop && <Field label="Flat Type" value={detail.flat?.flat_type} />}
          <Field label="Area" value={area != null ? `${area} Sq.ft` : ''} />
          <Field label="Parking No" value={detail.parking_no} />
          <Field label="Booking Date" value={detail.booking_date ? formatDate(detail.booking_date) : ''} />
          <Field
            label="Possession"
            value={
              <span className={`cp-chip ${detail.possession_granted ? 'cp-chip-paid' : 'cp-chip-pending'}`} style={{
                background: detail.possession_granted ? 'rgba(5,150,105,0.12)' : 'rgba(217,119,6,0.14)',
                color: detail.possession_granted ? '#059669' : '#b45309',
              }}>
                <MdVerifiedUser size={12} />
                {detail.possession_granted ? 'Granted' : 'Pending'}
              </span>
            }
          />
        </div>
      </Card>
    </>
  );
};

export default CustomerHomePage;
