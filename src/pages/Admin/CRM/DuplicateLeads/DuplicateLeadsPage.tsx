// ==========================================
// DREAM GROUP CRM - DUPLICATE LEADS (Admin)
// ==========================================
// V_27.0 — leads flagged as possible duplicates, side by side with the lead
// they duplicate. "Merge" keeps the original's values, fills its empty
// fields from the duplicate, moves calls / comments / tasks / assigned
// employees to it and removes the duplicate (backend leads/leadMerge.ts).
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from '@/utils/toast';
import { MdArrowBack, MdMergeType, MdRefresh } from 'react-icons/md';

import { useAppDispatch } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { useAppearanceTokens } from '../../../../styles/appearanceTokens';
import { getAccordionCardStyle, getAccordionHeaderStyle } from '../../../../components/common/MasterListUI';
import { formatDate, formatLastLogin } from '../../../../utils';
import { DuplicateLeadSide, DuplicatePair, fetchDuplicateLeads, mergeDuplicateLead } from '../../../../services/leadService';

interface ErrLike { response?: { data?: { message?: string } } }
const errMessage = (e: unknown, fallback: string) => (e as ErrLike)?.response?.data?.message || fallback;

const FIELDS: { key: keyof DuplicateLeadSide; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'mobile_number', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'City' },
  { key: 'source', label: 'Source' },
  { key: 'category', label: 'Temperature' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
  { key: 'last_call_at', label: 'Last call' },
];

const show = (side: DuplicateLeadSide | null, key: keyof DuplicateLeadSide): string => {
  if (!side) return '—';
  const v = side[key];
  if (v == null || v === '') return '—';
  if (key === 'created_at') return formatDate(String(v));
  if (key === 'last_call_at') return formatLastLogin(String(v));
  if (key === 'mobile_number') return `${side.mobile_country_code ?? ''} ${v}`.trim();
  return String(v);
};

const DuplicateLeadsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useAppearanceTokens();
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);

  useEffect(() => { dispatch(setPageTitle('Duplicate Leads')); }, [dispatch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPairs(await fetchDuplicateLeads());
    } catch (e) {
      toast.error(errMessage(e, 'Failed to load duplicate leads.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const merge = async (p: DuplicatePair) => {
    if (!p.original) return;
    const answer = await Swal.fire({
      icon: 'question',
      title: `Merge "${p.duplicate.name}" into "${p.original.name}"?`,
      html: 'The original keeps its details; its empty fields are filled from the duplicate.<br/>'
        + 'Calls, comments, tasks and assigned employees move to the original, and the duplicate is removed.',
      showCancelButton: true,
      confirmButtonText: 'Merge',
      confirmButtonColor: '#1a5c38',
    });
    if (!answer.isConfirmed) return;
    setMerging(p.duplicate.id);
    try {
      const res = await mergeDuplicateLead(p.duplicate.id);
      toast.success(res.filled.length ? `Merged. Filled in: ${res.filled.join(', ').replace(/_/g, ' ')}.` : 'Merged.');
      load();
    } catch (e) {
      toast.error(errMessage(e, 'Failed to merge the leads.'));
    } finally {
      setMerging(null);
    }
  };

  const cell: React.CSSProperties = { padding: '6px 10px', fontSize: 12.5, color: t.textPrimary, borderTop: `1px solid ${t.surfaceBorder}`, verticalAlign: 'top' };
  const label: React.CSSProperties = { ...cell, color: t.textSecondary, width: 110 };

  return (
    <div style={{ padding: 16 }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <button type="button" className="master-btn-icon" onClick={() => navigate(-1)} title="Back"
          style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}><MdArrowBack size={16} /></button>
        <span style={{ fontSize: 13, color: t.textSecondary, flex: 1 }}>
          Leads with the same mobile number as an existing lead. Check each pair, then merge or leave it.
        </span>
        <button type="button" className="master-btn-icon" onClick={load} disabled={loading} title="Refresh"
          style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}><MdRefresh size={16} /></button>
      </div>
      {!loading && pairs.length === 0 && (
        <div style={{ ...getAccordionCardStyle(t), padding: 24, textAlign: 'center', color: t.textSecondary }}>No duplicate leads to review.</div>
      )}
      {pairs.map((p) => (
        <div key={p.duplicate.id} style={getAccordionCardStyle(t)}>
          <div style={getAccordionHeaderStyle(t, true)}>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>
              {p.duplicate.name} <span style={{ color: t.textSecondary, fontWeight: 500 }}>duplicates</span> {p.original?.name ?? '(original missing)'}
            </span>
            <button type="button" className="master-btn-primary" disabled={!p.original || merging === p.duplicate.id} onClick={() => merge(p)}>
              <MdMergeType size={15} /> {merging === p.duplicate.id ? 'Merging…' : 'Merge into original'}
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...label, borderTop: 'none' }} />
                  <th style={{ ...cell, borderTop: 'none', textAlign: 'left' }}>Original (kept) #{p.original?.id ?? '—'}</th>
                  <th style={{ ...cell, borderTop: 'none', textAlign: 'left' }}>Duplicate (removed) #{p.duplicate.id}</th>
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((f) => {
                  const o = show(p.original, f.key);
                  const d = show(p.duplicate, f.key);
                  const fills = o === '—' && d !== '—';
                  return (
                    <tr key={f.key}>
                      <td style={label}>{f.label}</td>
                      <td style={cell}>{fills ? <span style={{ color: '#047857', fontWeight: 600 }}>{d} (filled in)</span> : o}</td>
                      <td style={{ ...cell, color: d !== o && !fills ? t.textSecondary : t.textPrimary }}>{d}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DuplicateLeadsPage;
