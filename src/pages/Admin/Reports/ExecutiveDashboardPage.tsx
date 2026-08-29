// ==========================================
// DREAM GROUP CRM - EXECUTIVE DASHBOARD (Admin / SuperAdmin)
// ==========================================
// Every number on this page comes from GET /api/dashboard/executive
// (executiveDashboard.service.ts in dgcrm_backend) — nothing here is
// computed client-side beyond formatting. Server-side authorization is the
// real gate (checkPermission('reports','view')); this page's own route/
// sidebar visibility (see AdminRoutes.tsx / Sidebar.tsx) is a convenience,
// not the security boundary.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import {
  MdPeople, MdApartment, MdCheckCircle, MdSell, MdPayments, MdPendingActions,
  MdBadge, MdWarningAmber, MdRefresh, MdPictureAsPdf, MdGridOn, MdTrendingUp,
  MdTrendingDown, MdErrorOutline, MdPersonOff, MdHourglassEmpty, MdHistory,
  MdAdd, MdEdit, MdDelete, MdArrowForward, MdCalendarToday, MdLogin, MdVerifiedUser,
} from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { getTheme } from '../../../styles/theme';
import { getStatGradient } from '../../../components/masters/statGradients';
import StatCard from '../../../components/masters/StatCard';
import { formatDate, formatLastLogin } from '../../../utils';
import {
  fetchExecutiveDashboard, ExecutiveDashboardData, DashboardFiltersQuery,
} from '../../../services/executiveDashboardService';
import { FetchBuildingList } from '../../../services/buildingService';
import { FetchEmployeeDetails } from '../../../services/employeeDetailsService';
import { exportDashboardToPdf, exportDashboardToExcel } from './dashboardExport';
import {
  fetchSalesInsights, fetchPatterns, fetchPriorityQueue,
  SalesInsights, DetectedPattern, PriorityQueueItem,
} from '../../../services/intelligenceService';
import { MdAutoAwesome, MdPersonSearch, MdTrendingFlat, MdInsights } from 'react-icons/md';

type Theme = ReturnType<typeof getTheme>;

const rupee = (n: number): string => `₹ ${Math.round(n).toLocaleString('en-IN')}`;
const rupeeCompact = (n: number): string => {
  const v = Math.round(n);
  if (v >= 10000000) return `₹ ${(v / 10000000).toFixed(1).replace(/\.0$/, '')} Cr`;
  if (v >= 100000) return `₹ ${(v / 100000).toFixed(1).replace(/\.0$/, '')} L`;
  if (v >= 1000) return `₹ ${(v / 1000).toFixed(1).replace(/\.0$/, '')} K`;
  return rupee(v);
};

// ── Date range presets ───────────────────────────────────────────────────
type PresetKey = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';
const PRESET_LABELS: Record<PresetKey, string> = {
  today: 'Today', this_week: 'This Week', this_month: 'This Month', last_month: 'Last Month',
  this_quarter: 'This Quarter', this_year: 'This Year', custom: 'Custom',
};
const iso = (d: Date): string => d.toISOString().slice(0, 10);
function computeRange(preset: PresetKey): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today': return { from: iso(today), to: iso(today) };
    case 'this_week': {
      const day = today.getDay(); // 0=Sun
      const start = new Date(today); start.setDate(today.getDate() - day);
      return { from: iso(start), to: iso(today) };
    }
    case 'this_month':
      return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: iso(start), to: iso(end) };
    }
    case 'this_quarter': {
      const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
      return { from: iso(new Date(today.getFullYear(), qStartMonth, 1)), to: iso(today) };
    }
    case 'this_year':
      return { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today) };
    default:
      return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
  }
}

