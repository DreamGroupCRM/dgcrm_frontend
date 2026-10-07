// V_25.0 — "Cancel a Booking" on the Cancelled Booking page. Cancel
// Booking belongs to Refund (and Admin), not to Recovery/Sales: Refund
// picks an active customer here and the usual Cancel Booking popup
// (CancelBookingModal) takes over — an Admin cancels at once, anyone else's
// request waits in Pending Admin Approval, exactly as before.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdEventBusy, MdSearch } from 'react-icons/md';
import { AppTheme } from '../../../../styles/theme';
import { CancellableCustomer, fetchCancellableCustomers } from '../../../../services/customerDetailsService';
import { Customer } from '../../../../types';
import CancelBookingModal from './CancelBookingModal';

const fullName = (c: CancellableCustomer) => [c.name, c.middle_name, c.last_name].filter(Boolean).join(' ') || '—';

const CancelBookingPicker: React.FC<{ t: AppTheme; isAdmin: boolean; onDone: () => void }> = ({ t, isAdmin, onDone }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<CancellableCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<Customer | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    const h = setTimeout(() => {
      fetchCancellableCustomers(search)
        .then((r) => { if (alive) setRows(r); })
        .catch(() => { if (alive) setRows([]); })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(h); };
  }, [open, search]);

  const pick = (c: CancellableCustomer) => {
    setOpen(false);
    setTarget({ id: String(c.id), customer_code: c.customer_code ?? '', customer_name: fullName(c) } as unknown as Customer);
  };

  return (
    <>
      <button type="button" onClick={() => { setSearch(''); setOpen(true); }}
        className="flex items-center gap-1.5 px-4 rounded-xl text-sm font-semibold danger-outline-btn"
        style={{ height: 38, background: t.surfaceBg, color: '#b91c1c', border: '1px solid #b91c1c', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <MdEventBusy size={17} /> Cancel a Booking
      </button>
      {open && createPortal(
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div role="dialog" aria-label="Cancel a Booking" onClick={(e) => e.stopPropagation()} className="rounded-2xl"
            style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Cancel a Booking — choose the customer</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary }}><MdClose size={18} /></button>
            </div>
            <div className="p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="flex items-center gap-2 px-3 rounded-xl" style={{ border: `1px solid ${t.inputBorder}`, background: t.inputBg }}>
                <MdSearch size={18} color={t.textSecondary} />
                <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, Customer ID or mobile"
                  aria-label="Search customer"
                  style={{ flex: 1, padding: '10px 0', border: 'none', outline: 'none', background: 'transparent', color: t.inputText, fontSize: 13 }} />
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: 8 }}>
              {loading ? <p style={{ padding: 16, textAlign: 'center', fontSize: 13, color: t.textSecondary, margin: 0 }}>Searching…</p>
                : rows.length === 0 ? <p style={{ padding: 16, textAlign: 'center', fontSize: 13, color: t.textSecondary, margin: 0 }}>No active customer found.</p>
                : rows.map((c) => (
                  <button key={c.id} type="button" onClick={() => pick(c)}
                    className="w-full text-left rounded-xl master-table-row-hover"
                    style={{ display: 'block', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{fullName(c)} <span style={{ fontWeight: 500, color: t.textSecondary }}>({c.customer_code || '—'})</span></div>
                    <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 2 }}>
                      {[c.building_name, c.wing_name ? `${c.wing_name} Wing` : '', c.flat_no ? `Flat ${c.flat_no}` : ''].filter(Boolean).join(' - ') || '—'}
                      {c.mobile_number ? ` · ${c.mobile_number}` : ''}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
      {target && (
        <CancelBookingModal t={t} customer={target} isAdmin={isAdmin}
          onClose={() => setTarget(null)}
          onDone={() => { setTarget(null); onDone(); }} />
      )}
    </>
  );
};

export default CancelBookingPicker;
