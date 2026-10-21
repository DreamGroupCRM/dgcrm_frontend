// ==========================================
// DREAM GROUP CRM - MY TASKS PAGE (EMPLOYEE)
// ==========================================
// V_26.0 — the general tasks an Admin assigned to the logged-in employee
// (e.g. HR work for the HR Head). The employee can only change a task's
// status (enforced server-side); Admin creates and edits them on Tasks.
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from '@/utils/toast';
import { MdRefresh } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { getFormInputStyle, StatusChip } from '../../../components/common/MasterListUI';
import {
  fetchTasks, updateTask, Task, TASK_STATUSES, TASK_STATUS_LABEL, TaskStatus, TASK_PRIORITY_LABEL,
} from '../../../services/tasksService';
import { formatDate } from '../../../utils';

const errMessage = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const MyTasksPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, cssVars } = useAppearanceTokens();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'' | TaskStatus>('');

  useEffect(() => { dispatch(setPageTitle('My Tasks')); }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await fetchTasks({ kind: 'general', status: statusFilter || undefined }));
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load your tasks.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  const changeStatus = async (task: Task, status: TaskStatus) => {
    setBusyId(task.id);
    try {
      await updateTask(task.id, { title: task.title, status });
      toast.success(`Task marked ${TASK_STATUS_LABEL[status]}.`);
      load();
    } catch (err) {
      toast.error(errMessage(err, 'Failed to update the task.'));
    } finally {
      setBusyId(null);
    }
  };

  const cell: React.CSSProperties = { padding: '12px 14px', fontSize: 11.5, color: t.textSecondary };

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="p-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>My Tasks</h3>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | TaskStatus)} aria-label="Status" style={{ ...getFormInputStyle(t), width: 150 }}>
              <option value="">All Status</option>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
            </select>
            <button type="button" onClick={load} title="Refresh" aria-label="Refresh"
              className="flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
              <MdRefresh size={18} />
            </button>
          </div>
        </div>
        <div className="master-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Task', 'Due Date', 'Priority', 'Assigned By', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ ...cell, padding: 28, textAlign: 'center' }}>Loading...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={5} style={{ ...cell, padding: 28, textAlign: 'center' }}>No tasks assigned to you.</td></tr>
              ) : tasks.map((x) => (
                <tr key={x.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                  <td style={{ ...cell, minWidth: 220 }}>
                    <div style={{ fontWeight: 600, color: t.textPrimary, wordBreak: 'break-word' }}>{x.title}</div>
                    {x.description && <div style={{ marginTop: 2, wordBreak: 'break-word' }}>{x.description}</div>}
                  </td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{x.due_date ? formatDate(x.due_date) : '—'}</td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{TASK_PRIORITY_LABEL[x.priority] || x.priority}</td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{x.assigned_by_name || '—'}</td>
                  <td style={cell}>
                    <div className="flex items-center gap-2">
                      <StatusChip label={TASK_STATUS_LABEL[x.status as TaskStatus] || x.status} status={x.status} fontSize={11} />
                      <select value={x.status} disabled={busyId === x.id} aria-label={`Change status of ${x.title}`}
                        onChange={(e) => changeStatus(x, e.target.value as TaskStatus)} style={{ ...getFormInputStyle(t), width: 140 }}>
                        {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
                      </select>
                    </div>
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

export default MyTasksPage;