// ── Delta badge — only rendered when the backend actually returned one;
// null means "not a meaningful comparison", never fabricated as 0%. ──────
const DeltaBadge: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return (
    <span className="inline-flex items-center gap-0.5" style={{ fontSize: 11, fontWeight: 700, color: up ? '#16a34a' : '#dc2626' }}>
      {up ? <MdTrendingUp size={13} /> : <MdTrendingDown size={13} />}
      {up ? '+' : ''}{value}% vs last period
    </span>
  );
};

// ── Chart color palette — reuses the same 7-hex accents statGradients.ts
// already defines, so charts read as one system with the rest of the app. ──
const CHART_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#dc2626', '#0891b2', '#db2777'];

const ACTION_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  create: { label: 'created', color: '#16a34a', icon: MdAdd },
  update: { label: 'updated', color: '#7c3aed', icon: MdEdit },
  delete: { label: 'deleted', color: '#dc2626', icon: MdDelete },
  login_success: { label: 'logged in', color: '#2563eb', icon: MdLogin },
  login_failed: { label: 'failed to log in', color: '#dc2626', icon: MdErrorOutline },
  otp_verified: { label: 'verified OTP', color: '#0891b2', icon: MdVerifiedUser },
};

const SectionCard: React.FC<{ t: Theme; title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }> = ({ t, title, icon: Icon, action, children }) => (
  <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 18, height: '100%' }}>
    <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
      <div className="flex items-center gap-2">
        <Icon size={17} style={{ color: t.hoverText }} />
        <h2 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const EmptyState: React.FC<{ t: Theme; text: string }> = ({ t, text }) => (
  <div className="flex items-center justify-center" style={{ padding: '32px 0', fontSize: 12, color: t.textMuted }}>{text}</div>
);

const Skeleton: React.FC<{ t: Theme; height?: number }> = ({ t, height = 280 }) => (
  <div className="animate-pulse rounded-xl" style={{ height, background: t.insetBg }} />
);

// ── AI Intelligence — small presentational pieces used only by the
// "🤖 DGCRM Intelligence" section below. Deliberately separate from
// SectionCard/StatCard's own styling so this reads as its own product
// surface rather than another generic report panel. ─────────────────────
const TEMPERATURE_META: Record<string, { emoji: string; color: string }> = {
  HOT: { emoji: '🔥', color: '#dc2626' },
  WARM: { emoji: '🟡', color: '#d97706' },
  COLD: { emoji: '🔵', color: '#2563eb' },
};

