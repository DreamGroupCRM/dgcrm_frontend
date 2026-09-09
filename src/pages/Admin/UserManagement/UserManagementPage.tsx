// ==========================================
// DREAM GROUP CRM - USER MANAGEMENT PAGE (Super Admin lobby)
// ==========================================
// Manages login accounts — enable/disable, delete, superadmin-set password.
// See userManagementService.ts / modules/userManagement/ in dgcrm_backend
// for why this deliberately never touches the linked Employee/Customer
// business record (Employee/Customer pages already own their own
// activate/deactivate/delete). SuperAdmin-only, enforced server-side.
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { MdPeople, MdCheckCircle, MdCancel, MdDelete, MdRefresh, MdKey, MdClose, MdLock, MdPersonAddAlt1, MdContentCopy, MdEdit } from 'react-icons/md';

import { useAppDispatch, useAppSelector } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import StatCard from '../../../components/masters/StatCard';
import { showAlert, formatLastLogin } from '../../../utils';
import {
  fetchUsers, setUserActiveStatus, deleteUser, adminSetPassword, createAdmin, updateUser,
  UserManagementRow, CreateAdminResult,
} from '../../../services/userManagementService';

interface ErrLike { response?: { data?: { message?: string } } }
const errMessage = (e: unknown, fallback: string) => (e as ErrLike)?.response?.data?.message || fallback;

const ROLE_LABEL: Record<string, string> = { superadmin: 'Super Admin', admin: 'Admin', manager: 'Manager', employee: 'Employee', customer: 'Customer' };

const UserManagementPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector((s) => s.auth);
  const { isDark, t, cssVars } = useAppearanceTokens();

  const [rows, setRows] = useState<UserManagementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [pwTarget, setPwTarget] = useState<UserManagementRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [createResult, setCreateResult] = useState<CreateAdminResult | null>(null);

  const [editTarget, setEditTarget] = useState<UserManagementRow | null>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { dispatch(setPageTitle('User Management')); }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchUsers());
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load users.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (row: UserManagementRow) => {
    setBusyId(row.id);
    try {
      await setUserActiveStatus(row.id, !row.is_active);
      toast.success(row.is_active ? 'User disabled.' : 'User enabled.');
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to update user status.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (row: UserManagementRow) => {
    const result = await showAlert.confirm(
      `This will delete the login account for ${row.first_name} ${row.last_name || ''}. Their Employee/Customer record (if any) is not affected.`,
      'Delete User?'
    );
    if (!result.isConfirmed) return;
    setBusyId(row.id);
    try {
      await deleteUser(row.id);
      toast.success('User deleted.');
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to delete user.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleSetPassword = async () => {
    if (!pwTarget || newPassword.length < 8) return;
    setSavingPw(true);
    try {
      await adminSetPassword(pwTarget.id, newPassword);
      toast.success('Password updated. The user must set a new password on next login.');
      setPwTarget(null);
      setNewPassword('');
    } catch (e) {
      toast.error(errMessage(e, 'Failed to update password.'));
    } finally {
      setSavingPw(false);
    }
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setCreateForm({ first_name: '', last_name: '', email: '', phone: '' });
    setCreateResult(null);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.first_name.trim() || !createForm.email.trim()) return;
    setCreating(true);
    try {
      const result = await createAdmin({
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim() || undefined,
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
      });
      setCreateResult(result);
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to create admin account.'));
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (row: UserManagementRow) => {
    setEditTarget(row);
    setEditForm({ first_name: row.first_name, last_name: row.last_name || '', email: row.email, phone: row.phone || '' });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editForm.first_name.trim() || !editForm.email.trim()) return;
    setSavingEdit(true);
    try {
      await updateUser(editTarget.id, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim() || undefined,
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || undefined,
      });
      toast.success('Admin details updated.');
      setEditTarget(null);
      await load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to update admin details.'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyTempPassword = () => {
    if (!createResult) return;
    navigator.clipboard?.writeText(createResult.temp_password).then(
      () => toast.success('Temporary password copied.'),
      () => toast.error('Could not copy — select and copy manually.')
    );
  };

  const activeCount = rows.filter((r) => r.is_active).length;
  const disabledCount = rows.filter((r) => !r.is_active).length;
  const lockedCount = rows.filter((r) => r.is_locked).length;

  return (
    <div style={{ fontFamily: t.fontFamily, ...cssVars }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Users" value={rows.length} icon={MdPeople} color="#0284c7" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Active" value={activeCount} icon={MdCheckCircle} color="#16a34a" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Disabled" value={disabledCount} icon={MdCancel} color="#dc2626" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
        <StatCard label="Locked" value={lockedCount} icon={MdLock} color="#d97706" bg="" loading={loading}
          surfaceBg={t.surfaceBg} surfaceBorder={t.surfaceBorder} textPrimary={t.textPrimary} textSecondary={t.textSecondary} />
      </div>

      <div className="rounded-2xl" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, margin: 0 }}>Login Accounts</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'var(--grad-purple)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <MdPersonAddAlt1 size={15} /> Create Admin
            </button>
            <button type="button" onClick={load} title="Refresh"
              className="flex items-center justify-center rounded-xl"
              style={{ width: 36, height: 36, background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: 'pointer' }}>
              <MdRefresh size={17} />
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr className="master-table-header-gradient" style={{ background: t.tableHeaderBg }}>
                {['Name', 'Email', 'Role', 'Linked To', 'Status', 'Last Login', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>Loading users...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>No users found.</td></tr>
              ) : (
                rows.map((row) => {
                  const isSelf = currentUser?.id === row.id;
                  const linkedTo = row.linked_employee_name ? `${row.linked_employee_name} (Employee)`
                    : row.linked_customer_name ? `${row.linked_customer_name} (Customer)` : '—';
                  return (
                    <tr key={row.id} style={{ borderTop: `1px solid ${t.divider}`, opacity: row.is_active ? 1 : 0.65 }}>
                      <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: isDark ? '#fff' : '#000' }}>
                        {row.first_name} {row.last_name || ''} {isSelf && <span style={{ fontSize: 10, color: t.textSecondary, fontWeight: 500 }}> (you)</span>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>{row.email}</td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: isDark ? '#fff' : '#000' }}>{ROLE_LABEL[row.base_role] || row.base_role}</td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary }}>{linkedTo}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold"
                          style={{ background: row.is_active ? '#dcfce7' : '#fee2e2', color: row.is_active ? '#16a34a' : '#dc2626', fontSize: 10.5 }}>
                          {row.is_active ? <MdCheckCircle size={12} /> : <MdCancel size={12} />} {row.is_active ? 'Active' : 'Disabled'}
                        </span>
                        {row.is_locked && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold ml-1.5" style={{ background: '#fef3c7', color: '#b45309', fontSize: 10.5 }}>
                            <MdLock size={12} /> Locked
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>{formatLastLogin(row.last_login_at)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center gap-2">
                          {row.base_role === 'admin' && (
                            <button type="button" title="Edit admin details" onClick={() => openEditModal(row)} className="master-icon-btn">
                              <MdEdit size={15} />
                            </button>
                          )}
                          <button type="button" title={isSelf ? "You can't disable your own account" : row.is_active ? 'Disable' : 'Enable'}
                            onClick={() => !isSelf && handleToggleActive(row)} disabled={isSelf || busyId === row.id}
                            className="master-icon-btn" style={{ opacity: isSelf ? 0.4 : 1, cursor: isSelf ? 'not-allowed' : 'pointer', color: row.is_active ? '#dc2626' : '#16a34a' }}>
                            {row.is_active ? <MdCancel size={15} /> : <MdCheckCircle size={15} />}
                          </button>
                          <button type="button" title="Set new password" onClick={() => { setPwTarget(row); setNewPassword(''); }} className="master-icon-btn">
                            <MdKey size={15} />
                          </button>
                          <button type="button" title={isSelf ? "You can't delete your own account" : 'Delete'}
                            onClick={() => !isSelf && handleDelete(row)} disabled={isSelf || busyId === row.id}
                            className="master-icon-btn" style={{ opacity: isSelf ? 0.4 : 1, cursor: isSelf ? 'not-allowed' : 'pointer', color: '#dc2626' }}>
                            <MdDelete size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pwTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => !savingPw && setPwTarget(null)}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 420, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>Set New Password</div>
              <button type="button" onClick={() => !savingPw && setPwTarget(null)} disabled={savingPw}
                style={{ background: 'transparent', border: 'none', cursor: savingPw ? 'not-allowed' : 'pointer', color: t.textSecondary, padding: 4, display: 'flex' }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="p-5">
              <p style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 0 }}>
                Setting a new password for <b style={{ color: t.textPrimary }}>{pwTarget.first_name} {pwTarget.last_name || ''}</b>.
                They will be required to change it on their next login.
              </p>
              <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, marginTop: 8, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3, color: t.textSecondary }}>
                New Password (min. 8 characters)
              </label>
              <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus
                style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              <div className="flex items-center justify-end gap-2.5 mt-5">
                <button type="button" onClick={() => setPwTarget(null)} disabled={savingPw}
                  className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: savingPw ? 'not-allowed' : 'pointer' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleSetPassword} disabled={newPassword.length < 8 || savingPw}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: newPassword.length >= 8 && !savingPw ? '#1a5c38' : t.insetBg, color: newPassword.length >= 8 && !savingPw ? '#fff' : t.textSecondary, border: 'none', cursor: newPassword.length >= 8 && !savingPw ? 'pointer' : 'not-allowed' }}>
                  {savingPw ? 'Saving…' : 'Set Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => !savingEdit && setEditTarget(null)}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 440, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>Edit Admin Details</div>
              <button type="button" onClick={() => !savingEdit && setEditTarget(null)} disabled={savingEdit}
                style={{ background: 'transparent', border: 'none', cursor: savingEdit ? 'not-allowed' : 'pointer', color: t.textSecondary, padding: 4, display: 'flex' }}>
                <MdClose size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3, color: t.textSecondary }}>First Name *</label>
                  <input required value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} autoFocus
                    style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3, color: t.textSecondary }}>Last Name</label>
                  <input value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                    style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3, color: t.textSecondary }}>Email *</label>
                <input required type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3, color: t.textSecondary }}>Phone</label>
                <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>
              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button type="button" onClick={() => setEditTarget(null)} disabled={savingEdit}
                  className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: savingEdit ? 'not-allowed' : 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit || !editForm.first_name.trim() || !editForm.email.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: '#1a5c38', color: '#fff', border: 'none', cursor: savingEdit ? 'not-allowed' : 'pointer', opacity: savingEdit ? 0.7 : 1 }}>
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => !creating && closeCreateModal()}>
          <div className="rounded-2xl w-full" style={{ maxWidth: 440, background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>
                {createResult ? 'Admin Account Created' : 'Create Admin'}
              </div>
              <button type="button" onClick={() => !creating && closeCreateModal()} disabled={creating}
                style={{ background: 'transparent', border: 'none', cursor: creating ? 'not-allowed' : 'pointer', color: t.textSecondary, padding: 4, display: 'flex' }}>
                <MdClose size={20} />
              </button>
            </div>

            {createResult ? (
              <div className="p-5">
                <p style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 0 }}>
                  Share this temporary password with <b style={{ color: t.textPrimary }}>{createResult.email}</b> securely.
                  It will not be shown again — they must set a new password on first login.
                </p>
                <div className="flex items-center gap-2 mt-2" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 10, padding: '9px 12px' }}>
                  <code style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, flex: 1, letterSpacing: 0.5 }}>{createResult.temp_password}</code>
                  <button type="button" onClick={handleCopyTempPassword} title="Copy"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: t.textSecondary, display: 'flex' }}>
                    <MdContentCopy size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-end mt-5">
                  <button type="button" onClick={closeCreateModal}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: '#1a5c38', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateAdmin} className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3, color: t.textSecondary }}>First Name *</label>
                    <input required value={createForm.first_name} onChange={(e) => setCreateForm((f) => ({ ...f, first_name: e.target.value }))} autoFocus
                      style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3, color: t.textSecondary }}>Last Name</label>
                    <input value={createForm.last_name} onChange={(e) => setCreateForm((f) => ({ ...f, last_name: e.target.value }))}
                      style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3, color: t.textSecondary }}>Email *</label>
                  <input required type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3, color: t.textSecondary }}>Phone</label>
                  <input value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                    style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <p style={{ fontSize: 11, color: t.textSecondary, margin: 0 }}>
                  A temporary password is generated automatically — the new admin must set their own password on first login.
                </p>
                <div className="flex items-center justify-end gap-2.5 mt-2">
                  <button type="button" onClick={closeCreateModal} disabled={creating}
                    className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, cursor: creating ? 'not-allowed' : 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={creating || !createForm.first_name.trim() || !createForm.email.trim()}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: '#1a5c38', color: '#fff', border: 'none', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
                    {creating ? 'Creating…' : 'Create Admin'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
