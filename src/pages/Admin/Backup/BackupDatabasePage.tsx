// ==========================================
// DREAM GROUP CRM - BACKUP DATABASE PAGE (Super Admin lobby)
// ==========================================
// Whole-database point-in-time snapshots — see backupService.ts /
// modules/backup/ in dgcrm_backend. Replaces the former PlaceholderPage.
// SuperAdmin-only, enforced server-side; every action here is high-blast-
// radius (Restore rolls back EVERY company's data), so Restore requires
// typing a confirmation phrase, not just a plain Yes/No dialog.
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { MdStorage, MdAdd, MdRestore, MdDelete, MdRefresh, MdShield, MdWarning, MdClose } from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { getTheme } from '../../../styles/theme';
import StatCard from '../../../components/masters/StatCard';
import { formatLastLogin } from '../../../utils';
import { fetchSnapshots, createSnapshot, restoreSnapshot, deleteSnapshot, BackupSnapshot } from '../../../services/backupService';

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

interface ErrLike { response?: { data?: { message?: string } } }
const errMessage = (e: unknown, fallback: string) => (e as ErrLike)?.response?.data?.message || fallback;

const BackupDatabasePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark = mode === 'dark';
  const t = getTheme(isDark);

  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  const [restoreTarget, setRestoreTarget] = useState<BackupSnapshot | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  useEffect(() => { dispatch(setPageTitle('Backup Database')); }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshots(await fetchSnapshots());
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load snapshots.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createSnapshot(labelInput.trim() || undefined);
      setLabelInput('');
      toast.success('Snapshot created.');
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to create snapshot.'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (s: BackupSnapshot) => {
    try {
      await deleteSnapshot(s.id);
      toast.success('Snapshot deleted.');
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to delete snapshot.'));
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget || confirmText !== 'RESTORE') return;
    setRestoring(true);
    try {
      const result = await restoreSnapshot(restoreTarget.id);
      toast.success(
        `Database restored from "${restoreTarget.label}". A safety snapshot of the previous state was saved automatically (#${result.safety_snapshot_id}).`,
        { autoClose: 8000 }
      );
      setRestoreTarget(null);
      setConfirmText('');
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to restore snapshot.'));
    } finally {
      setRestoring(false);
    }
  };

  const totalBytes = snapshots.reduce((s, x) => s + x.size_bytes, 0);
  const manualCount = snapshots.filter((s) => !s.is_safety_snapshot).length;
  const safetyCount = snapshots.filter((s) => s.is_safety_snapshot).length;

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Snapshots" value={snapshots.length} icon={MdStorage} color="#0284c7" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Manual" value={manualCount} icon={MdAdd} color="#16a34a" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Auto Safety Snapshots" value={safetyCount} icon={MdShield} color="#d97706" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Total Storage Used" value={formatBytes(totalBytes)} icon={MdStorage} color="#7c3aed" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl mb-5 p-5" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center gap-2.5 -m-5 mb-4 px-5 py-3.5 rounded-t-2xl" style={{ background: 'var(--grad-sky)' }}>
          <MdStorage size={18} style={{ color: '#fff', flexShrink: 0 }} />
          <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', margin: 0 }}>Create Snapshot</h3>
        </div>
        <p style={{ fontSize: 12, color: t.textSecondary, marginTop: 0, marginBottom: 12 }}>
          Captures every table in the database — every company's data, exactly as it stands right now — compressed and stored
          so it can be restored later if anything ever goes wrong. Only the most recent 10 snapshots are kept; the oldest is
          removed automatically once a new one is created.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input type="text" value={labelInput} onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Optional label (e.g. Before Migration) — a timestamp is used if left blank"
            style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 12px', fontSize: 12.5, outline: 'none' }} />
          <button type="button" onClick={handleCreate} disabled={creating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap"
            style={{ background: creating ? t.insetBg : '#16a34a', color: creating ? t.textSecondary : '#fff', border: 'none', cursor: creating ? 'not-allowed' : 'pointer' }}>
            <MdAdd size={17} /> {creating ? 'Creating…' : 'Create Snapshot'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Snapshots</h3>
          <button type="button" onClick={load} title="Refresh"
            className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
            <MdRefresh size={17} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Label', 'Type', 'Created', 'Created By', 'Size', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>Loading snapshots...</td></tr>
              ) : snapshots.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>No snapshots yet — create one above.</td></tr>
              ) : (
                snapshots.map((s) => (
                  <tr key={s.id} style={{ borderTop: `1px solid ${t.divider}` }}>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: isDark ? '#fff' : '#000' }}>{s.label}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {s.is_safety_snapshot ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold" style={{ background: '#fef3c7', color: '#b45309', fontSize: 10.5 }}>
                          <MdShield size={12} /> Auto Safety
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold" style={{ background: '#dcfce7', color: '#16a34a', fontSize: 10.5 }}>
                          <MdAdd size={12} /> Manual
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(s.created_at)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: isDark ? '#fff' : '#000' }}>{s.created_by_name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatBytes(s.size_bytes)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center gap-2">
                        <button type="button" title="Restore this snapshot" onClick={() => { setRestoreTarget(s); setConfirmText(''); }} className="master-icon-btn">
                          <MdRestore size={15} />
                        </button>
                        <button type="button" title="Delete this snapshot" onClick={() => handleDelete(s)} className="master-icon-btn" style={{ color: '#dc2626' }}>
                          <MdDelete size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => !restoring && setRestoreTarget(null)}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 480, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>
                <MdWarning size={20} /> Restore Database
              </div>
              <button type="button" onClick={() => !restoring && setRestoreTarget(null)} disabled={restoring}
                style={{ background: 'transparent', border: 'none', cursor: restoring ? 'not-allowed' : 'pointer', color: t.textSecondary, padding: 4, display: 'flex' }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5">
              <p style={{ fontSize: 13, color: t.textPrimary, marginTop: 0 }}>
                This will overwrite the <b>entire current database</b> (every company's data) with the contents of{' '}
                <b>&ldquo;{restoreTarget.label}&rdquo;</b>. Anything created or changed since that snapshot was taken will be lost.
              </p>
              <p style={{ fontSize: 12, color: t.textSecondary }}>
                A safety snapshot of the current state will be taken automatically first, so this can still be undone afterwards —
                but everything since then will need that safety snapshot to recover.
              </p>
              <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, marginTop: 14, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3, color: t.textSecondary }}>
                Type RESTORE to confirm
              </label>
              <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESTORE" autoFocus
                style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              <div className="flex items-center justify-end gap-2.5 mt-5">
                <button type="button" onClick={() => setRestoreTarget(null)} disabled={restoring}
                  className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: restoring ? 'not-allowed' : 'pointer' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleRestore} disabled={confirmText !== 'RESTORE' || restoring}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: confirmText === 'RESTORE' && !restoring ? '#dc2626' : t.insetBg, color: confirmText === 'RESTORE' && !restoring ? '#fff' : t.textSecondary, border: 'none', cursor: confirmText === 'RESTORE' && !restoring ? 'pointer' : 'not-allowed' }}>
                  {restoring ? 'Restoring…' : 'Restore Database'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupDatabasePage;
