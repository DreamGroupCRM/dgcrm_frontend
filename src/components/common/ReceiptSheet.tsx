// ==========================================
// DGCRM — PAYMENT RECEIPT SHEET (shared by View + Download)
// ==========================================
// A same-to-same copy of Dream Builders' printed receipt book: the header
// (GSTIN, PAYMENT RECEIPT badge, DREAM BUILDERS, address/mobile, logo),
// the Building / Flat No. / Wing / EMI Month / EMI No. box, and the body
// lines are fixed exactly as printed on the book — only the blanks are
// filled in with the payment's data.
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

/**
 * 'payment' — money received from the customer (the printed book as is).
 * 'cancelled' — a cancelled booking's refund (receipt no. C_FY_MM_n): the
 * same sheet, badged CANCELLED RECEIPT and made out to the customer.
 */
export type ReceiptVariant = 'payment' | 'cancelled';
export const RECEIPT_LOGO_URL = logoUrl;

// Exactly as printed on the receipt book — never taken from the database.
const PRINTED = {
  gstin: '27AAWFD9851G1ZQ',
  company: 'DREAM BUILDERS',
  addressLine1: 'A-01, Al- Fatah Apt., Sai Nagar, Opp. Police Station, Nalasopara (W),',
  addressLine2: 'Dist. Palghar - 401 203. Mob.: +91 7414992571 / 8855996468',
  signFor: 'DREAMS BUILDERS',
};

const BLUE = '#1f3a93';      // receipt-book blue (borders, labels, title)
const INK = '#0f172a';       // filled-in values
// Printed labels are a condensed bold face; the company name a rounded
// geometric face. Each falls back to the closest common system font.
const LABEL_FONT = '"Arial Narrow", "Roboto Condensed", "Helvetica Neue Condensed", Arial, sans-serif';
const TITLE_FONT = '"Century Gothic", "Futura", "Avenir Next", "Trebuchet MS", Arial, sans-serif';
const VALUE_FONT = 'Arial, Helvetica, sans-serif';

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

/** The filled-in values for the receipt's blanks, from the API data. */
export function receiptFields(data: PaymentReceipt, variant: ReceiptVariant = 'payment') {
  const { transaction: tx, customer } = data;
  const total = tx.amount + (tx.maintenance || 0);
  const mode = (tx.mode_of_payment || '').trim();
  const isCheque = /cheque/i.test(mode);
  const isEmi = tx.payment_type === 'EMIAmount';
  const typeLabel = tx.payment_tag === 'Extra Pay' ? 'Extra Pay' : paymentForLabel(tx.payment_type);

  return {
    building: customer.building_name || '',
    flatNo: customer.flat_no || '',
    wing: customer.wing_name || '',
    emiMonth: monthYear(tx.inst_date),
    // EMI payments show their EMI number (n / total); any other payment
    // shows what it was for (Booking Amount, Possession Amount, …).
    emiNo: variant === 'cancelled' ? 'Refund'
      : isEmi && data.emi_number ? `${data.emi_number}${data.total_emis ? ` / ${data.total_emis}` : ''}` : typeLabel,
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
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: BLUE, fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 17, letterSpacing: 0.1, whiteSpace: 'nowrap' }}>{children}</span>
);
// A filled-in blank: the value sits on the receipt's ruled line.
const Blank: React.FC<{ value: string; flex?: number; big?: boolean }> = ({ value, flex = 1, big }) => (
  <span style={{
    flex, minWidth: 0, borderBottom: `1.8px solid ${BLUE}`, padding: '0 6px 2px', color: INK, fontFamily: VALUE_FONT,
    fontWeight: 700, fontSize: big ? 18 : 16, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }}>{value || ' '}</span>
);
const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 24 }}>{children}</div>
);

