// ==========================================
// DREAM GROUP CRM - EMPLOYEE DASHBOARD — "MY WORKSPACE" (V_26.0)
// ==========================================
// One page, two looks, so it is always clear whose screen it is:
//  * Head — blue band, My Data / Team Data switch, own + team figures and
//    the team list;
//  * Executive — purple band, "Reports to", own figures only.
// Tiles and quick actions follow the employee's department pages (areas);
// Attendance, My Tasks and My Requests are everyone's. Every figure comes
// from GET /api/dashboard/employee-stats, scoped server-side (a Head's team
// figures honour the My Data switch via X-Data-Scope).
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from '@/utils/toast';
import { MdAdd, MdEventAvailable, MdPayment, MdLeaderboard, MdPersonAdd } from 'react-icons/md';
import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { fetchEmployeeDashboardSummary, EmployeeDashboardSummary } from '../../../services/dashboardService';
import { useAccessProfile } from '../../../hooks/useAccessProfile';
import { DataScope, setDataScope } from '../../../utils/dataScope';
import { ROUTES } from '../../../constants';
import { formatDate } from '../../../utils';
import { serverToday } from '../../../utils/serverTime';
import {
  BAND, IdentityBand, plural, KpiTile, Panel, Avatar, Empty, StatusPill, QuickAction, rupeeCompact,
} from '../../../components/dashboard/DashboardParts';
import './EmployeeDashboard.css';

const MODULE_LABEL: Record<string, string> = { customer: 'Customer', lead: 'Lead', employee: 'Employee', payment: 'Payment' };
const ACTION_LABEL: Record<string, string> = { create: 'add', edit: 'edit', cancel_booking: 'cancel booking', delete: 'delete', reassign: 'reassign' };

const EmployeeDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, isDark } = useAppearanceTokens();
  const { has, profile } = useAccessProfile();

  const [data, setData] = useState<EmployeeDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<DataScope>('team');

  useEffect(() => { dispatch(setPageTitle('Dashboard')); }, [dispatch]);
  // The My Data / Team Data choice applies to this page only.
  useEffect(() => () => setDataScope('team'), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchEmployeeDashboardSummary());
      setError(null);
    } catch (e) {
      // Show what actually went wrong (the server's message), not a guess.
      const msg = (e as { response?: { status?: number; data?: { message?: string } } })?.response;
      setError(msg?.data?.message || 'Your dashboard could not be loaded. Please refresh, or try again in a moment.');
      toast.error('Failed to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ws = data?.workspace;
  const isHead = ws?.is_head ?? Boolean(profile && profile.head_of.length > 0);
  const kind = isHead ? 'head' : 'executive';
  const band = BAND[kind];
  const primary = ws?.departments.find((d) => d.level === 'head') ?? ws?.departments[0];
  const reportsTo = ws?.departments.find((d) => d.reports_to)?.reports_to ?? null;
  const fig = data?.figures;
  const today = serverToday().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const switchScope = (next: DataScope) => {
    if (next === scope) return;
    setDataScope(next);
    setScope(next);
    load();
  };

  const chips = [
    primary?.designation ?? (isHead ? 'Head' : 'Executive'),
    ...(ws?.departments.map((d) => `${d.name} department`) ?? []),
    ...(isHead ? [`${ws?.employee_code ? `${ws.employee_code} · ` : ''}Team of ${ws?.team_size ?? 0}`] : reportsTo ? [`Reports to ${reportsTo}`] : []),
  ];

  const customersArea = has('customers') || has('payment_dues') || has('payment_received');
  const own = !isHead || scope === 'mine';
  const kpis = [
    ...(customersArea ? [
      { label: own ? 'My customers' : 'Customers (me + team)', value: String(fig?.customers ?? data?.my_customers ?? 0), to: ROUTES.EMPLOYEE.CUSTOMER_DETAILS },
      { label: 'Due now', value: rupeeCompact(fig?.due_now ?? 0), note: fig ? plural(fig.due_customers, 'customer') : undefined, noteColor: isDark ? '#fca5a5' : '#b42318', to: ROUTES.EMPLOYEE.PAYMENT_DUES },
      { label: 'Collected this month', value: rupeeCompact(fig?.collected_this_month ?? 0), note: fig ? `${plural(fig.collected_count, 'approved receipt')}` : undefined, noteColor: isDark ? '#86efac' : '#166534', to: ROUTES.EMPLOYEE.PAYMENT_RECEIVED },
      { label: 'Waiting for approval', value: rupeeCompact(fig?.awaiting_approval ?? 0), note: fig ? plural(fig.awaiting_approval_count, 'payment') : undefined, noteColor: isDark ? '#fcd34d' : '#92400e', to: ROUTES.EMPLOYEE.PAYMENT_RECEIVED },
    ] : []),
    ...(has('leads') ? [{ label: own ? 'My leads' : 'Leads (me + team)', value: String(fig?.leads ?? data?.my_leads ?? 0), to: ROUTES.EMPLOYEE.LEADS }] : []),
    { label: 'My tasks open', value: String(data?.open_tasks_count ?? 0), to: ROUTES.EMPLOYEE.TASKS },
    { label: 'Requests waiting', value: String(data?.requests_pending ?? 0), to: ROUTES.EMPLOYEE.MY_REQUESTS },
  ];

  const tintBg = isDark ? t.insetBg : (isHead ? '#e8efff' : '#f1ebff');
  const actions = [
    ...(has('payment_dues') ? [{ label: 'Record payment', to: ROUTES.EMPLOYEE.PAYMENT_DUES, icon: <MdPayment size={17} /> }] : []),
    ...(has('payment_dues') ? [{ label: 'Add follow-up', to: ROUTES.EMPLOYEE.PAYMENT_DUES, icon: <MdAdd size={17} /> }] : []),
    ...(has('leads') ? [{ label: 'Add lead', to: `${ROUTES.EMPLOYEE.LEADS}/add`, icon: <MdLeaderboard size={17} /> }] : []),
    { label: 'Mark attendance', to: ROUTES.EMPLOYEE.ATTENDANCE, icon: <MdEventAvailable size={17} /> },
    ...(profile?.can_add_customer ? [{ label: 'Add customer', to: `${ROUTES.EMPLOYEE.CUSTOMER_DETAILS}/add`, icon: <MdPersonAdd size={17} /> }] : []),
  ];
  const rowBg = isDark ? t.insetBg : (isHead ? '#f8faff' : '#faf8ff');

  return (
    <div className="emp-dash-page" style={{ fontFamily: t.fontFamily, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <IdentityBand
        kind={kind}
        eyebrow={`MY WORKSPACE · ${isHead ? 'HEAD' : 'EXECUTIVE'}`}
        title={ws?.name || data?.employee?.name || 'My Workspace'}
        leading={<Avatar name={ws?.name || data?.employee?.name || ''} photo={ws?.photo_url} size={56} bg="#ffffff" fg={band.strong} />}
        chips={ws ? chips : undefined}
        right={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {isHead ? (
              <div role="radiogroup" aria-label="Show data" style={{ display: 'flex', gap: 6, background: band.chip, padding: 4, borderRadius: 14 }}>
                {([['mine', 'My Data'], ['team', 'Team Data']] as const).map(([key, label]) => (
                  <button key={key} type="button" role="radio" aria-checked={scope === key} onClick={() => switchScope(key)}
                    style={{ fontFamily: 'inherit', border: 'none', background: scope === key ? '#ffffff' : 'transparent', color: scope === key ? band.strong : '#ffffff', fontWeight: 700, fontSize: 12.5, padding: '9px 14px', borderRadius: 10, minHeight: 40, cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>Only my own customers</span>
            )}
            <span style={{ fontSize: 12, color: band.sub }}>{today}</span>
          </div>
        }
      />

      {error && (
        <div role="alert" className="rounded-xl px-4 py-3" style={{ background: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2', color: isDark ? '#fca5a5' : '#b91c1c', fontSize: 12.5, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button type="button" onClick={load} style={{ fontFamily: 'inherit', border: '1px solid currentColor', background: 'transparent', color: 'inherit', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>Try again</button>
        </div>
      )}

      <section aria-label="My numbers" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {kpis.map((k) => <KpiTile key={k.label} t={t} loading={loading} {...k} />)}
      </section>

      <section aria-label="Quick actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {actions.map((a) => <QuickAction key={a.label} t={t} label={a.label} to={a.to} icon={a.icon} tint={band.strong} tintBg={tintBg} />)}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
        {customersArea ? (
          <Panel t={t} title={isHead && scope === 'team' ? "Today's follow-ups (me + team)" : 'My follow-ups due'} action={{ label: 'Payment Dues', to: ROUTES.EMPLOYEE.PAYMENT_DUES }}>
            {!loading && !data?.followups?.length && <Empty t={t}>No follow-ups due today.</Empty>}
            {(data?.followups ?? []).map((f) => (
              <div key={f.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', borderRadius: 12, background: rowBg }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>{f.customer_name}{f.customer_code ? ` · ${f.customer_code}` : ''}</span>
                <span style={{ fontSize: 11.5, color: t.textSecondary }}>{f.title}{f.due_date ? ` · due ${formatDate(f.due_date)}` : ''}</span>
              </div>
            ))}
          </Panel>
        ) : (
          <Panel t={t} title="My attendance — this month" action={{ label: 'Attendance', to: ROUTES.EMPLOYEE.ATTENDANCE }}>
            <AttendanceFigures t={t} data={data} />
          </Panel>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <Panel t={t} title="My Tasks" action={{ label: 'All tasks', to: ROUTES.EMPLOYEE.TASKS }}>
            {!loading && !data?.open_tasks?.length && <Empty t={t}>No open tasks.</Empty>}
            {(data?.open_tasks ?? []).map((task) => (
              <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '8px 0', borderTop: `1px solid ${t.divider}`, color: t.textPrimary }}>
                <span>{task.title}{task.due_date ? <span style={{ color: t.textSecondary }}> · due {formatDate(task.due_date)}</span> : null}</span>
                <StatusPill status={task.status} />
              </div>
            ))}
          </Panel>
          <Panel t={t} title="My Requests" action={{ label: 'All requests', to: ROUTES.EMPLOYEE.MY_REQUESTS }}>
            {!loading && !data?.requests?.length && <Empty t={t}>You have not sent any requests.</Empty>}
            {(data?.requests ?? []).map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '8px 0', borderTop: `1px solid ${t.divider}`, color: t.textPrimary }}>
                <span>{MODULE_LABEL[r.module] ?? r.module} {ACTION_LABEL[r.action] ?? r.action}{r.name ? ` — ${r.name}` : ''}</span>
                <StatusPill status={r.status} />
              </div>
            ))}
          </Panel>
          {customersArea && (
            <Panel t={t} title="My attendance — this month" action={{ label: 'Attendance', to: ROUTES.EMPLOYEE.ATTENDANCE }}>
              <AttendanceFigures t={t} data={data} />
            </Panel>
          )}
        </div>
      </div>

      {isHead && scope === 'team' && (
        <Panel t={t} title={<>My team <span style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary }}>(Team Data)</span></>}>
          {!loading && !data?.team?.length && <Empty t={t}>Nobody reports to you yet.</Empty>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {(data?.team ?? []).map((p) => (
              <div key={p.id} style={{ border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <Avatar name={p.name} photo={p.photo_url} size={38} bg={band.strong} />
                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ fontSize: 11.5, color: t.textSecondary }}>{p.designation ?? 'Executive'} · {plural(p.customers, 'customer')}</span>
                </div>
                {customersArea && <span style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>{rupeeCompact(p.collected)}</span>}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
};

const AttendanceFigures: React.FC<{ t: ReturnType<typeof useAppearanceTokens>['t']; data: EmployeeDashboardSummary | null }> = ({ t, data }) => {
  const att = data?.attendance;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
      {[
        ['Present', att ? String(att.present_days) : '—'],
        ['Marked days', att ? String(att.marked_days) : '—'],
        ['Leaves approved', data?.leave_this_month != null ? String(data.leave_this_month) : '—'],
      ].map(([label, value]) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11.5, color: t.textSecondary }}>{label}</span>
          <span style={{ fontSize: 19, fontWeight: 800, color: t.textPrimary }}>{value}</span>
        </div>
      ))}
    </div>
  );
};

export default EmployeeDashboard;
