// ==========================================
// DREAM GROUP CRM - CALL SYNC PHONES (Admin)
// ==========================================
// V_27.0 — the DGCRM Calls phone app (backend modules/callSync):
//  * Company PIN: employees enter it on the phone (stored hashed only).
//  * Phones: a phone that entered the PIN waits here as "Waiting" until an
//    admin approves it once. "Block" stops a lost phone or a departed
//    employee's phone at once; a blocked phone can never re-join.
//  * WhatsApp: brochure link + message per project, sent from the phone
//    after a call ({name} {employee} {project} {brochure} are filled in).
//  * Retention: when old calls are archived / deleted and recordings removed.
//  * Every call is sent (V_29.0: work hours removed). A phone in personal
//    mode shows "Personal mode until …";
//    nothing about the calls made meanwhile ever reaches the CRM.
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from '@/utils/toast';
import { MdPhoneAndroid, MdRefresh, MdBlock, MdCheckCircle, MdPin, MdHistory, MdChat, MdPauseCircle } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { getAccordionCardStyle, getAccordionHeaderStyle, getFormInputStyle } from '../../../components/common/MasterListUI';
import { formatLastLogin } from '../../../utils';
import {
  CallDevice, CallSyncSettings, ProjectWhatsapp, approveCallDevice, blockCallDevice, fetchCallDevices,
  fetchCallSyncSettings, fetchWhatsappSettings, saveCallRetention, saveCallSyncPin, saveProjectWhatsapp,
  saveWhatsappDefault,
} from '../../../services/callService';

interface ErrLike { response?: { data?: { message?: string; errors?: { message?: string }[] } } }
const errMessage = (e: unknown, fallback: string) =>
  (e as ErrLike)?.response?.data?.errors?.[0]?.message || (e as ErrLike)?.response?.data?.message || fallback;

const STATUS: Record<CallDevice['status'], { label: string; color: string }> = {
  pending: { label: 'Waiting for approval', color: '#B45309' },
  approved: { label: 'Approved', color: '#047857' },
  blocked: { label: 'Blocked', color: '#DC2626' },
};


const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
/** "Off until I turn it on" is stored with a far-future end (backend INDEFINITE_PAUSE_UNTIL). */
const pausedText = (iso: string) =>
  new Date(iso).getFullYear() >= 2099 ? 'Personal mode (until turned on)' : `Personal mode until ${timeOf(iso)}`;

const CallDevicesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t } = useAppearanceTokens();
  const [devices, setDevices] = useState<CallDevice[]>([]);
  const [settings, setSettings] = useState<CallSyncSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [retention, setRetention] = useState({ archive_after_months: 12, delete_after_years: 3, recording_days: 180 });
  const [waDefault, setWaDefault] = useState('');
  const [waProjects, setWaProjects] = useState<ProjectWhatsapp[]>([]);

  useEffect(() => { dispatch(setPageTitle('Call Sync Phones')); }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s, wa] = await Promise.all([fetchCallDevices(), fetchCallSyncSettings(), fetchWhatsappSettings()]);
      setDevices(d);
      setSettings(s);
      setWaDefault(wa.default_message ?? '');
      setWaProjects(wa.projects);
      setRetention({ archive_after_months: s.archive_after_months, delete_after_years: s.delete_after_years, recording_days: s.recording_days });
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load call sync settings.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const savePin = async () => {
    if (!/^[0-9]{4,8}$/.test(pin)) { toast.error('PIN must be 4 to 8 digits.'); return; }
    try {
      await saveCallSyncPin(pin);
      setPin('');
      toast.success(settings?.pin_set ? 'PIN changed. Phones need the new PIN to switch employee.' : 'PIN set.');
      load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to save the PIN.'));
    }
  };

  const approve = async (d: CallDevice) => {
    try {
      await approveCallDevice(d.id);
      toast.success('Phone approved. The employee can now enter the PIN again and pick their name.');
      load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to approve the phone.'));
    }
  };

  const block = async (d: CallDevice) => {
    const answer = await Swal.fire({
      icon: 'warning',
      title: 'Block this phone?',
      text: `${d.label || 'This phone'} will stop syncing calls immediately and can never join again with the PIN.`,
      showCancelButton: true,
      confirmButtonText: 'Block phone',
      confirmButtonColor: '#DC2626',
    });
    if (!answer.isConfirmed) return;
    try {
      await blockCallDevice(d.id);
      toast.success('Phone blocked.');
      load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to block the phone.'));
    }
  };

  const saveWaDefault = async () => {
    if (!waDefault.trim()) { toast.error('Enter a message.'); return; }
    try {
      await saveWhatsappDefault(waDefault.trim());
      toast.success('Default WhatsApp message saved.');
    } catch (e) {
      toast.error(errMessage(e, 'Failed to save the message.'));
    }
  };

  const saveWaProject = async (p: ProjectWhatsapp) => {
    try {
      await saveProjectWhatsapp(p.id, p.brochure_url ?? '', p.whatsapp_message ?? '');
      toast.success(`Saved for ${p.project_name}.`);
    } catch (e) {
      toast.error(errMessage(e, 'Failed to save.'));
    }
  };

  const setWaField = (id: number, field: 'brochure_url' | 'whatsapp_message', value: string) =>
    setWaProjects((list) => list.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const saveRetention = async () => {
    try {
      await saveCallRetention(retention);
      toast.success('Retention saved. It applies from the next daily clean-up.');
      load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to save retention.'));
    }
  };

  const card = getAccordionCardStyle(t);
  const header = getAccordionHeaderStyle(t, true);
  const title: React.CSSProperties = { fontWeight: 700, fontSize: 13.5, color: t.textPrimary };
  const muted: React.CSSProperties = { fontSize: 12, color: t.textSecondary };
  const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 12.5, color: t.textPrimary, borderTop: `1px solid ${t.surfaceBorder}` };
  const head: React.CSSProperties = { ...cell, fontWeight: 700, color: t.textSecondary, borderTop: 'none', textAlign: 'left' };
  const iconBtn: React.CSSProperties = { background: t.insetBg, border: `1px solid ${t.surfaceBorder}` };
  const numberInput = (key: keyof typeof retention, label: string, suffix: string, min: number, max: number) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: t.textSecondary }}>
      {label}
      <span className="flex items-center gap-2">
        <input type="number" min={min} max={max} value={retention[key]} style={{ ...getFormInputStyle(t), width: 100 }}
          onChange={(e) => setRetention((r) => ({ ...r, [key]: Number(e.target.value) }))} />
        <span style={{ color: t.textPrimary }}>{suffix}</span>
      </span>
    </label>
  );

  return (
    <div style={{ padding: 16 }}>
      {/* ── Company PIN ─────────────────────────────────────────────── */}
      <div style={card}>
        <div style={header}>
          <span className="flex items-center gap-2" style={title}><MdPin size={18} /> Calls app PIN</span>
          <span style={{ ...muted, fontWeight: 700, color: settings?.pin_set ? '#047857' : '#DC2626' }}>
            {settings == null ? '' : settings.pin_set ? 'PIN is set' : 'No PIN yet — phones cannot join'}
          </span>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ ...muted, marginBottom: 10 }}>
            Employees enter this PIN in the DGCRM Calls app, then pick their name. It is asked again to switch
            employee. Only a scrambled copy is stored, so a forgotten PIN cannot be shown, only replaced.
          </div>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="4–8 digits"
              style={{ ...getFormInputStyle(t), width: 160 }} />
            <button type="button" className="master-btn-primary" onClick={savePin} disabled={pin.length < 4}>
              {settings?.pin_set ? 'Change PIN' : 'Set PIN'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Phones ──────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={header}>
          <span className="flex items-center gap-2" style={title}><MdPhoneAndroid size={18} /> Phones</span>
          <button type="button" onClick={load} disabled={loading} className="master-btn-icon" style={{ ...iconBtn, color: t.textPrimary }} title="Refresh">
            <MdRefresh size={16} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={head}>Phone</th>
                <th style={head}>Status</th>
                <th style={head}>Last seen</th>
                <th style={head}>Calls</th>
                <th style={head} />
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 && (
                <tr><td colSpan={5} style={{ ...cell, textAlign: 'center', color: t.textSecondary }}>
                  {loading ? 'Loading...' : 'No phones yet. A phone appears here after someone enters the PIN in the DGCRM Calls app.'}
                </td></tr>
              )}
              {devices.map((d) => (
                <tr key={d.id}>
                  <td style={cell}>
                    <div style={{ fontWeight: 600 }}>{d.label || 'Unknown phone'}</div>
                    <div style={{ fontSize: 10.5, color: t.textSecondary }}>App {d.app_version || '—'} · added {formatLastLogin(d.created_at)}</div>
                  </td>
                  <td style={cell}>
                    <span style={{ color: STATUS[d.status].color, fontWeight: 600 }}>{STATUS[d.status].label}</span>
                    {d.status === 'approved' && d.paused_until && (
                      <div className="flex items-center gap-1" style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}
                        title={d.paused_at ? `Paused since ${formatLastLogin(d.paused_at)}` : undefined}>
                        <MdPauseCircle size={13} /> {pausedText(d.paused_until)}
                      </div>
                    )}
                  </td>
                  <td style={cell}>{formatLastLogin(d.last_seen_at)}</td>
                  <td style={cell}>{d.call_count}</td>
                  <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {d.status === 'pending' && (
                      <button type="button" onClick={() => approve(d)} className="master-btn-icon" style={{ ...iconBtn, color: '#047857', marginRight: 6 }} title="Approve phone">
                        <MdCheckCircle size={16} />
                      </button>
                    )}
                    {d.status !== 'blocked' && (
                      <button type="button" onClick={() => block(d)} className="master-btn-icon" style={{ ...iconBtn, color: '#DC2626' }} title="Block phone">
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

      {/* ── WhatsApp after a call ───────────────────────────────────── */}
      <div style={card}>
        <div style={header}><span className="flex items-center gap-2" style={title}><MdChat size={18} /> WhatsApp brochure message</span></div>
        <div style={{ padding: 16 }}>
          <div style={{ ...muted, marginBottom: 12 }}>
            After a call, the employee can tap WhatsApp in the app to send this message to the lead. Use {'{name}'}, {'{employee}'},
            {' {project}'} and {'{brochure}'}; the lead's project message is used, or the default when the project has none.
          </div>
          <label style={{ display: 'block', fontSize: 12, color: t.textSecondary, marginBottom: 4 }}>Default message (max 255 characters)</label>
          <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
            <input value={waDefault} maxLength={255} onChange={(e) => setWaDefault(e.target.value)} style={{ ...getFormInputStyle(t), flex: 1, minWidth: 260 }}
              placeholder="Hello {name}, thank you for speaking with {employee} from Dream Group. Here is the project brochure: {brochure}" />
            <button type="button" className="master-btn-primary" onClick={saveWaDefault}>Save</button>
          </div>
          {waProjects.length === 0 && <div style={muted}>No projects yet.</div>}
          {waProjects.map((p) => (
            <div key={p.id} style={{ borderTop: `1px solid ${t.surfaceBorder}`, padding: '10px 0' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: t.textPrimary, marginBottom: 6 }}>{p.project_name}</div>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <input value={p.brochure_url ?? ''} maxLength={500} placeholder="Brochure link (https://...)"
                  onChange={(e) => setWaField(p.id, 'brochure_url', e.target.value)} style={{ ...getFormInputStyle(t), flex: '1 1 240px' }} />
                <input value={p.whatsapp_message ?? ''} maxLength={1000} placeholder="Message (blank = default)"
                  onChange={(e) => setWaField(p.id, 'whatsapp_message', e.target.value)} style={{ ...getFormInputStyle(t), flex: '2 1 320px' }} />
                <button type="button" className="master-btn-primary" onClick={() => saveWaProject(p)}>Save</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Retention ───────────────────────────────────────────────── */}
      <div style={card}>
        <div style={header}><span className="flex items-center gap-2" style={title}><MdHistory size={18} /> Keeping call history small</span></div>
        <div style={{ padding: 16 }}>
          <div style={{ ...muted, marginBottom: 12 }}>
            A daily clean-up moves old calls to an archive table, deletes very old archived calls, and removes old
            recording files from the upload folder.
          </div>
          <div className="flex items-end gap-4" style={{ flexWrap: 'wrap' }}>
            {numberInput('archive_after_months', 'Archive calls older than', 'months', 1, 120)}
            {numberInput('delete_after_years', 'Delete archived calls after', 'years', 1, 20)}
            {numberInput('recording_days', 'Delete recordings after', 'days', 7, 3650)}
            <button type="button" className="master-btn-primary" onClick={saveRetention}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallDevicesPage;
