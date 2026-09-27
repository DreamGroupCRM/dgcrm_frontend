// ==========================================
// DGCRM — PAYMENT RECEIPT SHEET (shared by View + Download)
// ==========================================
// The company's printed receipt book layout ("PAYMENT RECEIPT", company
// name/GSTIN/address, Building/Flat/Wing/EMI box, Receipt No./Date,
// Received with thanks from, Sum + GST = Total, In words, Cash/Cheque,
// Dated, Bank, ₹ box, For <company> / Authorised Signatory), filled in with
// the payment's real data.
//
// One component for both uses so they can never drift apart:
//  - PaymentReceiptViewModal shows it on screen;
//  - paymentPdfExport captures this same sheet into the downloaded PDF.
// Everything is inline-styled with a fixed 840px design width and system
// fonts, so it renders identically inside the PDF capture frame (which has
// none of the app's stylesheets).
import React from 'react';
// Transparent-background version of the brand logo (logo_dream_group.png
// has a black background that shows as a box on a white receipt).
import logoUrl from '../../assets/images/favicon_logo.png';
import { PaymentReceipt } from '../../types/index';
import { numberToIndianWords } from '../../utils';
import { paymentForLabel } from '../../services/paymentService';

export const RECEIPT_SHEET_WIDTH = 840;
export const RECEIPT_LOGO_URL = logoUrl;

// Header details printed on the physical receipt book — used for any field
// the Company Master row doesn't have (or when no company is linked).
const DEFAULT_ISSUER = {
  name: 'DREAM BUILDERS',
  gst: '27AAWFD9851G1ZQ',
  address: 'A-01, Al- Fatah Apt., Sai Nagar, Opp. Police Station, Nalasopara (W), Dist. Palghar - 401 203.',
  mobile: '+91 7414992571 / 8855996468',
};

const BLUE = '#1f3a93';      // receipt-book blue (borders, labels, title)
const INK = '#0f172a';       // filled-in values
const FONT = 'Arial, Helvetica, sans-serif';

const amountText = (n: number): string => Math.round(n || 0).toLocaleString('en-IN');
const formatDMY = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
};
const monthYear = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const [y, m] = iso.slice(0, 7).split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return y && m ? `${names[Number(m) - 1]} ${y}` : '';
};

/** Everything printed on the receipt, derived from the API data. */
export function receiptFields(data: PaymentReceipt) {
  const { transaction: tx, customer, issuer } = data;
  const isDefaultCompany = !issuer || /dream\s*builders?/i.test(issuer.name || '');
  const pick = (value: string | null | undefined, fallback: string) =>
    (value && value.trim()) || (isDefaultCompany ? fallback : '');
  const addressFromMaster = issuer
    ? [issuer.address, issuer.city && !String(issuer.address || '').includes(issuer.city) ? issuer.city : '', issuer.pincode ? `- ${issuer.pincode}` : '']
        .filter(Boolean).join(', ').replace(', -', ' -')
    : '';
  const mobileFromMaster = issuer ? [issuer.phone, issuer.alternate_contact_number].filter(Boolean).join(' / ') : '';
  const companyName = (issuer?.name || DEFAULT_ISSUER.name).toUpperCase();

  const total = tx.amount + (tx.maintenance || 0);
  const mode = (tx.mode_of_payment || '').trim();
  const isCheque = /cheque/i.test(mode);
  const isEmi = tx.payment_type === 'EMIAmount';
  const typeLabel = tx.payment_tag === 'Extra Pay' ? 'Extra Pay' : paymentForLabel(tx.payment_type);

  return {
    gstin: pick(issuer?.gst, DEFAULT_ISSUER.gst),
    companyName,
    address: pick(addressFromMaster, DEFAULT_ISSUER.address),
    mobile: pick(mobileFromMaster, DEFAULT_ISSUER.mobile),
    building: customer.building_name || '',
    flatNo: customer.flat_no || '',
    wing: customer.wing_name || '',
    emiMonth: monthYear(tx.inst_date),
    // EMI payments show their EMI number (n / total); any other payment
    // shows what it was for (Booking Amount, Possession Amount, …).
    emiNo: isEmi && data.emi_number ? `${data.emi_number}${data.total_emis ? ` / ${data.total_emis}` : ''}` : typeLabel,
    receiptNo: tx.receipt_number || 'Pending Approval',
    date: formatDMY(tx.payment_date || tx.date || tx.created_at),
    receivedFrom: `${customer.customer_name || ''}${customer.customer_code ? `  (${customer.customer_code})` : ''}`.trim(),
    sum: amountText(total),
    gst: '',
    total: amountText(total),
    inWords: total ? numberToIndianWords(total) : '',
    cashOrCheque: isCheque ? (tx.cheque_number || 'Cheque') : (mode || ''),
    dated: isCheque ? formatDMY(tx.clearance_date) : '',
    bank: '',
  };
}

// ── Small layout pieces ──────────────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ color: BLUE, fontWeight: 800, fontSize: 15, letterSpacing: 0.2, whiteSpace: 'nowrap', ...style }}>{children}</span>
);
// A filled-in blank: the value sits on the receipt's ruled line.
const Blank: React.FC<{ value: string; flex?: number; big?: boolean }> = ({ value, flex = 1, big }) => (
  <span style={{
    flex, minWidth: 0, borderBottom: `1.6px solid ${BLUE}`, padding: '0 6px 2px', color: INK,
    fontWeight: 700, fontSize: big ? 18 : 16, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }}>{value || ' '}</span>
);
const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 20 }}>{children}</div>
);

