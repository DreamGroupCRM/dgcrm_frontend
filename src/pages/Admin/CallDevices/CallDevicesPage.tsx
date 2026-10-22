// ==========================================
// DREAM GROUP CRM - CALL SYNC PHONES (Admin)
// ==========================================
// V_27.0 — phones running the DGCRM Calls app (backend modules/callSync):
// who is signed in on each, when it last synced, how many calls it sent.
// "Block" stops a lost phone or a departed employee's phone at once: its
// token is refused from the next request and nobody can sign in on it.
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from '@/utils/toast';
import { MdPhoneAndroid, MdRefresh, MdBlock } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { getAccordionCardStyle, getAccordionHeaderStyle } from '../../../components/common/MasterListUI';
import { formatLastLogin } from '../../../utils';
import { CallDevice, fetchCallDevices, revokeCallDevice } from '../../../services/callService';

interface ErrLike { response?: { data?: { message?: string } } }
const errMessage = (e: unknown, fallback: string) => (e as ErrLike)?.response?.data?.message || fallback;

const CallDevicesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t } = useAppearanceTokens();
  const [devices, setDevices] = useState<CallDevice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { dispatch(setPageTitle('Call Sync Phones')); }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDevices(await fetchCallDevices());
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load phones.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const block = async (d: CallDevice) => {
    const answer = await Swal.fire({
      icon: 'warning',
      title: 'Block this phone?',
      text: `${d.label || 'This phone'} will stop syncing calls immediately and nobody can sign in on it again.`,
      showCancelButton: true,
      confirmButtonText: 'Block phone',
      confirmButtonColor: '#DC2626',
    });
    if (!answer.isConfirmed) return;
    try {
      await revokeCallDevice(d.id);
      toast.success('Phone blocked.');
      load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to block the phone.'));
    }
  };

  const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 12.5, color: t.textPrimary, borderTop: `1px solid ${t.surfaceBorder}` };
  const head: React.CSSProperties = { ...cell, fontWeight: 700, color: t.textSecondary, borderTop: 'none', textAlign: 'left' };

  return (
    <div style={{ padding: 16 }}>
      <div style={getAccordionCardStyle(t)}>
        <div style={getAccordionHeaderStyle(t, true)}>
          <span className="flex items-center gap-2" style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>
            <MdPhoneAndroid size={18} /> Phones running DGCRM Calls
          </span>
          <button type="button" onClick={load} disabled={loading} className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }} title="Refresh">
            <MdRefresh size={16} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={head}>Phone</th>
                <th style={head}>Signed in</th>
                <th style={head}>Last sync</th>
                <th style={head}>Calls</th>
                <th style={head}>Status</th>
                <th style={head} />
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 && (
                <tr><td colSpan={6} style={{ ...cell, textAlign: 'center', color: t.textSecondary }}>
                  {loading ? 'Loading...' : 'No phones yet. A phone appears here after an employee signs in to the DGCRM Calls app.'}
                </td></tr>
              )}
              {devices.map((d) => (
                <tr key={d.id}>
                  <td style={cell}>
                    <div style={{ fontWeight: 600 }}>{d.label || 'Unknown phone'}</div>
                    <div style={{ fontSize: 10.5, color: t.textSecondary }}>App {d.app_version || '—'} · added {formatLastLogin(d.created_at)}</div>
                  </td>
                  <td style={cell}>
                    {d.employee_name
                      ? <>{d.employee_name}<div style={{ fontSize: 10.5, color: t.textSecondary }}>since {formatLastLogin(d.signed_in_at)}</div></>
                      : <span style={{ color: t.textSecondary }}>Nobody</span>}
                  </td>
                  <td style={cell}>{formatLastLogin(d.last_seen_at)}</td>
                  <td style={cell}>{d.call_count}</td>
                  <td style={cell}>
                    {d.is_active
                      ? <span style={{ color: '#047857', fontWeight: 600 }}>Active</span>
                      : <span style={{ color: '#DC2626', fontWeight: 600 }}>Blocked {d.revoked_at ? formatLastLogin(d.revoked_at) : ''}</span>}
                  </td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    {d.is_active && (
                      <button type="button" onClick={() => block(d)} className="master-btn-icon"
                        style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: '#DC2626' }} title="Block phone">
                        <MdBlock size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CallDevicesPage;
