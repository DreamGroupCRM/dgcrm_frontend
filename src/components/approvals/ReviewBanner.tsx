// ==========================================
// DGCRM — REVIEW BANNER (Admin's review form)
// ==========================================
// V_26.0 — on top of the real Add / Edit form opened for an employee's
// request: who sent it, what they changed (current vs proposed, documents
// previewable), and how approving works. The form below holds the values
// that will be saved.
import React, { useState } from 'react';
import { MdExpandMore, MdPendingActions } from 'react-icons/md';
import { AppTheme } from '../../styles/theme';
import { RequestRecord } from '../../services/changeRequestsService';
import { RequestValuesTable } from '../common/RequestValuesTable';
import DocumentViewerModal from '../common/DocumentViewerModal';
import { formatLastLogin } from '../../utils';

export const ReviewBanner: React.FC<{ t: AppTheme; isDark: boolean; review: RequestRecord; noun: string; readOnly?: boolean }> = ({ t, isDark, review, noun, readOnly }) => {
  // A new record: the form below already shows everything that was sent.
  const [open, setOpen] = useState(review.request.action !== 'create');
  const [preview, setPreview] = useState<{ label: string; url: string } | null>(null);
  const r = review.request;
  const isCreate = r.action === 'create';
  return (
    <div className="rounded-2xl mb-5" style={{ background: isDark ? 'rgba(180,83,9,0.12)' : '#fffbeb', border: `1px solid ${isDark ? 'rgba(245,158,11,0.4)' : '#fcd34d'}`, fontFamily: t.fontFamily }}>
      <div className="flex items-start gap-3 flex-wrap" style={{ padding: '12px 16px' }}>
        <MdPendingActions size={22} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: t.textPrimary }}>
            {isCreate ? `New ${noun} — waiting for your approval` : `Changes to this ${noun} — waiting for your approval`}
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
            Sent by <b style={{ color: t.textPrimary }}>{r.requested_by_name || r.requested_by_email || '—'}</b>
            {r.requested_by_designations ? ` (${r.requested_by_designations})` : ''} on {formatLastLogin(r.requested_at)}
            {!isCreate && <> · <b style={{ color: isDark ? '#fcd34d' : '#92400e' }}>{review.changed.length} field{review.changed.length === 1 ? '' : 's'} changed</b></>}
          </div>
          <div style={{ fontSize: 12, color: t.textPrimary, marginTop: 6 }}>
            {readOnly
              // V_29.0 (F1) — changes to an existing customer are not edited here.
              ? <>Below is the {noun} as it will be after approval. These changes are approved exactly as sent: press <b>Approve</b>, or <b>Reject</b> with a note asking for the correction.</>
              : <>The form below is filled with the request{isCreate ? '' : ' (the record with the proposed changes)'}. Correct any field or document if needed, then press <b>Approve</b> — it is saved like a normal save. <b>Reject</b> sends it back with your note.</>}
          </div>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 rounded-lg"
          style={{ padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: t.surfaceBg, color: 'var(--brand-ink)', border: `1px solid ${t.surfaceBorder}` }}>
          {open ? 'Hide' : 'Show'} what was sent <MdExpandMore size={16} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          <div className="rounded-xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, padding: 10 }}>
            <RequestValuesTable t={t} isDark={isDark} row={r} onPreview={setPreview} />
          </div>
        </div>
      )}
      {preview && <DocumentViewerModal t={t} label={preview.label} url={preview.url} onClose={() => setPreview(null)} />}
    </div>
  );
};
