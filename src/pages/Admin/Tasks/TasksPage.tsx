// ==========================================
// DREAM GROUP CRM - TASKS PAGE (ADMIN)
// ==========================================
// V_26.0 — Admin assigns general tasks (no customer — e.g. HR work for the
// HR Head) to any active employee and follows them up. Same tasks table
// and API as Payment Due's customer follow-ups (kind=general keeps the two
// apart). The employee sees and updates their own on My Tasks.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/utils/toast';
import { MdAssignment, MdDelete, MdRefresh } from 'react-icons/md';

import { useAppDispatch } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { getFormInputStyle, FormField, getAccordionCardStyle, getAccordionHeaderStyle } from '../../../components/common/MasterListUI';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import DateInput from '../../../components/common/DateInput';
import {
  fetchTasks, createTask, updateTask, deleteTask, fetchTaskAssignees, Task, TaskAssignee,
  TASK_STATUSES, TASK_STATUS_LABEL, TaskStatus, TASK_PRIORITIES, TASK_PRIORITY_LABEL,
} from '../../../services/tasksService';
import { formatDate, showAlert } from '../../../utils';
import { serverTodayYmd } from '../../../utils/serverTime';

const errMessage = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** "Name (CODE) — Department / Designation", the label shown in the picker. */
const assigneeLabel = (a: TaskAssignee): string => {
  const role = [a.departments, a.designations].filter(Boolean).join(' / ');
  return `${a.name}${a.employee_code ? ` (${a.employee_code})` : ''}${role ? ` — ${role}` : ''}`;
};

const TasksPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t, cssVars } = useAppearanceTokens();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'' | TaskStatus>('');
  const [search, setSearch] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeLabelValue, setAssigneeLabelValue] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [errors, setErrors] = useState<{ title?: string; assignee?: string }>({});

  useEffect(() => { dispatch(setPageTitle('Tasks')); }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await fetchTasks({ kind: 'general', status: statusFilter || undefined }));
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load tasks.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchTaskAssignees().then(setAssignees).catch((e) => toast.error(errMessage(e, 'Failed to load employees.')));
  }, []);

  const labelToId = useMemo(() => new Map(assignees.map((a) => [assigneeLabel(a), a.id])), [assignees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const assigneeId = labelToId.get(assigneeLabelValue);
    const next = {
      title: title.trim() ? undefined : 'Please enter the Task Title.',
      assignee: assigneeId != null ? undefined : 'Please select the employee.',
    };
    setErrors(next);
    if (next.title || next.assignee) return;
    setSaving(true);
    try {
      await createTask({ title: title.trim(), description: description.trim() || null, assigned_to: assigneeId, due_date: dueDate || null, priority });
      toast.success('Task assigned.');
      setTitle(''); setDescription(''); setAssigneeLabelValue(''); setDueDate(''); setPriority('medium');
      load();
    } catch (err) {
      toast.error(errMessage(err, 'Failed to assign the task.'));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (task: Task, status: TaskStatus) => {
    setBusyId(task.id);
    try {
      await updateTask(task.id, { title: task.title, description: task.description, due_date: task.due_date, status });
      toast.success(`Task marked ${TASK_STATUS_LABEL[status]}.`);
      load();
    } catch (err) {
      toast.error(errMessage(err, 'Failed to update the task.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (task: Task) => {
    const result = await showAlert.confirm(`This will delete the task "${task.title}".`, 'Delete Task?');
    if (!result.isConfirmed) return;
    setBusyId(task.id);
    try {
      await deleteTask(task.id);
      toast.success('Task deleted.');
      load();
    } catch (err) {
      toast.error(errMessage(err, 'Failed to delete the task.'));
    } finally {
      setBusyId(null);
    }
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((x) => [x.title, x.description, x.assigned_to_name].some((v) => (v || '').toLowerCase().includes(q)));
  }, [tasks, search]);

  const cardStyle = getAccordionCardStyle(t);
  const headerStyle = getAccordionHeaderStyle(t, true);
  const cell: React.CSSProperties = { padding: '12px 14px', fontSize: 11.5, color: t.textSecondary };
  const errorText = (msg?: string) => msg ? <span style={{ color: '#dc2626', fontSize: 11 }}>{msg}</span> : null;

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div style={cardStyle}>
        <div style={headerStyle}><span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Assign Task</span></div>
        <form onSubmit={handleSubmit} noValidate className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Task Title *" t={t}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} style={getFormInputStyle(t)} aria-invalid={!!errors.title} />
              {errorText(errors.title)}
            </FormField>
            <FormField label="Assign To *" t={t}>
              <SearchableSelect t={t} placeholder="Search employee by name, department or designation" options={assignees.map(assigneeLabel)}
                value={assigneeLabelValue} onChange={setAssigneeLabelValue} clearLabel="Clear employee" />
              {errorText(errors.assignee)}
            </FormField>
            <FormField label="Due Date" t={t}>
              <DateInput t={t} value={dueDate} min={serverTodayYmd()} onChange={(v) => setDueDate(v)} style={getFormInputStyle(t)} />
            </FormField>
            <FormField label="Priority" t={t}>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={getFormInputStyle(t)}>
                {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Description" t={t}>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional" style={{ ...getFormInputStyle(t), resize: 'vertical' as const }} />
          </FormField>
          <div>
            <button type="submit" disabled={saving} className="master-btn-primary">
              <MdAssignment size={16} /> {saving ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="p-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, description or employee"
            aria-label="Search tasks" style={{ ...getFormInputStyle(t), width: 280, maxWidth: '100%' }} />
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: tasks.length > 0 ? 820 : undefined }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Task', 'Assigned To', 'Due Date', 'Priority', 'Status', 'Assigned By', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ ...cell, padding: 28, textAlign: 'center' }}>Loading...</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={7} style={{ ...cell, padding: 28, textAlign: 'center' }}>No tasks found.</td></tr>
              ) : shown.map((x) => (
                <tr key={x.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                  <td style={{ ...cell, minWidth: 200 }}>
                    <div style={{ fontWeight: 600, color: t.textPrimary, wordBreak: 'break-word' }}>{x.title}</div>
                    {x.description && <div style={{ marginTop: 2, wordBreak: 'break-word' }}>{x.description}</div>}
                  </td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{x.assigned_to_name?.trim() || '—'}</td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{x.due_date ? formatDate(x.due_date) : '—'}</td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{TASK_PRIORITY_LABEL[x.priority] || x.priority}</td>
                  <td style={cell}>
                    <select value={x.status} disabled={busyId === x.id} aria-label={`Status of ${x.title}`}
                      onChange={(e) => changeStatus(x, e.target.value as TaskStatus)} style={{ ...getFormInputStyle(t), width: 140 }}>
                      {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{x.assigned_by_name || '—'}</td>
                  <td style={cell}>
                    <button type="button" onClick={() => remove(x)} disabled={busyId === x.id} title="Delete task" aria-label={`Delete ${x.title}`}
                      className="flex items-center justify-center rounded-lg"
                      style={{ width: 32, height: 32, background: 'transparent', border: `1px solid ${t.surfaceBorder}`, color: '#dc2626', cursor: 'pointer' }}>
                      <MdDelete size={16} />
                    </button>
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

export default TasksPage;