export const ReceiptSheet: React.FC<{ data: PaymentReceipt; onLogoLoad?: () => void; logoSrc?: string }> = ({ data, onLogoLoad, logoSrc }) => {
  const f = receiptFields(data);
  // The company name gets the space left of the logo (~380px); longer
  // names get a smaller font instead of being cut off.
  const nameFontPx = Math.max(20, Math.min(42, Math.floor(380 / (Math.max(f.companyName.length, 1) * 0.7))));
  const infoRows: [string, string][] = [
    ['BUILDING', f.building], ['FLAT NO.', f.flatNo], ['WING', f.wing], ['EMI MONTH', f.emiMonth], ['EMI NO.', f.emiNo],
  ];
  return (
    <div style={{ width: RECEIPT_SHEET_WIDTH, background: '#fff', padding: 14, fontFamily: FONT, boxSizing: 'border-box' }}>
      <div style={{ border: `2.5px solid ${BLUE}`, boxSizing: 'border-box' }}>
        {/* ── Header: company block (left) + unit/EMI box (right) ── */}
        <div style={{ display: 'flex', borderBottom: `2.5px solid ${BLUE}` }}>
          <div style={{ flex: 1, minWidth: 0, padding: '10px 14px 8px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: BLUE, fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap' }}>GSTIN : {f.gstin || '—'}</span>
              <span style={{ background: BLUE, color: '#fff', fontWeight: 800, fontSize: 14, padding: '6px 12px', borderRadius: '0 0 8px 8px', marginTop: -10, whiteSpace: 'nowrap' }}>
                PAYMENT RECEIPT
              </span>
            </div>
            <img src={logoSrc || logoUrl} alt="" onLoad={onLogoLoad} onError={onLogoLoad}
              style={{ position: 'absolute', right: 10, top: 8, width: 92, height: 92, objectFit: 'contain' }} />
            <div style={{ color: BLUE, fontWeight: 400, fontSize: nameFontPx, letterSpacing: 1, lineHeight: 1.1, marginTop: 18, paddingRight: 96, whiteSpace: 'nowrap' }}>
              {f.companyName}
            </div>
            <div style={{ height: 3, background: '#1e293b', margin: '4px 96px 6px 0' }} />
            <div style={{ color: '#1e293b', fontWeight: 700, fontSize: 12.5, lineHeight: 1.45 }}>
              {f.address}{f.mobile ? ` Mob.: ${f.mobile}` : ''}
            </div>
          </div>
          <div style={{ width: 300, borderLeft: `2.5px solid ${BLUE}`, display: 'flex', flexDirection: 'column' }}>
            {infoRows.map(([label, value], i) => (
              <div key={label} style={{ flex: 1, display: 'flex', borderTop: i ? `1.8px solid ${BLUE}` : 'none', minHeight: 36 }}>
                <div style={{ width: 118, borderRight: `1.8px solid ${BLUE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BLUE, fontWeight: 800, fontSize: 13.5 }}>{label}</div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', padding: '0 10px', color: INK, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '22px 28px 16px' }}>
          <Row>
            <Label>RECEIPT NO.</Label>
            <span style={{ flex: 1.2, color: INK, fontWeight: 700, fontSize: 24, fontFamily: 'Georgia, "Times New Roman", serif', padding: '0 8px' }}>{f.receiptNo}</span>
            <Label>DATE :</Label>
            <Blank value={f.date} flex={0.8} />
          </Row>
          <Row>
            <Label>RECEIVED WITH THANKS FROM</Label>
            <Blank value={f.receivedFrom} big />
          </Row>
          <Row>
            <Label>THE SUM OF RUPEES</Label>
            <Blank value={f.sum} flex={1.1} />
            <Label>+ GST</Label>
            <Blank value={f.gst} flex={1} />
            <Label>TOTAL</Label>
            <Blank value={f.total} flex={1} />
          </Row>
          <Row>
            <Label>IN WORDS</Label>
            <Blank value={f.inWords} />
          </Row>
          <Row>
            <Label>BY CASH / CHEQUE NO.</Label>
            <Blank value={f.cashOrCheque} flex={1.1} />
            <Label>DATED :</Label>
            <Blank value={f.dated} flex={0.9} />
            <Label>BANK :</Label>
            <Blank value={f.bank} flex={0.9} />
          </Row>

          {/* ── Footer: ₹ box (left), signatory (right) ── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'stretch', border: `2.5px solid ${BLUE}`, width: 320, height: 58 }}>
                <div style={{ width: 62, background: BLUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 700 }}>₹</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 12px', color: INK, fontWeight: 800, fontSize: 24 }}>
                  {f.total}/-
                </div>
              </div>
              <div style={{ color: '#1e293b', fontWeight: 700, fontSize: 12.5, marginTop: 6, paddingLeft: 24 }}>Cheques are subject to realisation</div>
            </div>
            <div style={{ textAlign: 'center', paddingRight: 8 }}>
              <div style={{ color: BLUE, fontSize: 20, letterSpacing: 0.6 }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>For </span>{f.companyName}
              </div>
              <div style={{ height: 44 }} />
              <div style={{ color: '#1e293b', fontWeight: 700, fontSize: 11.5, letterSpacing: 0.3 }}>AUTHORISED SIGNATORY</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
