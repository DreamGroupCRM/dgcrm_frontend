// V_25.0 — "Drafts (n)" on Employee Details / Customer Details: the Add
// forms saved with "Save as Draft" (see services/draftsService.ts). They
// are listed here, never mixed into the real employee/customer rows. The
// person who saved a draft sees theirs; Admin / Super Admin see all.
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MdClose, MdDelete, MdEditNote, MdPlayArrow } from 'react-icons/md';
import { toast } from '@/utils/toast';
import { showAlert, formatLastLogin } from '../../utils';
import { useAppearanceTokens } from '../../styles/appearanceTokens';
import { DraftModule, FormDraft, deleteDraft, fetchDrafts } from '../../services/draftsService';

const DraftsButton: React.FC<{ module: DraftModule; addPath: string; showOwner?: boolean }> = ({ module, addPath, showOwner = false }) => {
  const { t } = useAppearanceTokens();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<FormDraft[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try { setDrafts(await fetchDrafts(module)); } catch { /* no drafts access: button just shows 0 */ }
  }, [module]);
  useEffect(() => { load(); }, [load]);

  const remove = async (d: FormDraft) => {
    const r = await showAlert.confirm(`Delete the draft "${d.title || 'Untitled'}"? This cannot be undone.`, 'Delete Draft?');
    if (!r.isConfirmed) return;
    try {
      await deleteDraft(module, d.id);
      toast.success('Draft deleted.');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete the draft.');
    }
  };

  const noun = module === 'employee' ? 'employee' : 'customer';
  return (
    <>
      <button type="button" onClick={() => { load(); setOpen(true); }}
        title={`Unfinished ${noun} forms saved as draft`}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: t.surfaceBg, color: 'var(--brand-ink)', border: '1px solid var(--brand-ink)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <MdEditNote size={18} /> Drafts ({drafts.length})
      </button>
      {open && createPortal(
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Drafts" className="rounded-2xl"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, width: '100%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.textPrimary }}>
                {module === 'employee' ? 'Employee' : 'Customer'} Drafts
              </h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary }}><MdClose size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: 12 }}>
              {drafts.length === 0 ? (
                <p style={{ padding: 20, textAlign: 'center', fontSize: 13, color: t.textSecondary, margin: 0 }}>
                  No drafts. Use "Save as Draft" on the Add {noun === 'employee' ? 'Employee' : 'Customer'} form to keep an unfinished form here.
                </p>
              ) : drafts.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 flex-wrap"
                  style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${t.surfaceBorder}`, marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="flex items-center gap-2">
                      <span className="draft-badge">DRAFT</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{d.title || `Untitled ${noun}`}</span>
                    </div>
                    <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 3 }}>
                      Last saved {formatLastLogin(d.updated_at)}
                      {showOwner && d.created_by_name ? ` · by ${d.created_by_name}` : ''}
                      {Object.keys(d.files).length > 0 ? ` · ${Object.keys(d.files).length} document(s)` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => navigate(`${addPath}?draft=${d.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                      style={{ background: 'var(--brand-gradient)', border: 'none', cursor: 'pointer' }}>
                      <MdPlayArrow size={15} /> Resume
                    </button>
                    <button type="button" onClick={() => remove(d)} title="Delete draft"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'transparent', color: '#dc2626', border: '1px solid #dc2626', cursor: 'pointer' }}>
                      <MdDelete size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default DraftsButton;