const InsightTile: React.FC<{ t: Theme; isDark: boolean; emoji: string; label: string; value: string }> = ({ t, isDark, emoji, label, value }) => (
  <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${t.surfaceBorder}` }}>
    <div style={{ fontSize: 18, marginBottom: 4 }}>{emoji}</div>
    <div style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary }}>{value}</div>
    <div style={{ fontSize: 10.5, color: t.textSecondary }}>{label}</div>
  </div>
);

const PatternCard: React.FC<{ t: Theme; isDark: boolean; pattern: DetectedPattern }> = ({ t, isDark, pattern }) => {
  const isWarning = pattern.severity === 'warning';
  const color = isWarning ? '#dc2626' : '#2563eb';
  return (
    <div className="rounded-xl p-3" style={{ background: isDark ? `${color}1a` : `${color}0d`, border: `1px solid ${color}33` }}>
      <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 3 }}>
        <MdInsights size={14} /> {pattern.title}
      </div>
      <div style={{ fontSize: 11.5, color: t.textPrimary, marginBottom: 4 }}>{pattern.detail}</div>
      <div style={{ fontSize: 11, color: t.textSecondary, fontStyle: 'italic' }}>Recommendation: {pattern.recommendation}</div>
    </div>
  );
};

const PriorityRow: React.FC<{ t: Theme; rank: number; item: PriorityQueueItem }> = ({ t, rank, item }) => {
  const meta = TEMPERATURE_META[item.temperature] ?? TEMPERATURE_META.COLD;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: t.insetBg, marginBottom: 6 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: t.textMuted, width: 18, flexShrink: 0 }}>{rank}.</span>
      <span style={{ fontSize: 15, flexShrink: 0 }}>{meta.emoji}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>
          {item.name} <span style={{ fontWeight: 600, color: meta.color }}>· Score {item.score}</span>
        </div>
        <div style={{ fontSize: 11, color: t.textSecondary }}>{item.action}{item.is_overdue ? ' (overdue)' : ''} — {item.reason}</div>
      </div>
      {item.assigned_to && <span style={{ fontSize: 10.5, color: t.textMuted, flexShrink: 0, whiteSpace: 'nowrap' }}>{item.assigned_to}</span>}
    </div>
  );
};

interface FilterOption { id: string; label: string }

const ExecutiveDashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);

  useEffect(() => { dispatch(setPageTitle('Executive Dashboard')); }, [dispatch]);

  const [preset, setPreset] = useState<PresetKey>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [buildingId, setBuildingId] = useState('');

  const [employees, setEmployees] = useState<FilterOption[]>([]);
  const [buildings, setBuildings] = useState<FilterOption[]>([]);

  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await FetchEmployeeDetails(1, 1000, undefined, true);
        if (res.success) setEmployees(res.rows.map((e) => ({ id: e.id, label: `${e.first_name} ${e.last_name || ''}`.trim() })));
      } catch { /* filter just stays empty */ }
    })();
    (async () => {
      try {
        const res = await FetchBuildingList(1, 1000);
        if (res.success) setBuildings(res.rows.map((b) => ({ id: b.id, label: b.building_name })));
      } catch { /* filter just stays empty */ }
    })();
  }, []);

  const range = useMemo(() => (preset === 'custom' ? { from: customFrom, to: customTo } : computeRange(preset)), [preset, customFrom, customTo]);

  const loadDashboard = React.useCallback(async () => {
    if (preset === 'custom' && (!customFrom || !customTo)) return;
    setLoading(true);
    setError(null);
    try {
      const filters: DashboardFiltersQuery = {
        from: range.from, to: range.to,
        employee_id: employeeId || undefined, building_id: buildingId || undefined,
      };
      const res = await fetchExecutiveDashboard(filters);
      setData(res);
    } catch {
      setError('Failed to load the dashboard. Please try again.');
      toast.error('Failed to load the Executive Dashboard.');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, employeeId, buildingId, preset, customFrom, customTo]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ── AI Intelligence — independent of the date-range/employee/building
  // filters above (these are always "as of right now" snapshots, not a
  // period report), and independently loaded/erred so a failure here never
  // blocks or breaks the rest of the dashboard above. ───────────────────
  const [aiInsights, setAiInsights] = useState<SalesInsights | null>(null);
  const [aiPatterns, setAiPatterns] = useState<DetectedPattern[]>([]);
  const [aiPriorityQueue, setAiPriorityQueue] = useState<PriorityQueueItem[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    (async () => {
      setAiLoading(true);
      setAiError(false);
      try {
        const [insightsRes, patternsRes, queueRes] = await Promise.all([
          fetchSalesInsights(), fetchPatterns(), fetchPriorityQueue(10),
        ]);
        setAiInsights(insightsRes);
        setAiPatterns(patternsRes);
        setAiPriorityQueue(queueRes);
      } catch {
        setAiError(true);
      } finally {
        setAiLoading(false);
      }
    })();
  }, []);

  const selectStyle: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText,
    borderRadius: 9, padding: '7px 10px', fontSize: 12, outline: 'none',
  };

  const kpis = data?.kpis;
  const deltas = data?.kpi_deltas;

  const handleExportPdf = () => {
    if (!data) return;
    exportDashboardToPdf(data, { from: range.from, to: range.to });
  };
  const handleExportExcel = () => {
    if (!data) return;
    exportDashboardToExcel(data, { from: range.from, to: range.to });
  };

  return (
    <div style={{ fontFamily: t.fontFamily }} ref={exportRef}>
      {/* ── Header + export actions ─────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Executive Dashboard</h1>
          <p style={{ fontSize: 12, color: t.textSecondary, margin: '3px 0 0' }}>
            {data ? `${formatDate(range.from)} – ${formatDate(range.to)}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={loadDashboard} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: `1px solid ${t.surfaceBorder}`, cursor: loading ? 'default' : 'pointer' }}>
            <MdRefresh size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" onClick={handleExportPdf} disabled={!data}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: `1px solid ${t.surfaceBorder}`, cursor: data ? 'pointer' : 'not-allowed', opacity: data ? 1 : 0.5 }}>
            <MdPictureAsPdf size={15} /> PDF
          </button>
          <button type="button" onClick={handleExportExcel} disabled={!data}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: `1px solid ${t.surfaceBorder}`, cursor: data ? 'pointer' : 'not-allowed', opacity: data ? 1 : 0.5 }}>
            <MdGridOn size={15} /> Excel
          </button>
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap" style={{ marginRight: 8 }}>
            <MdCalendarToday size={14} style={{ color: t.textMuted }} />
            {(Object.keys(PRESET_LABELS) as PresetKey[]).map((k) => (
              <button key={k} type="button" onClick={() => setPreset(k)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: preset === k ? '#2563eb' : t.insetBg,
                  color: preset === k ? '#fff' : t.textSecondary,
                  border: `1px solid ${preset === k ? '#2563eb' : t.surfaceBorder}`, cursor: 'pointer',
                }}>
                {PRESET_LABELS[k]}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={selectStyle} />
              <span style={{ color: t.textMuted, fontSize: 12 }}>to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={selectStyle} />
            </>
          )}
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={selectStyle}>
            <option value="">All Employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} style={selectStyle}>
            <option value="">All Projects/Properties</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: isDark ? 'rgba(220,38,38,0.12)' : '#fef2f2', color: '#b91c1c', fontSize: 12.5, marginBottom: 16 }}>
          <MdErrorOutline size={16} /> {error}
        </div>
      )}

      {/* ── KPI cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginBottom: 18 }}>
        <StatCard label="Total Customers" value={loading ? '—' : kpis!.total_customers} icon={MdPeople} color="#2563eb" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Total Properties" value={loading ? '—' : kpis!.total_properties} icon={MdApartment} color="#7c3aed" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Available Properties" value={loading ? '—' : kpis!.available_properties} icon={MdCheckCircle} color="#16a34a" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Booked / Sold" value={loading ? '—' : kpis!.booked_properties} icon={MdSell} color="#0891b2" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <div style={{ gridColumn: 'span 1' }}>
          <StatCard label="Booking / Sales Value" value={loading ? '—' : rupeeCompact(kpis!.total_booking_value)} icon={MdPayments} color="#ea580c" bg="" loading={loading}
            surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
          {!loading && <div style={{ marginTop: 4 }}><DeltaBadge value={deltas?.total_booking_value ?? null} /></div>}
        </div>
        <StatCard label="Pending Payments" value={loading ? '—' : rupeeCompact(kpis!.pending_payments)} icon={MdPendingActions} color="#dc2626" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Active Employees" value={loading ? '—' : kpis!.active_employees} icon={MdBadge} color="#db2777" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Pending / Overdue Activities" value={loading ? '—' : kpis!.pending_or_overdue_activities} icon={MdWarningAmber} color="#dc2626" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      {/* ── 🤖 DGCRM Intelligence — every figure/recommendation below is
          computed server-side by deterministic rules over this app's own
          Lead/LeadActivity data (see src/modules/intelligence/ in
          dgcrm_backend for the scoring formulas) — no LLM, no external AI
          service, nothing fabricated. Independent load/error state from
          the rest of this page (see the effect above) so a failure here
          can never take down the Executive Dashboard around it. ──────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${isDark ? 'rgba(124,58,237,0.35)' : '#ddd6fe'}`, boxShadow: isDark ? 'none' : '0 4px 16px rgba(124,58,237,0.08)', marginBottom: 18 }}>
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ background: 'linear-gradient(135deg,#4c1d95,#7c3aed,#a855f7)' }}>
          <MdAutoAwesome size={18} color="#fff" />
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>DGCRM Intelligence</h2>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.85)', marginLeft: 4 }}>Lead scoring, priorities and patterns — computed from your own CRM data</span>
        </div>
        <div className="p-4">
          {aiLoading ? (
            <Skeleton t={t} height={220} />
          ) : aiError || !aiInsights ? (
            <EmptyState t={t} text="AI Intelligence is temporarily unavailable." />
          ) : (
            <>
              {/* Insight tiles — Feature 8 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5" style={{ marginBottom: 16 }}>
                <InsightTile t={t} isDark={isDark} emoji="🔥" label="Hot Leads" value={String(aiInsights.hot_leads)} />
                <InsightTile t={t} isDark={isDark} emoji="⚠️" label="Overdue Follow-ups" value={String(aiInsights.overdue_follow_ups)} />
                <InsightTile t={t} isDark={isDark} emoji="🎯" label="Ready for Site Visit" value={String(aiInsights.ready_for_site_visit)} />
                <InsightTile t={t} isDark={isDark} emoji="📉" label="Becoming Inactive" value={String(aiInsights.becoming_inactive)} />
                <InsightTile t={t} isDark={isDark} emoji="🏠" label="Most Requested" value={aiInsights.most_requested_type?.value ?? '—'} />
                <InsightTile t={t} isDark={isDark} emoji="👥" label="Top Follow-up: Employee" value={aiInsights.top_employee_by_follow_up?.name ?? '—'} />
                <InsightTile t={t} isDark={isDark} emoji="📈" label={`Conversion Rate${aiInsights.conversion_rate_is_estimate ? ' (est.)' : ''}`} value={aiInsights.conversion_rate_percent !== null ? `${aiInsights.conversion_rate_percent}%` : '—'} />
              </div>

              {/* Pattern Detection — Feature 9 */}
              {aiPatterns.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
                    <MdTrendingFlat size={15} /> Patterns Detected
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                    {aiPatterns.map((p, i) => <PatternCard key={i} t={t} isDark={isDark} pattern={p} />)}
                  </div>
                </div>
              )}

              {/* Priority Queue — Feature 10. Informational ranking only —
                  no Leads detail page exists yet to link these rows to. */}
              <div>
                <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
                  <MdPersonSearch size={15} /> Today's AI Priorities
                </div>
                {aiPriorityQueue.length === 0 ? (
                  <EmptyState t={t} text="No leads need attention right now." />
                ) : (
                  aiPriorityQueue.map((item, i) => <PriorityRow key={item.lead_id} t={t} rank={i + 1} item={item} />)
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Sales Trend + Property Overview ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ marginBottom: 18 }}>
        <SectionCard t={t} title="Sales / Booking Trend" icon={MdTrendingUp} action={<span style={{ fontSize: 10.5, color: t.textMuted }}>Last 12 months</span>}>
          {loading ? <Skeleton t={t} /> : !data || data.sales_trend.length === 0 ? (
            <EmptyState t={t} text="No bookings recorded in the last 12 months." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.sales_trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.divider} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.textMuted }} axisLine={{ stroke: t.divider }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} tickFormatter={rupeeCompact} width={56} />
                <Tooltip
                  contentStyle={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, fontSize: 12 }}
                  formatter={(value, name) => [rupee(Number(value)), name === 'booking_value' ? 'Booking Value' : String(name)]}
                />
                <Line type="monotone" dataKey="booking_value" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="booking_value" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard t={t} title="Property Overview" icon={MdApartment}>
          {loading ? <Skeleton t={t} /> : !data || data.property_overview.every((p) => p.count === 0) ? (
            <EmptyState t={t} text="No properties found." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.property_overview} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={92} paddingAngle={2}>
                  {data.property_overview.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* ── Customer Overview + Employee Performance ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ marginBottom: 18 }}>
        <SectionCard t={t} title="Customer Overview" icon={MdPeople}>
          {loading ? <Skeleton t={t} height={240} /> : !data ? <EmptyState t={t} text="No data." /> : (
            <>
              <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 14 }}>
                <div style={{ background: t.insetBg, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600 }}>TOTAL</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary }}>{data.customer_overview.total_customers}</div>
                </div>
                <div style={{ background: t.insetBg, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600 }}>NEW</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary }}>{data.customer_overview.new_customers_in_period}</div>
                  <DeltaBadge value={deltas?.new_customers ?? null} />
                </div>
                <div style={{ background: t.insetBg, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600 }}>ACTIVE</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary }}>{data.customer_overview.active_customers}</div>
                </div>
              </div>
              {data.customer_overview.monthly_new_customers.length === 0 ? (
                <EmptyState t={t} text="No new customers in the last 12 months." />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.customer_overview.monthly_new_customers} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.divider} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10.5, fill: t.textMuted }} axisLine={{ stroke: t.divider }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                    <Tooltip contentStyle={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="New Customers" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </SectionCard>

        <SectionCard t={t} title="Employee Performance" icon={MdBadge} action={<span style={{ fontSize: 10.5, color: t.textMuted }}>Top by activities</span>}>
          {loading ? <Skeleton t={t} height={240} /> : !data || data.employee_performance.length === 0 ? (
            <EmptyState t={t} text="No employees found." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, data.employee_performance.length * 34)}>
              <BarChart data={data.employee_performance} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.divider} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="employee_name" tick={{ fontSize: 11, fill: t.textPrimary }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="activities_completed" fill="#16a34a" radius={[0, 4, 4, 0]} name="Activities Completed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* ── Payment Overview ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <SectionCard t={t} title="Payment Overview" icon={MdPayments}>
          {loading ? <Skeleton t={t} height={140} /> : !data ? <EmptyState t={t} text="No data." /> : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div style={{ background: getStatGradient('#16a34a'), borderRadius: 12, padding: 16, color: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>Total Received</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{rupee(data.payment_overview.total_received)}</div>
              </div>
              <div style={{ background: getStatGradient('#ea580c'), borderRadius: 12, padding: 16, color: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>Pending Approval ({data.payment_overview.pending_approval_count})</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{rupee(data.payment_overview.pending_approval)}</div>
              </div>
              <div style={{ background: getStatGradient('#dc2626'), borderRadius: 12, padding: 16, color: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>Overdue</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{rupee(data.payment_overview.overdue)}</div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Needs Attention ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <SectionCard t={t} title="Needs Attention" icon={MdWarningAmber}>
          {loading ? <Skeleton t={t} height={200} /> : !data ? <EmptyState t={t} text="No data." /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Overdue payments */}
              <div>
                <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>🔴 Overdue Payments</div>
                {data.needs_attention.overdue_payments.length === 0 ? (
                  <EmptyState t={t} text="No overdue payments." />
                ) : data.needs_attention.overdue_payments.map((r) => (
                  <button key={r.customer_id} type="button" onClick={() => navigate(`/admin/crm/customer-details/view/${r.customer_id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ background: t.insetBg, border: 'none', marginBottom: 6, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 12, color: t.textPrimary, fontWeight: 500 }}>{r.customer_name}</span>
                    <span className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{rupee(r.amount_due)} <MdArrowForward size={13} /></span>
                  </button>
                ))}
              </div>
              {/* Pending payment approvals */}
              <div>
                <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>🔴 Pending Payment Approvals</div>
                {data.needs_attention.pending_payment_approvals.length === 0 ? (
                  <EmptyState t={t} text="Nothing pending approval." />
                ) : data.needs_attention.pending_payment_approvals.map((r) => (
                  <button key={r.transaction_id} type="button" onClick={() => navigate('/admin/crm/payment-received')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ background: t.insetBg, border: 'none', marginBottom: 6, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 12, color: t.textPrimary, fontWeight: 500 }}>{r.customer_name} · {r.receipt_number}</span>
                    <span className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 700, color: '#ea580c' }}>{rupee(r.amount)} <MdArrowForward size={13} /></span>
                  </button>
                ))}
              </div>
              {/* Unassigned customers */}
              <div>
                <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>🟠 Unassigned Customers</div>
                {data.needs_attention.unassigned_customers.length === 0 ? (
                  <EmptyState t={t} text="Every customer has an assigned employee." />
                ) : data.needs_attention.unassigned_customers.map((r) => (
                  <button key={r.customer_id} type="button" onClick={() => navigate('/admin/crm/customer-details')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ background: t.insetBg, border: 'none', marginBottom: 6, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 12, color: t.textPrimary, fontWeight: 500 }}>{r.customer_name}</span>
                    <MdPersonOff size={14} style={{ color: '#ea580c' }} />
                  </button>
                ))}
              </div>
              {/* Overdue tasks — informational only, no Tasks UI module exists yet to link to */}
              <div>
                <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>🟡 Overdue Activities</div>
                {data.needs_attention.overdue_tasks.length === 0 ? (
                  <EmptyState t={t} text="No overdue activities." />
                ) : data.needs_attention.overdue_tasks.map((r) => (
                  <div key={r.task_id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: t.insetBg, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: t.textPrimary, fontWeight: 500 }}>{r.title} {r.assigned_to_name ? `· ${r.assigned_to_name}` : ''}</span>
                    <span className="flex items-center gap-1" style={{ fontSize: 11.5, color: '#ca8a04' }}><MdHourglassEmpty size={13} /> {r.due_date ? formatDate(r.due_date) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Recent Activity ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <SectionCard t={t} title="Recent Activity" icon={MdHistory}>
          {loading ? <Skeleton t={t} height={220} /> : !data || data.recent_activity.length === 0 ? (
            <EmptyState t={t} text="No recent activity." />
          ) : (
            <div>
              {data.recent_activity.map((r, i) => {
                const meta = ACTION_META[r.action] ?? { label: r.action, color: '#64748b', icon: MdHistory };
                const Icon = meta.icon;
                // Session events (login/OTP) already name their actor —
                // appending "User #2" after "logged in" reads as a
                // dangling object, so that clause is skipped just for these.
                const isSessionEvent = r.action === 'login_success' || r.action === 'login_failed' || r.action === 'otp_verified';
                return (
                  <div key={r.id} className="flex items-start gap-2.5" style={{ padding: '8px 0', borderTop: i === 0 ? 'none' : `1px solid ${t.divider}` }}>
                    <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 26, height: 26, background: `${meta.color}22` }}>
                      <Icon size={13} style={{ color: meta.color }} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, color: t.textPrimary }}>
                        <strong>{r.performed_by_name || 'System'}</strong> {meta.label}
                        {!isSessionEvent && <> <strong>{r.entity_type}</strong> {r.entity_id ? `#${r.entity_id}` : ''}</>}
                      </div>
                      <div style={{ fontSize: 10.5, color: t.textMuted }}>{formatLastLogin(r.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Unavailable metrics — surfaced honestly rather than faked ── */}
      {data && data.unavailable_metrics.length > 0 && (
        <div className="rounded-xl px-4 py-3" style={{ background: t.insetBg, fontSize: 11, color: t.textMuted, marginBottom: 8 }}>
          <strong style={{ color: t.textSecondary }}>Not shown (no data tracked yet):</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {data.unavailable_metrics.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExecutiveDashboardPage;
