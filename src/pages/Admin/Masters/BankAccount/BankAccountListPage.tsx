// src/pages/Admin/Masters/BankAccount/BankAccountListPage.tsx

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAdd, MdDownload, MdRefresh, MdSearch, MdAccountBalance,
} from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { FetchBankAccount, DeleteBankAccount } from '../../../../services/bankAccountService';
import { BankAccount } from '../../../../types/index';
import { formatDate, showAlert } from '../../../../utils';
import MasterIconButtons from '../../../../components/masters/MasterIconButtons';
import SortableTh from '../../../../components/masters/SortableTh';
import { useSortedRows } from '../../../../components/masters/useSortedRows';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// Fixed width for the Actions column — sized for exactly 3 icon buttons
// + gaps + cell padding, so it never grows/shrinks with the number of
// other columns in the table.
const ACTION_COL_WIDTH = 96;

type SortKey = 'id' | 'company_name' | 'name' | 'account_holder_name' | 'account_number' | 'created_at';

const BankAccountListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark   = mode === 'dark';
  const t        = getTheme(isDark);

  const [allBanks, setAllBanks]       = useState<BankAccount[]>([]);
  const [filtered, setFiltered]       = useState<BankAccount[]>([]);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [page, setPage]               = useState(1);
  const [limit, setLimit]             = useState(5);

  useEffect(() => { dispatch(setPageTitle('Bank A/C')); }, [dispatch]);

  const fetchBanks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await FetchBankAccount(1, 1000);
      if (res.success) {
        setAllBanks(res.rows ?? []);
      } else {
        toast.error('Failed to Fetch Bank Accounts');
      }
    } catch {
      toast.error('Failed to fetch bank accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanks(); }, [fetchBanks]);

  // ── client-side search — bank name, account number, IFSC, company, holder ─
  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(
      q
        ? allBanks.filter(
            (b) =>
              b.name.toLowerCase().includes(q) ||
              (b.account_number ?? '').toLowerCase().includes(q) ||
              (b.ifsc_code ?? '').toLowerCase().includes(q) ||
              (b.company_name ?? '').toLowerCase().includes(q) ||
              (b.account_holder_name ?? '').toLowerCase().includes(q)
          )
        : allBanks
    );
    setPage(1);
  }, [search, allBanks]);

  // Default sort: newest first (item 5) — a newly-added bank account
  // appears at the top of the table until the user picks a different column.
  const getSortValue = (b: BankAccount, key: SortKey): string | number => {
    switch (key) {
      case 'id': return Number(b.id);
      case 'company_name': return (b.company_name ?? '').toLowerCase();
      case 'name': return b.name?.toLowerCase() || '';
      case 'account_holder_name': return (b.account_holder_name ?? '').toLowerCase();
      case 'account_number': return b.account_number ?? '';
      case 'created_at': return b.created_at || '';
    }
  };
  const { sorted, sortKey, sortDir, toggleSort } = useSortedRows<BankAccount, SortKey>(filtered, getSortValue, 'created_at', 'desc');

  const handleDelete = async (bank: BankAccount) => {
    const result = await showAlert.confirm(
      `Are you sure you want to delete "${bank.name}"?`,
      'Delete Bank Account?'
    );
    if (!result.isConfirmed) return;
    try {
      await DeleteBankAccount(String(bank.id));
      toast.success('Bank Account Deleted Successfully', { autoClose: 1000 });
      fetchBanks();
    } catch (e: any) {
      console.error('[BankAccountListPage] delete error:', e);
      toast.error(e?.response?.data?.message || 'Failed to delete bank account. Please try again.');
    }
  };

  const exportCSV = () => {
    if (sorted.length === 0) { toast.info('No data to Export'); return; }
    const headers = ['ID', 'Company Name', 'Bank Name', 'Account Holder Name', 'Account Number', 'Branch Name', 'IFSC Code', 'Status', 'Created At'];
    const rows    = sorted.map((b) => [
      b.id,
      `"${b.company_name ?? ''}"`,
      `"${b.name}"`,
      `"${b.account_holder_name ?? ''}"`,
      b.account_number,
      `"${b.branch_name}"`,
      b.ifsc_code,
      b.is_active ? 'Active' : 'Inactive',
      formatDate(b.created_at),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a   = Object.assign(document.createElement('a'), { href: url, download: 'bank_accounts.csv' });
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Bank Account List CSV Exported Successfully', { autoClose: 1000 });
  };

  // ── pagination ─────────────────────────────────────────────────────────
  const totalFiltered = sorted.length;
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / limit));
  const safePage      = Math.min(page, totalPages);
  const startIdx      = (safePage - 1) * limit;
  const pageRows      = sorted.slice(startIdx, startIdx + limit);
  const showingFrom   = totalFiltered === 0 ? 0 : startIdx + 1;
  const showingTo     = Math.min(startIdx + limit, totalFiltered);

  const pageBtns = () => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  };

  return (
    <div className="master-page">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="master-topbar">
        <div className="master-search-box" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
          <MdSearch size={18} style={{ color: t.textPrimary, flexShrink: 0 }} />
          <input type="text" placeholder="Search by bank name, IFSC, company..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="master-search-input" style={{ color: t.inputText }} />
        </div>

        <div className="master-actions">
          <button onClick={() => navigate('/admin/masters/bank-account/add')} className="master-btn-primary">
            <MdAdd size={18} /> Add Bank A/C
          </button>
          <button onClick={exportCSV} title="Export CSV" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdDownload size={18} />
          </button>
          <button onClick={fetchBanks} title="Refresh" className="master-btn-icon"
            style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="master-table-card" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}>
        <div className="master-table-scroll">
          <table className="master-table" style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ background: t.tableHeaderBg }}>
                <th className="master-table-actions-th" style={{
                  width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
<<<<<<< HEAD
                  fontSize: 12, fontWeight: 700, textTransform: 'camelcase',
                  letterSpacing: '0.05em', color: t.textPrimary,
                  borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap',
                  position: 'sticky', left: 0, zIndex: 2,
                  background: t.tableHeaderBg,
                  borderRight: `2px solid ${t.divider}`,
                  boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                }}>Actions</th>
                {['ID', 'Company Name', 'Bank Name', 'Account Holder Name', 'Account Number', 'Branch Name', 'IFSC Code', 'Status', 'Created At'].map((h) => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 12, fontWeight: 700, textTransform: 'camelcase',
                    letterSpacing: '0.05em', color: t.textPrimary,
                    borderBottom: `1px solid ${t.divider}`, whiteSpace: 'nowrap',
                  }}>{h}</th>
