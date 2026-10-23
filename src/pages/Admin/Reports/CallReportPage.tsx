// ==========================================
// DREAM GROUP CRM - CALL REPORT
// ==========================================
// V_27.0 — per-employee calls from the DGCRM Calls app: calls, answered
// incoming, outgoing, missed, talk time, new leads and missed calls not
// yet called back, plus a day-by-day breakdown. Admins see everyone, a
// Sales Head their team, other employees only themselves (enforced by the
// backend, GET /api/call-sync/report).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/utils/toast';
import { MdCall, MdRefresh } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { getAccordionCardStyle, getAccordionHeaderStyle, getFormInputStyle } from '../../../components/common/MasterListUI';
import { formatDate } from '../../../utils';
import { serverTodayYmd } from '../../../utils/serverTime';
import { CallReport, fetchCallReport } from '../../../services/callService';
import { formatTalkTime } from '../../../components/calls/CallHistoryCard';

interface ErrLike { response?: { data?: { message?: string; errors?: { message?: string }[] } } }
const errMessage = (e: unknown, fallback: string) =>
  (e as ErrLike)?.response?.data?.errors?.[0]?.message || (e as ErrLike)?.response?.data?.message || fallback;

const ymdMinusDays = (ymd: string, days: number): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d - days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const CallReportPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t } = useAppearanceTokens();
  const today = serverTodayYmd();
  const [from, setFrom] = useState(ymdMinusDays(today, 6));
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<CallReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { dispatch(setPageTitle('Call Report')); }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await fetchCallReport(from, to));
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load the call report.'));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => (report?.employees ?? []).reduce(
    (a, e) => ({ calls: a.calls + e.calls, talk: a.talk + e.talk_sec, leads: a.leads + e.new_leads, open: a.open + e.missed_not_called_back }),
    { calls: 0, talk: 0, leads: 0, open: 0 },
  ), [report]);

  const cell: React.CSSProperties = { padding: '8px 12px', fontSize: 12.5, color: t.textPrimary, borderTop: `1px solid ${t.surfaceBorder}`, whiteSpace: 'nowrap' };
  const head: React.CSSProperties = { ...cell, fontWeight: 700, color: t.textSecondary, borderTop: 'none', textAlign: 'left' };
  const num: React.CSSProperties = { ...cell, textAlign: 'right' };
  const numHead: React.CSSProperties = { ...head, textAlign: 'right' };
  const tile = (label: string, value: string, color: string) => (
    <div style={{ ...getAccordionCardStyle(t), marginBottom: 0, padding: 14, flex: '1 1 160px' }}>
      <div style={{ fontSize: 12, color: t.textSecondary }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <div className="flex items-end gap-3" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: t.textSecondary }}>From<br />
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={getFormInputStyle(t)} />
        </label>
        <label style={{ fontSize: 12, color: t.textSecondary }}>To<br />
          <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} style={getFormInputStyle(t)} />
        </label>
        <button type="button" className="master-btn-icon" onClick={load} disabled={loading} title="Refresh"
          style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}><MdRefresh size={16} /></button>
        <span style={{ fontSize: 12, color: t.textSecondary }}>Up to 3 months. Calls synced by the DGCRM Calls app.</span>
      </div>

      <div className="flex gap-3" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
        {tile('Calls', String(totals.calls), '#4F46E5')}
        {tile('Talk time', formatTalkTime(totals.talk), '#047857')}
        {tile('New leads', String(totals.leads), '#B45309')}
        {tile('Missed, not called back', String(totals.open), '#DC2626')}
      </div>

      <div style={getAccordionCardStyle(t)}>
        <div style={getAccordionHeaderStyle(t, true)}>
          <span className="flex items-center gap-2" style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}><MdCall size={18} /> By employee</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={head}>Employee</th><th style={numHead}>Calls</th><th style={numHead}>Answered in</th>
                <th style={numHead}>Outgoing</th><th style={numHead}>Missed</th><th style={numHead}>Talk time</th>
                <th style={numHead}>New leads</th><th style={numHead}>Missed, not called back</th>
              </tr>
            </thead>
            <tbody>
              {(report?.employees ?? []).length === 0 && (
                <tr><td colSpan={8} style={{ ...cell, textAlign: 'center', color: t.textSecondary }}>{loading ? 'Loading...' : 'No calls in this period.'}</td></tr>
              )}
              {(report?.employees ?? []).map((e) => (
                <tr key={e.employee_id}>
                  <td style={{ ...cell, fontWeight: 600 }}>{e.employee_name}</td>
                  <td style={num}>{e.calls}</td><td style={num}>{e.incoming}</td><td style={num}>{e.outgoing}</td>
                  <td style={num}>{e.missed}</td><td style={num}>{formatTalkTime(e.talk_sec)}</td><td style={num}>{e.new_leads}</td>
                  <td style={{ ...num, color: e.missed_not_called_back ? '#DC2626' : t.textPrimary, fontWeight: e.missed_not_called_back ? 700 : 400 }}>
                    {e.missed_not_called_back}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={getAccordionCardStyle(t)}>
        <div style={getAccordionHeaderStyle(t, true)}>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Day by day</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={head}>Date</th><th style={head}>Employee</th><th style={numHead}>Calls</th><th style={numHead}>Answered in</th>
                <th style={numHead}>Outgoing</th><th style={numHead}>Missed</th><th style={numHead}>Talk time</th><th style={numHead}>New leads</th>
              </tr>
            </thead>
            <tbody>
              {(report?.days ?? []).map((d) => (
                <tr key={`${d.day}-${d.employee_id}`}>
                  <td style={cell}>{formatDate(d.day)}</td><td style={cell}>{d.employee_name}</td>
                  <td style={num}>{d.calls}</td><td style={num}>{d.incoming}</td><td style={num}>{d.outgoing}</td>
                  <td style={num}>{d.missed}</td><td style={num}>{formatTalkTime(d.talk_sec)}</td><td style={num}>{d.new_leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CallReportPage;
