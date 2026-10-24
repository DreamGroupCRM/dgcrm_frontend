// ==========================================
// DGCRM — SETTINGS (Admin)
// ==========================================
// V_26.0 — one page of tiles for the setup pages used now and then
// (Tasks, Masters, Payment Reminders, Call Sync Phones, User Management, Backup),
// so the sidebar stays short. The Super Admin tools show only for that
// login. Masters follow the header's "Enable Master" switch.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdBusiness, MdAccountTree, MdAccountBalance, MdApartment, MdNotificationsActive, MdPhoneAndroid,
  MdManageAccounts, MdStorage, MdSettings, MdGridOn, MdSecurity, MdAssignment,
} from 'react-icons/md';
import { IconType } from 'react-icons';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { setPageTitle } from '../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import { ROUTES } from '../../../constants';
import { fetchReminderSettings } from '../../../services/remindersService';

interface Tile { icon: IconType; title: string; text: string; path: string; tag?: string }

const readMasterEnabled = () => {
  try { const v = localStorage.getItem('dgcrm_master_enabled'); return v === null ? true : v === 'true'; } catch { return true; }
};

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t, cssVars } = useAppearanceTokens();
  const role = useAppSelector((s) => s.auth.role);
  const isSuper = role === 'superadmin';
  const [masterEnabled, setMasterEnabled] = useState(readMasterEnabled);
  const [whatsappUpcoming, setWhatsappUpcoming] = useState(false);

  useEffect(() => { dispatch(setPageTitle('Settings')); }, [dispatch]);
  useEffect(() => {
    const onToggle = (e: Event) => setMasterEnabled((e as CustomEvent<boolean>).detail);
    window.addEventListener('dgcrm_master_toggle', onToggle);
    return () => window.removeEventListener('dgcrm_master_toggle', onToggle);
  }, []);
  useEffect(() => {
    fetchReminderSettings().then((s) => setWhatsappUpcoming(!s.whatsapp.configured)).catch(() => { /* tag just not shown */ });
  }, []);

  const masters: Tile[] = [
    { icon: MdBusiness, title: 'Company', text: 'Business companies and their details', path: ROUTES.ADMIN.COMPANY },
    { icon: MdAccountTree, title: 'Department', text: 'Departments and designations', path: ROUTES.ADMIN.DEPARTMENT },
    { icon: MdAccountBalance, title: 'Bank A/C', text: 'Bank accounts for receipts', path: ROUTES.ADMIN.BANK_AC },
    { icon: MdApartment, title: 'Building', text: 'Projects, buildings, wings and flats', path: ROUTES.ADMIN.BUILDING },
  ];
  const general: Tile[] = [
    // V_26.0 — moved here from the left menu.
    { icon: MdAssignment, title: 'Tasks', text: 'Assign general tasks to employees and track them', path: ROUTES.ADMIN.TASKS },
    { icon: MdNotificationsActive, title: 'Payment Reminders', text: 'Automatic reminders to customers about their dues', path: ROUTES.ADMIN.PAYMENT_REMINDERS, tag: whatsappUpcoming ? 'WhatsApp upcoming' : undefined },
    { icon: MdPhoneAndroid, title: 'Call Sync Phones', text: 'Phones that sync calls, and WhatsApp brochure settings', path: ROUTES.ADMIN.CALL_DEVICES },
    { icon: MdManageAccounts, title: 'User Management', text: 'Logins: unlock, allow / block, sign out, set password', path: ROUTES.ADMIN.USER_MANAGEMENT },
    { icon: MdStorage, title: 'Backup Database', text: 'Create and download backups', path: ROUTES.ADMIN.BACKUP_DATABASE },
  ];
  const superTools: Tile[] = [
    { icon: MdAccountTree, title: 'Department Setup', text: 'Which pages each department gets', path: ROUTES.ADMIN.DEPARTMENT_SETUP },
    { icon: MdSecurity, title: 'Roles', text: 'Role permissions', path: ROUTES.ADMIN.ROLES },
    { icon: MdSettings, title: 'Action & Module', text: 'Modules and their actions', path: ROUTES.ADMIN.ACTION_MODULE },
    { icon: MdGridOn, title: 'Module Mapping', text: 'Which actions each module offers', path: ROUTES.ADMIN.MODULE_MAPPING },
  ];

  const section = (title: string, tiles: Tile[], dashed = false) => (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: t.textSecondary, letterSpacing: 0.6, textTransform: 'uppercase', margin: '4px 0 10px' }}>{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <button key={tile.path} type="button" onClick={() => navigate(tile.path)}
            className="flex items-start gap-3 rounded-2xl p-4 text-left settings-tile"
            style={{ background: t.surfaceBg, border: `1px ${dashed ? 'dashed' : 'solid'} ${t.surfaceBorder}`, cursor: 'pointer', fontFamily: t.fontFamily }}>
            <span className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ width: 40, height: 40, background: 'var(--grad-table-header)', color: '#fff' }}>
              <tile.icon size={20} />
            </span>
            <span>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: t.textPrimary }}>{tile.title}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: t.textSecondary, marginTop: 3, lineHeight: 1.4 }}>{tile.text}</span>
              {tile.tag && (
                <span className="inline-block rounded-full font-bold" style={{ marginTop: 6, fontSize: 10, padding: '1px 8px', background: '#fef3c7', color: '#b45309' }}>{tile.tag}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: t.fontFamily, display: 'flex', flexDirection: 'column', gap: 18, ...cssVars }}>
      <style>{`.settings-tile{transition:box-shadow 150ms, transform 150ms}.settings-tile:hover{box-shadow:0 6px 18px rgba(0,0,0,0.08);transform:translateY(-1px)}`}</style>
      <div>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Settings</h1>
        <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>Set up the CRM — used now and then, so kept off the main menu.</div>
      </div>
      {section('General', general)}
      {masterEnabled && section('Masters', masters)}
      {isSuper && section('Only for the Super Admin login', superTools, true)}
    </div>
  );
};

export default SettingsPage;
