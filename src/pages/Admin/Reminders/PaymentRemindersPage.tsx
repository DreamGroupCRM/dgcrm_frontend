// ==========================================
// DGCRM — PAYMENT REMINDERS (Admin)
// ==========================================
// V_26.0 — automatic payment reminders to customers: before a due date, on
// it, and while overdue. Email is live (switched on here); WhatsApp is
// built but "Upcoming" until the server has its key and approved templates.
// The server sends once a day; "Send now" runs the same thing at once and
// never repeats a reminder already sent.
import React, { useCallback, useEffect, useState } from 'react';
import { MdEmail, MdNotificationsActive, MdRefresh, MdSend, MdSchedule } from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from '@/utils/toast';
import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { AppTheme } from '../../../styles/theme';
import { ReceiptEmailSwitch } from '../../../components/common/ReceiptEmailSwitch';
import { showAlert, formatLastLogin } from '../../../utils';
import {
  fetchReminderSettings, saveReminderSettings, fetchReminderPreview, runRemindersNow, fetchReminderLog,
  ReminderSettings, ReminderRules, PlannedReminder, ReminderLogRow,
} from '../../../services/remindersService';

interface ErrLike { response?: { data?: { message?: string } } }
const errMessage = (e: unknown, fallback: string) => (e as ErrLike)?.response?.data?.message || fallback;
const rupee = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const dmy = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;
const KIND_LABEL = { before: 'Before due date', due: 'On due date', overdue: 'Overdue' } as const;

const Pill: React.FC<{ bg: string; fg: string; children: React.ReactNode }> = ({ bg, fg, children }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold" style={{ background: bg, color: fg, fontSize: 10.5, whiteSpace: 'nowrap' }}>{children}</span>
);

const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  sent: { bg: '#dcfce7', fg: '#15803d', label: 'Sent' },
  send: { bg: '#dbeafe', fg: '#1d4ed8', label: 'Will send' },
  failed: { bg: '#fee2e2', fg: '#b91c1c', label: 'Failed' },
  skipped: { bg: '#f1f5f9', fg: '#475569', label: 'Skipped' },
  upcoming: { bg: '#fef3c7', fg: '#b45309', label: 'Upcoming' },
};

