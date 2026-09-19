// ==========================================
// DGCRM — EMI SCHEME & SCHEDULE PREVIEW (shared modal)
// ==========================================
// Lets a sales rep see the EMI Scheme + EMI Schedule a customer's Payment
// Details will produce — WITHOUT leaving the Add/Edit Customer form and
// without saving anything — by opening this as a small popup instead of
// navigating to the full Customize Scheme page. The calculation itself
// (computeEmiScheme) is the exact same pure function that page's own
// "what-if" calculator uses, so a rep sees the same numbers here as they
// would there for the same inputs.
//
// Nothing here is persisted: this reads the form's current field values,
// computes live, and throws the result away when closed. The customer's
// actual EMI Schedule is generated server-side at save time from the same
// fields (scheduleGenerator.ts) — this is a preview of what that will be,
// not a substitute for it.
import React, { useMemo, useState } from 'react';
import { MdClose, MdCalculate, MdListAlt } from 'react-icons/md';
import { AppTheme } from '../../styles/theme';
import { AccordionSection } from './Accordion';
import {
  computeEmiScheme, formatINR, formatDMY, EmiSchemeInputs, EmiSummaryRow, EmiScheduleRow,
} from '../../utils/emiSchemeCalculator';

type Theme = AppTheme;

const SummaryTable: React.FC<{
  t: Theme; heading: string; rows: EmiSummaryRow[]; total: number; totalLabel: string;
}> = ({ t, heading, rows, total, totalLabel }) => (
  <div className="mb-3">
    <div style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary, marginBottom: 6 }}>{heading}</div>
    <div style={{ overflowX: 'auto', border: `1px solid ${t.surfaceBorder}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
        <thead>
          <tr style={{ background: t.insetBg }}>
            <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 32 }}>#</th>
            <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Payment Details</th>
            <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${t.divider}` }}>
              <td style={{ padding: '6px 10px', fontSize: 10.5, color: t.textSecondary }}>{i + 1}</td>
              <td style={{ padding: '6px 10px', fontSize: 11, color: t.textPrimary }}>{r.label}</td>
              <td style={{ padding: '6px 10px', fontSize: 11, color: t.textPrimary, textAlign: 'right', fontWeight: 600 }}>{formatINR(r.amount)}</td>
            </tr>
          ))}
          <tr style={{ borderTop: `1px solid ${t.surfaceBorder}`, background: t.insetBg }}>
            <td colSpan={2} style={{ padding: '7px 10px', fontSize: 11, fontWeight: 700, color: t.textPrimary }}>{totalLabel}</td>
            <td style={{ padding: '7px 10px', fontSize: 11, fontWeight: 800, color: 'var(--brand-ink)', textAlign: 'right' }}>{formatINR(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const ScheduleTable: React.FC<{
  t: Theme; section: 'A' | 'B'; rows: EmiScheduleRow[]; total: number; totalLabel: string;
}> = ({ t, section, rows, total, totalLabel }) => (
  <div className="mb-3">
    <div style={{ overflowX: 'auto', border: `1px solid ${t.surfaceBorder}`, borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
        <thead>
          <tr style={{ background: t.insetBg }}>
            <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 50 }}>Sr No</th>
            <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}`, width: 96 }}>Inst Date</th>
            <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>({section}) Mode Of Payment</th>
            <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: t.textSecondary, borderBottom: `1px solid ${t.surfaceBorder}` }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: 18, textAlign: 'center', fontSize: 10.5, color: t.textSecondary }}>No installments in this phase.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.sr} style={{ borderTop: `1px solid ${t.divider}` }}>
              <td style={{ padding: '5px 10px', fontSize: 10.5, color: t.textSecondary }}>{r.sr}</td>
              <td style={{ padding: '5px 10px', fontSize: 10.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>{formatDMY(r.date)}</td>
              <td style={{ padding: '5px 10px', fontSize: 10.5, color: t.textPrimary }}>{r.label}</td>
              <td style={{ padding: '5px 10px', fontSize: 10.5, color: t.textPrimary, textAlign: 'right', fontWeight: 600 }}>{formatINR(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary, marginTop: 6 }}>
      {totalLabel} : <span style={{ color: 'var(--brand-ink)' }}>{formatINR(total)}</span>
    </div>
  </div>
);

export interface EmiSchemePreviewModalProps {
  t: Theme;
  inputs: EmiSchemeInputs;
  onClose: () => void;
}

export const EmiSchemePreviewModal: React.FC<EmiSchemePreviewModalProps> = ({ t, inputs, onClose }) => {
  const computed = useMemo(() => computeEmiScheme(inputs), [inputs]);

  // Collapsed by default, same as the Customize Scheme page's own EMI
  // Scheme/Schedule accordions — keeps the popup itself compact ("a small
  // preview") the moment it opens, with the full breakdown one tap away.
  const [showScheme, setShowScheme] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="EMI Scheme and Schedule preview"
    >
      <div
        className="rounded-2xl w-full flex flex-col"
        style={{ maxWidth: 640, maxHeight: '88vh', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div>
            <h3 style={{ fontSize: 14.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>EMI Scheme & Schedule Preview</h3>
            <p style={{ fontSize: 11, color: t.textSecondary, margin: '2px 0 0' }}>
              Based on the Payment Details entered above — nothing here is saved.
            </p>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close preview"
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ width: 30, height: 30, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <MdClose size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <AccordionSection
            theme={t} icon={<MdCalculate size={16} />} title="EMI Scheme" gradient="var(--grad-green)"
            open={showScheme} onToggle={() => setShowScheme((v) => !v)}
          >
            <SummaryTable t={t} heading="A) Mode of Payment (Before Possession)" rows={computed.summaryA} total={computed.totalA} totalLabel="Total (A) (Before Possession)" />
            <SummaryTable t={t} heading="B) After Possession" rows={computed.summaryB} total={computed.totalB} totalLabel="Total (B) (After Possession)" />
            <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: t.insetBg }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary }}>Total Cost of Flat (A + B)</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--brand-ink)' }}>{formatINR(computed.grandTotal)}</span>
            </div>
          </AccordionSection>

          <div style={{ height: 12 }} />

          <AccordionSection
            theme={t} icon={<MdListAlt size={16} />} title={`EMI Schedule (${computed.tenure} + ${computed.afterCount} months)`} gradient="var(--grad-teal)"
            open={showSchedule} onToggle={() => setShowSchedule((v) => !v)}
          >
            <ScheduleTable t={t} section="A" rows={computed.beforeRows} total={computed.totalA} totalLabel="(A) Total Before Possession" />
            <ScheduleTable t={t} section="B" rows={computed.afterRows} total={computed.totalB} totalLabel="(B) Total After Possession" />
            <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: t.insetBg }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary }}>Total (A + B)</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--brand-ink)' }}>{formatINR(computed.grandTotal)}</span>
            </div>
          </AccordionSection>
        </div>
      </div>
    </div>
  );
};

export default EmiSchemePreviewModal;
