// Home — the customer's own details, the employee looking after their
// booking, and the property itself, laid out horizontally so everything is
// visible at a glance. The money tiles and the documents moved off Home:
// documents have their own "My Documents" page in the sidebar.
import React from 'react';
import { CircularProgress } from '@mui/material';
import { MdPerson, MdApartment, MdVerifiedUser, MdGroups, MdCall, MdEmail, MdSend } from 'react-icons/md';
import { formatDate, resolveFileUrl } from '../../../utils';
import { useCustomerPortal, bookingLabel } from '../CustomerPortalContext';
import { PageHead, Card, Field } from '../CustomerPortalUi';

const CustomerHomePage: React.FC = () => {
  const { detail, selected } = useCustomerPortal();

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

      <div className="cp-row-2">
        <Card icon={<MdPerson size={16} />} title="Personal Details">
          <div className="cp-detail-wrap">
            <div className="cp-detail-id">
              {detail.customer_image ? (
                <img src={resolveFileUrl(detail.customer_image)} alt="" className="cp-avatar-photo" />
              ) : (
                <div className="cp-avatar-photo cp-avatar-empty"><MdPerson size={28} /></div>
              )}
              <div style={{ minWidth: 0 }}>
                <div className="cp-person-name">{fullName || '—'}</div>
                <div className="cp-person-sub">Customer ID : {detail.customer_code}</div>
              </div>
            </div>
            <div className="cp-grid-dense">
              <Field label="Email" value={detail.email} />
              <Field label="Mobile" value={detail.mobile_number ? `${detail.mobile_country_code || ''} ${detail.mobile_number}`.trim() : ''} />
              <Field label="Alternate Number" value={secondary || detail.alternate_number} />
              <Field label="Date of Birth" value={detail.date_of_birth ? formatDate(detail.date_of_birth) : ''} />
              <Field label="Aadhaar Number" value={detail.aadhar_card_no} />
              <Field label="PAN Number" value={detail.pan_card_no} />
              <div className="cp-grid-span"><Field label="Address" value={detail.address} /></div>
            </div>
          </div>
        </Card>

        <Card icon={<MdGroups size={16} />} title="Relationship Manager">
          {!rm ? (
            <div className="cp-empty" style={{ margin: 0 }}>No relationship manager is assigned to your booking yet.</div>
          ) : (
            <>
              <div className="cp-person-head">
                {rm.photo_url ? (
                  <img src={resolveFileUrl(rm.photo_url)} alt="" className="cp-avatar-photo" />
                ) : (
                  <div className="cp-avatar-photo cp-avatar-empty"><MdPerson size={28} /></div>
                )}
                <div>
                  <div className="cp-person-name">{rm.name}</div>
                  <div className="cp-person-sub">
                    {rm.employee_code && <>Employee ID : {rm.employee_code}<br /></>}
                    {rm.designation && <>Designation : {rm.designation}<br /></>}
                    {rm.department && <>Department : {rm.department}</>}
                  </div>
                </div>
              </div>
              <div className="cp-rm-contact">
                {rm.mobile_number && (
                  <span className="cp-rm-contact-item"><MdCall size={13} /> {rm.mobile_country_code || ''} {rm.mobile_number}</span>
                )}
                {rm.email && <span className="cp-rm-contact-item"><MdEmail size={13} /> {rm.email}</span>}
              </div>
              {rm.email && (
                <a className="cp-btn cp-btn-primary" href={`mailto:${rm.email}`} style={{ marginTop: 10, width: 'fit-content' }}>
                  <MdSend size={14} /> Contact Manager
                </a>
              )}
            </>
          )}
        </Card>
      </div>

      <Card icon={<MdApartment size={16} />} title="Property Details">
        <div className="cp-grid-dense cp-grid-property">
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
              <span className="cp-chip" style={{
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
