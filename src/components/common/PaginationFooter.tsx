// src/components/common/PaginationFooter.tsx
// Shared "rows per page / prev-next" footer for every Master list table.

import React from 'react';
import { AppTheme } from '../../styles/theme';

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

interface PaginationFooterProps {
  t         : AppTheme;
  limit     : number;
  setLimit  : (n: number) => void;
  setPage   : (p: number) => void;
  safePage  : number;
  totalPages: number;
  from      : number;
  to        : number;
  total     : number;
  pageBtns  : () => number[];
}

const PaginationFooter: React.FC<PaginationFooterProps> = ({
  t, limit, setLimit, setPage, safePage, totalPages, from, to, total, pageBtns,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderTop: `1px solid ${t.divider}` }}>
    <div className="flex items-center gap-2">
      <span style={{ fontSize: 11.5, color: t.textPrimary }}>Rows per page:</span>
      <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
        style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 8, padding: '4px 8px', fontSize: 11.5, cursor: 'pointer', outline: 'none' }}>
        {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
    <span style={{ fontSize: 11.5, color: t.textPrimary }}>Showing {from}–{to} of {total}</span>
    <div className="flex items-center gap-1">
      <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}
        style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: t.textPrimary, cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontSize: 11.5 }}>Prev</button>
      {pageBtns().map((pg) => (
        <button key={pg} onClick={() => setPage(pg)}
          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${pg === safePage ? '#2563eb' : t.surfaceBorder}`, background: pg === safePage ? '#2563eb' : t.btnSecondaryBg, color: pg === safePage ? '#fff' : t.textPrimary, cursor: 'pointer', fontSize: 11.5, fontWeight: pg === safePage ? 700 : 400 }}>
          {pg}
        </button>
      ))}
      <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}
        style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.surfaceBorder}`, background: t.btnSecondaryBg, color: t.textPrimary, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', fontSize: 11.5 }}>Next</button>
    </div>
  </div>
);

export default PaginationFooter;