export const ReceiptSheet: React.FC<{ data: PaymentReceipt; onLogoLoad?: () => void; logoSrc?: string; variant?: ReceiptVariant }> = ({ data, onLogoLoad, logoSrc, variant = 'payment' }) => {
  const f = receiptFields(data, variant);
  const cancelled = variant === 'cancelled';
  const infoRows: [string, string][] = [
    ['BUILDING', f.building], ['FLAT NO.', f.flatNo], ['WING', f.wing], ['EMI MONTH', f.emiMonth], ['EMI NO.', f.emiNo],
  ];
  return (
    <div style={{ width: RECEIPT_SHEET_WIDTH, background: '#fff', padding: 14, fontFamily: VALUE_FONT, boxSizing: 'border-box' }}>
      <div style={{ border: `2.5px solid ${BLUE}`, boxSizing: 'border-box' }}>
        {/* ── Header: printed company block (left) + unit/EMI box (right) ── */}
        <div style={{ display: 'flex', borderBottom: `2.5px solid ${BLUE}` }}>
          <div style={{ flex: 1, minWidth: 0, padding: '0 10px 8px 14px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ color: BLUE, fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', marginTop: 16 }}>
                GSTIN : {PRINTED.gstin}
              </span>
              <span style={{ background: BLUE, color: '#fff', fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 15, padding: '9px 12px 7px', borderRadius: '0 0 9px 9px', whiteSpace: 'nowrap' }}>
                {cancelled ? 'CANCELLED RECEIPT' : 'PAYMENT RECEIPT'}
              </span>
            </div>
            <img src={logoSrc || logoUrl} alt="" onLoad={onLogoLoad} onError={onLogoLoad}
              style={{ position: 'absolute', right: 8, top: 4, width: 84, height: 112, objectFit: 'contain' }} />
            <div style={{ color: BLUE, fontFamily: TITLE_FONT, fontWeight: 400, fontSize: 38, letterSpacing: 1.5, lineHeight: 1, marginTop: 18, paddingRight: 92, whiteSpace: 'nowrap' }}>
              {PRINTED.company}
            </div>
            <div style={{ height: 3, background: '#1e293b', margin: '6px 92px 7px 0' }} />
            <div style={{ color: '#1e293b', fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 12.5, lineHeight: 1.45, whiteSpace: 'nowrap' }}>
              <div>{PRINTED.addressLine1}</div>
              <div>{PRINTED.addressLine2}</div>
            </div>
          </div>
          <div style={{ width: 280, borderLeft: `2.5px solid ${BLUE}`, display: 'flex', flexDirection: 'column' }}>
            {infoRows.map(([label, value], i) => (
              <div key={label} style={{ flex: 1, display: 'flex', borderTop: i ? `1.8px solid ${BLUE}` : 'none', minHeight: 36 }}>
                <div style={{ width: 118, borderRight: `1.8px solid ${BLUE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#1e293b', fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                  <span style={{ color: INK, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px 28px 14px' }}>
          <Row>
            <Label>RECEIPT NO.</Label>
            <span style={{ flex: 1.2, color: INK, fontWeight: 700, fontSize: 26, fontFamily: 'Georgia, "Times New Roman", serif', padding: '0 12px', lineHeight: 1 }}>{f.receiptNo}</span>
            <Label>DATE :</Label>
            <Blank value={f.date} flex={0.8} />
          </Row>
          <Row>
            <Label>{cancelled ? 'REFUNDED TO' : 'RECEIVED WITH THANKS FROM'}</Label>
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 4 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'stretch', border: `2.5px solid ${BLUE}`, width: 320, height: 60 }}>
                <div style={{ width: 62, background: BLUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 700 }}>₹</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 12px', color: INK, fontWeight: 800, fontSize: 24 }}>
                  {f.total}/-
                </div>
              </div>
              <div style={{ color: '#1e293b', fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 15, marginTop: 8, paddingLeft: 26 }}>Cheques are subject to realisation</div>
            </div>
            <div style={{ textAlign: 'center', paddingRight: 4, paddingTop: 0 }}>
              <div style={{ color: BLUE, whiteSpace: 'nowrap' }}>
                <span style={{ fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 16 }}>For </span>
                <span style={{ fontFamily: TITLE_FONT, fontSize: 22, letterSpacing: 1 }}>{PRINTED.signFor}</span>
              </div>
              <div style={{ height: 56 }} />
              <div style={{ color: '#1e293b', fontFamily: LABEL_FONT, fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>AUTHORISED SIGNATORY</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