=======
                  borderBottom: `1px solid ${t.divider}`, zIndex: 2, background: t.tableHeaderBg,
                  borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                }}>Actions</th>
                <SortableTh label="ID" active={sortKey === 'id'} dir={sortDir} onClick={() => toggleSort('id')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Company Name" active={sortKey === 'company_name'} dir={sortDir} onClick={() => toggleSort('company_name')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Bank Name" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Account Holder Name" active={sortKey === 'account_holder_name'} dir={sortDir} onClick={() => toggleSort('account_holder_name')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                <SortableTh label="Account Number" active={sortKey === 'account_number'} dir={sortDir} onClick={() => toggleSort('account_number')} style={{ borderBottom: `1px solid ${t.divider}` }} />
                {['Branch Name', 'IFSC Code'].map((h) => (
                  <th key={h} style={{ borderBottom: `1px solid ${t.divider}` }}>{h}</th>
>>>>>>> V_14.0
                ))}
                <SortableTh label="Created At" active={sortKey === 'created_at'} dir={sortDir} onClick={() => toggleSort('created_at')} style={{ borderBottom: `1px solid ${t.divider}` }} />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48 }}>Loading...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48 }}>
                  {search ? 'No bank accounts match your search.' : 'No bank accounts found.'}
                </td></tr>
              ) : (
                pageRows.map((bank, idx) => {
                  const rowBg = idx % 2 === 0 ? t.surfaceBg : t.tableHeaderBg;
                  return (
                    <tr key={bank.id}
                      style={{ background: rowBg, borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#d1d5db'}`, transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.tableRowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                      <td className="master-table-actions-td" style={{
                        width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH,
                        zIndex: 1, background: isDark ? t.surfaceBg : '#ffffff',
                        borderRight: `2px solid ${t.divider}`, boxShadow: '4px 0 8px rgba(0,0,0,0.06)',
                      }}>
                        <MasterIconButtons
                          onView={() => navigate(`/admin/masters/bank-account/view/${bank.id}`)}
                          onEdit={() => navigate(`/admin/masters/bank-account/edit/${bank.id}`)}
                          onDelete={() => handleDelete(bank)}
                        />
                      </td>
                      <td>{bank.id}</td>
                      <td>{bank.company_name ?? '—'}</td>
                      <td style={{ fontWeight: 500 }}>
                        <div className="flex items-center gap-2">
                          <MdAccountBalance size={16} className="master-row-icon" />
                          {bank.name}
                        </div>
                      </td>
                      <td>{bank.account_holder_name ?? '—'}</td>
                      <td>{bank.account_number}</td>
                      <td>{bank.branch_name}</td>
                      <td>{bank.ifsc_code}</td>
                      <td>{formatDate(bank.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="master-pagination" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, color: t.textPrimary }}>Rows per page:</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <span style={{ fontSize: 13, color: t.textPrimary }}>
            Showing {showingFrom}–{showingTo} of {totalFiltered}
          </span>

          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="master-page-btn"
              style={{ padding: '4px 10px', width: 'auto', border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: t.textPrimary, cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
            {pageBtns().map((pg) => (
              <button key={pg} onClick={() => setPage(pg)} className="master-page-btn"
                style={{ border: `1px solid ${pg === safePage ? '#2563eb' : t.surfaceBorder}`, background: pg === safePage ? '#2563eb' : t.btnSecondaryBg, color: pg === safePage ? '#fff' : t.textPrimary, fontWeight: pg === safePage ? 700 : 400 }}>
                {pg}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="master-page-btn"
              style={{ padding: '4px 10px', width: 'auto', border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankAccountListPage;
