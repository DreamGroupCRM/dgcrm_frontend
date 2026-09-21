// Home — the customer's own details first, then the property they booked.
// That order is deliberate (and is what the brief asks for): the person
// signing in wants to confirm "yes, this is me" before reading the unit
// details.
import React from 'react';
import { CircularProgress } from '@mui/material';
import { MdPerson, MdApartment, MdVerifiedUser } from 'react-icons/md';
import { formatDate, resolveFileUrl } from '../../../utils';
import { useCustomerPortal } from '../CustomerPortalContext';
import { PageHead, Card, Field, rupee } from '../CustomerPortalUi';

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

  return (
    <>
      <PageHead
        title={`Welcome, ${detail.name || 'Customer'}`}
        subtitle={selected ? `Customer ID ${selected.customer_code}` : undefined}
      />

      <Card icon={<MdPerson size={16} />} title="Personal Details">
        <div className="cp-grid">
          {detail.customer_image && (
            <div>
              <div className="cp-field-label">Photo</div>
              <img
                src={resolveFileUrl(detail.customer_image)} alt=""
                style={{ width: 66, height: 66, borderRadius: 12, objectFit: 'cover' }}
              />
            </div>
          )}
          <Field label="Full Name" value={fullName} />
          <Field label="Customer ID" value={detail.customer_code} />
          <Field label="Primary Number" value={detail.mobile_number ? `${detail.mobile_country_code || ''} ${detail.mobile_number}`.trim() : ''} />
          <Field label="Alternate Number" value={secondary || detail.alternate_number} />
          <Field label="Email" value={detail.email} />
          <Field label="Date of Birth" value={detail.date_of_birth ? formatDate(detail.date_of_birth) : ''} />
          <Field label="Aadhar Number" value={detail.aadhar_card_no} />
          <Field label="PAN Number" value={detail.pan_card_no} />
          <Field label="Address" value={detail.address} />
        </div>
      </Card>

      <Card icon={<MdApartment size={16} />} title={`${unitLabel} Booking Details`}>
        <div className="cp-grid">
          <Field label="Company" value={detail.company_name} />
          <Field label="Building" value={detail.building?.name} />
          {!isShop && <Field label="Wing" value={detail.wing?.name} />}
          {!isShop && <Field label="Floor" value={detail.flat?.floor?.name} />}
          <Field label={`${unitLabel} No`} value={isShop ? detail.shop?.shop_no : detail.flat?.flat_number} />
          {!isShop && <Field label="Flat Type" value={detail.flat?.flat_type} />}
          <Field label="Area" value={area != null ? `${area} Sq.ft` : ''} />
          <Field label="Parking No" value={detail.parking_no} />
          <Field label={`Total ${unitLabel} Cost`} value={rupee(detail.flat_amount)} />
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