const Switch: React.FC<{ on: boolean; disabled?: boolean; onClick: () => void; label: string }> = ({ on, disabled, onClick, label }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} disabled={disabled}
    style={{ background: 'none', border: 'none', padding: 0, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
    <span aria-hidden className="relative inline-block rounded-full" style={{ width: 38, height: 22, background: on ? '#15803d' : '#94a3b8', transition: 'background 150ms' }}>
      <span className="absolute rounded-full" style={{ top: 3, left: on ? 19 : 3, width: 16, height: 16, background: '#fff', transition: 'left 150ms' }} />
    </span>
  </button>
);

const Card: React.FC<{ t: AppTheme; title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }> = ({ t, title, right, children }) => (
  <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
    <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3" style={{ borderBottom: `1px solid ${t.divider}` }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: t.textPrimary }}>{title}</div>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const PaymentRemindersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, cssVars } = useAppearanceTokens();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [rules, setRules] = useState<ReminderRules | null>(null);
  const [preview, setPreview] = useState<PlannedReminder[] | null>(null);
  const [log, setLog] = useState<ReminderLogRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { dispatch(setPageTitle('Payment Reminders')); }, [dispatch]);

  const loadLists = useCallback(async () => {
    const [p, l] = await Promise.all([fetchReminderPreview().catch(() => []), fetchReminderLog(50).catch(() => [])]);
    setPreview(p); setLog(l);
  }, []);

  useEffect(() => {
    fetchReminderSettings().then((s) => { setSettings(s); setRules(s.rules); }).catch((e) => toast.error(errMessage(e, 'Failed to load reminder settings.')));
    void loadLists();
  }, [loadLists]);

  const save = async (input: Parameters<typeof saveReminderSettings>[0], done: string) => {
    setBusy(true);
    try {
      const s = await saveReminderSettings(input);
      setSettings(s); setRules(s.rules);
      toast.success(done);
      await loadLists();
    } catch (e) {
      toast.error(errMessage(e, 'Could not save the reminder settings.'));
    } finally { setBusy(false); }
  };

  const toggleEmail = async () => {
    if (!settings) return;
    const next = !settings.email.on;
    if (next) {
      const r = await showAlert.confirm('Customers will get payment reminder emails from today: before a due date, on it, and while overdue, as set below.', 'Turn on email reminders?');
      if (!r.isConfirmed) return;
    }
    await save({ email_on: next }, next ? 'Email reminders are on.' : 'Email reminders are off.');
  };

  const sendNow = async () => {
    const count = (preview ?? []).filter((p) => p.outcome === 'send').length;
    const r = await showAlert.confirm(
      count ? `Send today's reminders now to ${count} customer${count === 1 ? '' : 's'}? A reminder already sent is never sent again.` : 'Nothing is waiting to be sent today. Check again anyway?',
      'Send reminders now?');
    if (!r.isConfirmed) return;
    setBusy(true);
    try {
      const s = await runRemindersNow();
      toast.success(`${s.sent} sent${s.failed ? `, ${s.failed} failed` : ''}${s.skipped ? `, ${s.skipped} skipped` : ''}.`);
      await loadLists();
    } catch (e) {
      toast.error(errMessage(e, 'Could not send the reminders.'));
    } finally { setBusy(false); }
  };

  const label: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: t.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 };
  const select: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 12.5, borderRadius: 10, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.inputText };
  const th: React.CSSProperties = { padding: '9px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '9px 12px', fontSize: 11.5, color: t.textPrimary, borderTop: `1px solid ${t.divider}`, verticalAlign: 'top' };
  const rulesChanged = settings && rules && JSON.stringify(settings.rules) !== JSON.stringify(rules);

  if (!settings || !rules) return <div style={{ padding: 24, color: t.textSecondary, fontSize: 13 }}>Loading…</div>;
  const wa = settings.whatsapp;

  return (
    <div style={{ fontFamily: t.fontFamily, display: 'flex', flexDirection: 'column', gap: 16, ...cssVars }}>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center rounded-xl" style={{ width: 34, height: 34, background: 'var(--grad-table-header)', color: '#fff' }}>
          <MdNotificationsActive size={19} />
        </div>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Payment Reminders</h1>
          <div style={{ fontSize: 11.5, color: t.textSecondary }}>
            Customers are reminded automatically every day at {String(settings.send_hour).padStart(2, '0')}:00
            {settings.last_run ? ` · last run ${dmy(settings.last_run)}` : ''}
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-2xl p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2" style={{ fontWeight: 800, fontSize: 13.5, color: t.textPrimary }}><MdEmail size={18} color="var(--brand-ink)" /> Email</div>
            {settings.email.on ? <Pill bg="#dcfce7" fg="#15803d">● Active</Pill> : <Pill bg="#f1f5f9" fg="#475569">Off</Pill>}
          </div>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '10px 0' }}>
            One email per customer listing what is due, sent to the email on the customer's record.
          </p>
          {!settings.email.configured && (
            <p style={{ fontSize: 11.5, color: '#b45309', margin: '0 0 10px' }}>Email is not set up on the server yet (SMTP), so nothing can be sent.</p>
          )}
          <div className="flex items-center gap-2" style={{ fontSize: 12, color: t.textPrimary, fontWeight: 600 }}>
            <Switch on={settings.email.on} disabled={busy} onClick={toggleEmail} label="Email reminders" /> {settings.email.on ? 'On' : 'Turn on'}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2" style={{ fontWeight: 800, fontSize: 13.5, color: t.textPrimary }}><FaWhatsapp size={17} color="#16a34a" /> WhatsApp</div>
            {!wa.configured ? <Pill bg="#fef3c7" fg="#b45309">Upcoming</Pill> : wa.on ? <Pill bg="#dcfce7" fg="#15803d">● Active</Pill> : <Pill bg="#f1f5f9" fg="#475569">Off</Pill>}
          </div>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '10px 0' }}>
            {wa.configured
              ? `Connected through ${wa.provider}. One WhatsApp message per due, using your approved templates.`
              : `Coming soon. It starts once the WhatsApp (${wa.provider}) key and approved message templates are added on the server — no other change needed.`}
          </p>
          <div className="flex items-center gap-2" style={{ fontSize: 12, color: t.textPrimary, fontWeight: 600 }}>
            <Switch on={wa.on && wa.configured} disabled={busy || !wa.configured}
              onClick={() => save({ whatsapp_on: !wa.on }, !wa.on ? 'WhatsApp reminders are on.' : 'WhatsApp reminders are off.')} label="WhatsApp reminders" />
            {wa.configured ? (wa.on ? 'On' : 'Turn on') : 'Available after setup'}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
          <div className="flex items-center gap-2" style={{ fontWeight: 800, fontSize: 13.5, color: t.textPrimary }}><MdEmail size={18} color="#15803d" /> Payment received</div>
          <p style={{ fontSize: 11.5, color: t.textSecondary, margin: '10px 0' }}>
            When an Admin approves a payment, its receipt (PDF) is emailed to the customer.
          </p>
          <ReceiptEmailSwitch t={t} />
        </div>
      </div>

      {/* When to remind */}
      <Card t={t} title={<span className="flex items-center gap-2"><MdSchedule size={17} /> When to remind</span>}
        right={rulesChanged ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setRules(settings.rules)} disabled={busy} className="rounded-xl"
              style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, background: t.inputBg, color: t.textPrimary, border: `1px solid ${t.inputBorder}`, cursor: 'pointer' }}>Cancel</button>
            <button type="button" onClick={() => save({ rules }, 'Reminder timing saved.')} disabled={busy} className="rounded-xl"
              style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, background: 'var(--brand-gradient)', color: '#fff', border: 'none', cursor: 'pointer' }}>Save</button>
          </div>
        ) : undefined}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label><span style={label}>Before the due date</span>
            <select value={rules.before_days} onChange={(e) => setRules({ ...rules, before_days: Number(e.target.value) })} style={select}>
              <option value={0}>Don't remind</option>
              {[1, 2, 3].map((d) => <option key={d} value={d}>{d} day{d === 1 ? '' : 's'} before</option>)}
            </select>
          </label>
          <label><span style={label}>On the due date</span>
            <select value={rules.on_due ? 'yes' : 'no'} onChange={(e) => setRules({ ...rules, on_due: e.target.value === 'yes' })} style={select}>
              <option value="yes">Remind</option><option value="no">Don't remind</option>
            </select>
          </label>
          <label><span style={label}>First overdue reminder</span>
            <select value={rules.overdue_after} onChange={(e) => setRules({ ...rules, overdue_after: Number(e.target.value) })} style={select}>
              <option value={0}>Don't remind</option>
              {[1, 3, 5, 7, 15].map((d) => <option key={d} value={d}>{d} day{d === 1 ? '' : 's'} after the due date</option>)}
            </select>
          </label>
          <label><span style={label}>While still overdue</span>
            <select value={rules.overdue_repeat} onChange={(e) => setRules({ ...rules, overdue_repeat: Number(e.target.value) })} style={select} disabled={rules.overdue_after === 0}>
              <option value={0}>Only once</option>
              {[3, 7, 15, 30].map((d) => <option key={d} value={d}>Every {d} days</option>)}
            </select>
          </label>
        </div>
        <p style={{ fontSize: 11, color: t.textSecondary, margin: '10px 0 0' }}>
          A customer gets one reminder for all their dues on a day. The same reminder is never sent twice.
        </p>
      </Card>

      {/* Today */}
      <Card t={t} title={`Today's reminders${preview ? ` (${preview.length})` : ''}`}
        right={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void loadLists()} title="Refresh" className="flex items-center justify-center rounded-xl"
              style={{ width: 34, height: 34, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}><MdRefresh size={16} /></button>
            <button type="button" onClick={sendNow} disabled={busy || !(settings.email.on || (wa.on && wa.configured))} className="flex items-center gap-1.5 rounded-xl"
              style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, background: 'var(--brand-gradient)', color: '#fff', border: 'none', cursor: 'pointer', opacity: busy || !(settings.email.on || (wa.on && wa.configured)) ? 0.5 : 1 }}>
              <MdSend size={14} /> Send now
            </button>
          </div>
        }>
        {!settings.email.on && !(wa.on && wa.configured) ? (
          <p style={{ fontSize: 12, color: t.textSecondary, margin: 0 }}>Turn on Email above to see who will be reminded today.</p>
        ) : preview == null ? (
          <p style={{ fontSize: 12, color: t.textSecondary, margin: 0 }}>Loading…</p>
        ) : preview.length === 0 ? (
          <p style={{ fontSize: 12, color: t.textSecondary, margin: 0 }}>No reminders are due today — everyone is up to date, or already reminded.</p>
        ) : (
          <div className="master-table-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead><tr className="master-table-header-gradient">{['Customer', 'Channel', 'To', 'What is due', 'Status'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {preview.map((p) => {
                  const pill = STATUS_PILL[p.outcome];
                  return (
                    <tr key={`${p.channel}-${p.customer_id}`}>
                      <td style={td}><div style={{ fontWeight: 700 }}>{p.customer_name}</div><div style={{ fontSize: 10.5, color: t.textSecondary }}>{[p.customer_code, p.unit].filter(Boolean).join(' · ')}</div></td>
                      <td style={td}>{p.channel === 'email' ? 'Email' : 'WhatsApp'}</td>
                      <td style={{ ...td, wordBreak: 'break-all' }}>{p.recipient || '—'}</td>
                      <td style={td}>{p.items.map((i, n) => (
                        <div key={n}><b>{rupee(i.amount)}</b> · {i.label} · <span style={{ color: i.kind === 'overdue' ? '#b42318' : t.textSecondary }}>{i.when}</span></div>
                      ))}</td>
                      <td style={td}><Pill bg={pill.bg} fg={pill.fg}>{pill.label}</Pill>{p.note && <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 3 }}>{p.note}</div>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Log */}
      <Card t={t} title="Recent reminders">
        {log == null ? <p style={{ fontSize: 12, color: t.textSecondary, margin: 0 }}>Loading…</p>
          : log.length === 0 ? <p style={{ fontSize: 12, color: t.textSecondary, margin: 0 }}>No reminders sent yet.</p>
          : (
            <div className="master-table-scroll" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead><tr className="master-table-header-gradient">{['Date', 'Customer', 'Channel', 'Reminder', 'Due', 'Amount', 'Status'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {log.map((r) => {
                    const pill = STATUS_PILL[r.status] ?? STATUS_PILL.skipped;
                    return (
                      <tr key={r.id}>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatLastLogin(r.sent_at)}</td>
                        <td style={td}><div style={{ fontWeight: 700 }}>{r.customer_name || '—'}</div><div style={{ fontSize: 10.5, color: t.textSecondary }}>{r.customer_code}</div></td>
                        <td style={td}>{r.channel === 'email' ? 'Email' : 'WhatsApp'}</td>
                        <td style={td}>{KIND_LABEL[r.kind] ?? r.kind}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>{dmy(r.due_date)}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{rupee(r.amount)}</td>
                        <td style={td}><Pill bg={pill.bg} fg={pill.fg}>{pill.label}</Pill>{r.detail && <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 3 }}>{r.detail}</div>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  );
};

export default PaymentRemindersPage;
