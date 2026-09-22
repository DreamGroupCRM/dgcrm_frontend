// Home — summary tiles, then the customer's own details, the employee
// looking after their booking, the property itself, and finally the
// documents on file. That order (money first, then "yes this is me", then
// who to call, then the unit, then the paperwork) is what the V_24.0
// redesign asks for and matches the reference screenshots.
import React, { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';
import {
  MdPerson, MdApartment, MdVerifiedUser, MdGroups, MdCall, MdEmail, MdSend,
  MdTrendingUp, MdAccountBalanceWallet, MdHourglassEmpty, MdFolderOpen,
  MdDownload, MdInsertDriveFile, MdPictureAsPdf,
} from 'react-icons/md';
import { toast } from '@/utils/toast';
import { formatDate, resolveFileUrl } from '../../../utils';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import DocumentViewerModal from '../../../components/common/DocumentViewerModal';
import { previewKindFor, downloadDocument } from '../../../services/documentService';
import { fetchMyBookingDueGrid } from '../../../services/customerPortalService';
import { useCustomerPortal } from '../CustomerPortalContext';
import { PageHead, Card, Field, Stat, STAT_GRADIENTS, rupee, totalsFromDueGrid, BookingTotals } from '../CustomerPortalUi';

const CustomerHomePage: React.FC = () => {
  const { detail, selected, selectedId } = useCustomerPortal();
  const { t } = useAppearanceTokens();
  const [totals, setTotals] = useState<BookingTotals | null>(null);
  const [viewing, setViewing] = useState<{ label: string; url: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Same three tiles Payment History and EMI Scheme already show, derived
  // from the same due grid — one source of truth for "what has this
  // customer paid" across the whole portal, never three separate sums that
  // can drift apart.
  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const grid = await fetchMyBookingDueGrid(selectedId);
        if (!cancelled) setTotals(totalsFromDueGrid(grid.rows));
      } catch {
        if (!cancelled) setTotals(null);
      }
    })();
    return () => { cancelled = true; };
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

  const documents = [
    { label: 'Customer Photo', url: detail.customer_image },
    { label: 'Aadhaar Card', url: detail.aadhar_card },
    { label: 'PAN Card', url: detail.pan_card },
    { label: 'Application Form', url: detail.application_form },
    { label: 'Declaration Form', url: detail.declaration_form },
    { label: 'Allotment Letter', url: detail.allotment_letter },
  ];

  const handleDownload = async (label: string, url: string) => {
    setDownloading(label);
    try {
      await downloadDocument(resolveFileUrl(url), label);
    } catch {
      toast.error('We could not download this document. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <PageHead
        title={`Welcome, ${detail.name || 'Customer'}`}
        subtitle={selected ? `Customer ID: ${selected.customer_code}` : undefined}
      />

      <div className="cp-stats">
        <Stat icon={<MdTrendingUp size={19} />} label={`Total ${unitLabel} Amount`} value={rupee(totals?.totalCost ?? detail.flat_amount)} gradient={STAT_GRADIENTS.total} />
        <Stat icon={<MdAccountBalanceWallet size={19} />} label="Total Amount Paid" value={rupee(totals?.paid)} gradient={STAT_GRADIENTS.paid} />
        <Stat icon={<MdHourglassEmpty size={19} />} label="Total Amount Pending" value={rupee(totals?.pending)} gradient={STAT_GRADIENTS.pending} />
      </div>

      <div className="cp-row-2">
        <Card icon={<MdPerson size={16} />} title="Personal Details">
          <div className="cp-person-head">
            {detail.customer_image && (
              <img
                src={resolveFileUrl(detail.customer_image)} alt=""
                className="cp-avatar-photo"
              />
            )}
            <div>
              <div className="cp-person-name">{fullName || '—'}</div>
              <div className="cp-person-sub">Customer ID : {detail.customer_code}</div>
            </div>
          </div>
          <div className="cp-grid">
            <Field label="Email" value={detail.email} />
            <Field label="Mobile" value={detail.mobile_number ? `${detail.mobile_country_code || ''} ${detail.mobile_number}`.trim() : ''} />
            <Field label="Alternate Number" value={secondary || detail.alternate_number} />
            <Field label="Date of Birth" value={detail.date_of_birth ? formatDate(detail.date_of_birth) : ''} />
            <Field label="Aadhaar Number" value={detail.aadhar_card_no} />
            <Field label="PAN Number" value={detail.pan_card_no} />
            <Field label="Address" value={detail.address} />
          </div>
        </Card>

        <Card icon={<MdGroups size={16} />} title="Relationship Manager">
          {!rm ? (
            <div className="cp-empty" style={{ margin: 0 }}>No relationship manager is assigned to your booking yet.</div>
          ) : (
            <>
              <div className="cp-person-head">
                {rm.photo_url && (
                  <img src={resolveFileUrl(rm.photo_url)} alt="" className="cp-avatar-photo" />
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
        <div className="cp-grid">
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

      <Card icon={<MdFolderOpen size={16} />} title="My Documents">
        <div className="cp-doc-tiles">
          {documents.map(({ label, url }) => {
            const resolved = url ? resolveFileUrl(url) : null;
            const isImage = resolved ? previewKindFor(resolved) === 'image' : false;
            return (
              <div key={label} className="cp-doc-tile">
                <div className="cp-doc-tile-icon">
                  {resolved && isImage ? (
                    <img src={resolved} alt="" />
                  ) : resolved ? (
                    <MdPictureAsPdf size={22} style={{ color: '#dc2626' }} />
                  ) : (
                    <MdInsertDriveFile size={20} style={{ color: t.textSecondary, opacity: 0.55 }} />
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="cp-doc-tile-name">{label}</div>
                  {url && resolved ? (
                    <button type="button" className="cp-doc-tile-action" onClick={() => setViewing({ label, url: resolved })}>
                      Tap to view
                    </button>
                  ) : (
                    <span className="cp-doc-tile-missing">Not uploaded</span>
                  )}
                </div>
                {url && resolved && (
                  <button
                    type="button" className="cp-doc-tile-dl" title="Download" disabled={downloading === label}
                    onClick={() => handleDownload(label, url)}
                  >
                    <MdDownload size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {viewing && (
        <DocumentViewerModal t={t} label={viewing.label} url={viewing.url} onClose={() => setViewing(null)} />
      )}
    </>
  );
};

export default CustomerHomePage;
