// src/components/leads/LeadCrudView.tsx
// Shared Add / Edit / View for a single Lead — used by both Admin and
// Employee portals. View/Edit modes also show the assign-employees control
// and the threaded comment/activity timeline (legacy LeadComment.
// ParentCommentId — see leads.service.ts on the backend for how a comment
// row's parent_id makes it a reply).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdSave, MdArrowBack, MdReply, MdSend, MdPersonAdd } from 'react-icons/md';

import { useAppearanceTokens } from '../../styles/appearanceTokens';
import { getAccordionCardStyle, getAccordionHeaderStyle, getFormInputStyle, FormField } from '../../components/common/MasterListUI';
import {
  fetchLeadById, createLead, updateLead, assignLead, fetchLeadActivities, addLeadComment,
} from '../../services/leadService';
import { FetchEmployeeDetails } from '../../services/employeeDetailsService';
import { Lead, LeadActivity, LeadStatus, LEAD_STATUSES, LEAD_STATUS_LABELS, CreateLeadPayload } from '../../types/index';
import { formatDate } from '../../utils';
import LeadStatusBadge from './LeadStatusBadge';

export type LeadCrudMode = 'add' | 'edit' | 'view';

interface Props {
  mode: LeadCrudMode;
  basePath: string; // e.g. '/admin/crm/leads' or '/employee/leads'
}

const EMPTY_FORM: CreateLeadPayload = {
  name: '', mobile_number: '', whatsapp_number: '', alternate_number: '', email: '',
  address: '', city: '', state: '', pincode: '', occupation: '', company_name: '',
  source: 'other', category: 'cold', sub_category: '', budget: null, deal_amount: null,
  looking_for: '', carpet_size: '', how_will_fund: '', current_residence: '', purpose_buying: '',
  how_did_you_know: '', preferred_call_time: '', next_call_scheduled_at: '', initial_comment: '', remark: '',
  status: 'new', project_id: '', cp_firm_name: '', cp_name: '', cp_validity: '', channel_partner_id: '',
};

const toDateOnly = (iso: string | null | undefined): string => (iso ? String(iso).slice(0, 10) : '');

// Indian comma grouping while typing — same pattern as
// CustomerDetailsCrudPage.tsx's formatAmountDisplay, adapted for Budget/
// Deal Amount's number|null underlying type (Customer's own amount fields
// are plain strings; these two aren't).
const formatAmountDisplay = (n: number | null | undefined): string => (n == null ? '' : n.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
const parseAmountInput = (raw: string): number | null => {
  const digits = raw.replace(/[^\d.]/g, '');
  return digits === '' ? null : Number(digits);
};

const LeadCrudView: React.FC<Props> = ({ mode, basePath }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark, t, accent, duplicateIcon, systemBorder, cssVars } = useAppearanceTokens();
  const isView = mode === 'view';
  const isAdd = mode === 'add';

  const [form, setForm] = useState<CreateLeadPayload>(EMPTY_FORM);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(!isAdd);
  const [saving, setSaving] = useState(false);

  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<LeadActivity | null>(null);
  const [posting, setPosting] = useState(false);

  const set = (field: keyof CreateLeadPayload, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const loadLead = useCallback(async () => {
    if (isAdd || !id) return;
    setLoading(true);
    try {
      const res = await fetchLeadById(id);
      if (res.success) {
        const l = res.data;
        setLead(l);
        setForm({
          name: l.name, mobile_number: l.mobile_number, whatsapp_number: l.whatsapp_number,
          alternate_number: l.alternate_number, email: l.email, address: l.address, city: l.city,
          state: l.state, pincode: l.pincode, occupation: l.occupation, company_name: l.company_name,
          source: l.source, category: l.category, sub_category: l.sub_category,
          budget: l.budget, deal_amount: l.deal_amount, looking_for: l.looking_for,
          carpet_size: l.carpet_size, how_will_fund: l.how_will_fund, current_residence: l.current_residence,
          purpose_buying: l.purpose_buying, how_did_you_know: l.how_did_you_know,
          preferred_call_time: l.preferred_call_time, next_call_scheduled_at: toDateOnly(l.next_call_scheduled_at),
          initial_comment: l.initial_comment, remark: l.remark, status: l.status,
          project_id: l.project_id, cp_firm_name: l.cp_firm_name, cp_name: l.cp_name,
          cp_validity: toDateOnly(l.cp_validity), channel_partner_id: l.channel_partner_id,
        });
        setSelectedEmployeeIds((l.assigned_employees ?? []).map((e) => e.id));
      } else {
        toast.error('Failed to load lead');
      }
    } catch {
      toast.error('Failed to load lead. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id, isAdd]);

  useEffect(() => { loadLead(); }, [loadLead]);

  useEffect(() => {
    FetchEmployeeDetails(1, 500, undefined, true)
      .then((res) => { if (res.success) setEmployeeOptions(res.rows.map((e) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`.trim() }))); })
      .catch(() => { /* dropdown staying empty is a harmless degrade */ });
  }, []);

  const loadActivities = useCallback(async () => {
    if (isAdd || !id) return;
    setLoadingActivities(true);
    try {
      setActivities(await fetchLeadActivities(id));
    } catch {
      toast.error('Failed to load activity timeline.');
    } finally {
      setLoadingActivities(false);
    }
  }, [id, isAdd]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error('Lead name is required.'); return; }
    setSaving(true);
    try {
      if (isAdd) {
        const res = await createLead(form);
        toast.success(res.data.is_duplicate ? 'Lead created — flagged as a possible duplicate.' : 'Lead created successfully.');
        navigate(`${basePath}/view/${res.data.id}`);
      } else if (id) {
        await updateLead(id, form);
        toast.success('Lead updated successfully.');
        navigate(`${basePath}/view/${id}`);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.errors?.[0]?.message || err?.response?.data?.message;
      toast.error(detail || (isAdd ? 'Failed to create lead.' : 'Failed to update lead.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!id || selectedEmployeeIds.length === 0) { toast.error('Select at least one employee.'); return; }
    setAssigning(true);
    try {
      await assignLead(id, selectedEmployeeIds);
      toast.success('Lead assigned successfully.');
      loadLead();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to assign lead.');
    } finally {
      setAssigning(false);
    }
  };

  const handlePostComment = async () => {
    if (!id || !newComment.trim()) return;
    setPosting(true);
    try {
      await addLeadComment(id, newComment.trim(), replyTo?.id ?? null);
      setNewComment('');
      setReplyTo(null);
      loadActivities();
    } catch {
      toast.error('Failed to post comment.');
    } finally {
      setPosting(false);
    }
  };

  // Group the flat activity list into top-level entries with their replies
  // nested underneath — status_change entries never have replies.
  const threaded = useMemo(() => {
    const byParent = new Map<string, LeadActivity[]>();
    const top: LeadActivity[] = [];
    for (const a of activities) {
      if (a.parent_id) {
        const list = byParent.get(a.parent_id) ?? [];
        list.push(a);
        byParent.set(a.parent_id, list);
      } else {
        top.push(a);
      }
    }
    return top.map((a) => ({ ...a, replies: (byParent.get(a.id) ?? []).sort((x, y) => x.action_date.localeCompare(y.action_date)) }));
  }, [activities]);

  if (loading) return <div className="master-page" style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  const cardStyle = getAccordionCardStyle(t);
  const headerStyle = getAccordionHeaderStyle(t, true);
  const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, padding: 16 };

  return (
    <div className="master-page" style={{ ...cssVars, fontFamily: t.fontFamily }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => navigate(basePath)} className="master-btn-icon"
          style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>
          <MdArrowBack size={18} />
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            {isAdd ? 'Add Lead' : isView ? form.name || 'Lead' : `Edit — ${form.name}`}
          </div>
          {!isAdd && lead && (
            <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
              <LeadStatusBadge status={lead.status} isDark={isDark} />
              {lead.is_duplicate && <span style={{ fontSize: 11, color: duplicateIcon, fontWeight: 600 }}>Possible duplicate</span>}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={cardStyle}>
          <div style={headerStyle}><span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Basic Info</span></div>
          <div style={gridStyle}>
            <FormField label="Name *" t={t}><input required disabled={isView} value={form.name} onChange={(e) => set('name', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Mobile Number" t={t}><input disabled={isView} value={form.mobile_number ?? ''} onChange={(e) => set('mobile_number', e.target.value)} style={getFormInputStyle(t)} placeholder="10 digits" /></FormField>
            <FormField label="WhatsApp Number" t={t}><input disabled={isView} value={form.whatsapp_number ?? ''} onChange={(e) => set('whatsapp_number', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Alternate Number" t={t}><input disabled={isView} value={form.alternate_number ?? ''} onChange={(e) => set('alternate_number', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Email" t={t}><input type="email" disabled={isView} value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Occupation" t={t}><input disabled={isView} value={form.occupation ?? ''} onChange={(e) => set('occupation', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Company Name" t={t}><input disabled={isView} value={form.company_name ?? ''} onChange={(e) => set('company_name', e.target.value)} style={getFormInputStyle(t)} /></FormField>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}><span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Address</span></div>
          <div style={gridStyle}>
            <FormField label="Address" t={t}><input disabled={isView} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="City" t={t}><input disabled={isView} value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="State" t={t}><input disabled={isView} value={form.state ?? ''} onChange={(e) => set('state', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Pincode" t={t}><input disabled={isView} value={form.pincode ?? ''} onChange={(e) => set('pincode', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Current Residence" t={t}><input disabled={isView} value={form.current_residence ?? ''} onChange={(e) => set('current_residence', e.target.value)} style={getFormInputStyle(t)} /></FormField>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}><span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Requirement & Pipeline</span></div>
          <div style={gridStyle}>
            <FormField label="Source" t={t}>
              <select disabled={isView} value={form.source ?? 'other'} onChange={(e) => set('source', e.target.value)} style={getFormInputStyle(t)}>
                {['website', 'facebook', 'referral', 'walk-in', 'channel-partner', 'other'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Temperature" t={t}>
              <select disabled={isView} value={form.category ?? 'cold'} onChange={(e) => set('category', e.target.value)} style={getFormInputStyle(t)}>
                {['hot', 'warm', 'cold'].map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
              </select>
            </FormField>
            <FormField label="Pipeline Status" t={t}>
              <select disabled={isView || isAdd} value={form.status ?? 'new'} onChange={(e) => set('status', e.target.value as LeadStatus)} style={getFormInputStyle(t)}>
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
              </select>
            </FormField>
            <FormField label="Sub-category" t={t}><input disabled={isView} value={form.sub_category ?? ''} onChange={(e) => set('sub_category', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Budget (₹)" t={t}><input type="text" inputMode="decimal" disabled={isView} value={formatAmountDisplay(form.budget)} onChange={(e) => set('budget', parseAmountInput(e.target.value))} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Deal Amount (₹)" t={t}><input type="text" inputMode="decimal" disabled={isView} value={formatAmountDisplay(form.deal_amount)} onChange={(e) => set('deal_amount', parseAmountInput(e.target.value))} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Looking For" t={t}><input disabled={isView} value={form.looking_for ?? ''} onChange={(e) => set('looking_for', e.target.value)} style={getFormInputStyle(t)} placeholder="e.g. 2BHK" /></FormField>
            <FormField label="Carpet Size" t={t}><input disabled={isView} value={form.carpet_size ?? ''} onChange={(e) => set('carpet_size', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="How Will Fund" t={t}><input disabled={isView} value={form.how_will_fund ?? ''} onChange={(e) => set('how_will_fund', e.target.value)} style={getFormInputStyle(t)} placeholder="e.g. Home Loan" /></FormField>
            <FormField label="Purpose of Buying" t={t}><input disabled={isView} value={form.purpose_buying ?? ''} onChange={(e) => set('purpose_buying', e.target.value)} style={getFormInputStyle(t)} placeholder="Self-use / Investment" /></FormField>
            <FormField label="How Did You Know" t={t}><input disabled={isView} value={form.how_did_you_know ?? ''} onChange={(e) => set('how_did_you_know', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Preferred Call Time" t={t}><input disabled={isView} value={form.preferred_call_time ?? ''} onChange={(e) => set('preferred_call_time', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="Next Call / Site Visit Date" t={t}><input type="date" disabled={isView} value={toDateOnly(form.next_call_scheduled_at)} onChange={(e) => set('next_call_scheduled_at', e.target.value)} style={getFormInputStyle(t)} /></FormField>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}><span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Channel Partner (if any)</span></div>
          <div style={gridStyle}>
            <FormField label="CP Firm Name" t={t}><input disabled={isView} value={form.cp_firm_name ?? ''} onChange={(e) => set('cp_firm_name', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="CP Name" t={t}><input disabled={isView} value={form.cp_name ?? ''} onChange={(e) => set('cp_name', e.target.value)} style={getFormInputStyle(t)} /></FormField>
            <FormField label="CP Validity" t={t}><input type="date" disabled={isView} value={toDateOnly(form.cp_validity)} onChange={(e) => set('cp_validity', e.target.value)} style={getFormInputStyle(t)} /></FormField>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}><span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Remark</span></div>
          <div style={{ padding: 16 }}>
            <textarea disabled={isView} value={form.remark ?? ''} onChange={(e) => set('remark', e.target.value)} rows={3} style={{ ...getFormInputStyle(t), resize: 'vertical' as const }} />
          </div>
        </div>

        {!isView && (
          <div className="flex items-center gap-2" style={{ marginBottom: 24 }}>
            <button type="submit" disabled={saving} className="master-btn-primary">
              <MdSave size={17} /> {saving ? 'Saving...' : isAdd ? 'Create Lead' : 'Update Lead'}
            </button>
            <button type="button" onClick={() => navigate(basePath)} className="master-btn-icon"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary, padding: '9px 16px' }}>
              Cancel
            </button>
          </div>
        )}
      </form>

      {!isAdd && (
        <>
          {/* ── Assign Employees ────────────────────────────────────────── */}
          <div style={cardStyle}>
            <div style={headerStyle}><span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Assigned Employees</span></div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {employeeOptions.map((e) => {
                  const checked = selectedEmployeeIds.includes(e.id);
                  return (
                    <label key={e.id} className="flex items-center gap-1.5" style={{
                      padding: '5px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                      background: checked ? accent : t.insetBg, color: checked ? '#fff' : t.textPrimary,
                      border: `1px solid ${checked ? accent : t.surfaceBorder}`,
                    }}>
                      <input type="checkbox" checked={checked} style={{ display: 'none' }}
                        onChange={() => setSelectedEmployeeIds((prev) => checked ? prev.filter((id2) => id2 !== e.id) : [...prev, e.id])} />
                      {e.name}
                    </label>
                  );
                })}
                {employeeOptions.length === 0 && <span style={{ fontSize: 12, color: t.textSecondary }}>No employees found.</span>}
              </div>
              <button type="button" onClick={handleAssign} disabled={assigning} className="master-btn-primary">
                <MdPersonAdd size={16} /> {assigning ? 'Assigning...' : 'Save Assignment'}
              </button>
            </div>
          </div>

          {/* ── Activity / Comment timeline (threaded) ───────────────────── */}
          <div style={cardStyle}>
            <div style={headerStyle}><span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>Activity & Comments</span></div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyTo ? `Replying to "${replyTo.remark.slice(0, 40)}..."` : 'Add a comment...'}
                  style={{ ...getFormInputStyle(t), flex: 1 }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePostComment(); } }}
                />
                {replyTo && (
                  <button type="button" onClick={() => setReplyTo(null)} className="master-btn-icon"
                    style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}`, color: t.textPrimary }}>✕</button>
                )}
                <button type="button" onClick={handlePostComment} disabled={posting || !newComment.trim()} className="master-btn-primary">
                  <MdSend size={15} /> {posting ? 'Posting...' : 'Post'}
                </button>
              </div>

              {loadingActivities ? (
                <div style={{ textAlign: 'center', padding: 20, color: t.textSecondary }}>Loading timeline...</div>
              ) : threaded.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: t.textSecondary }}>No activity yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {threaded.map((a) => (
                    <div key={a.id} style={{ borderLeft: `2px solid ${a.action === 'status_change' ? systemBorder : accent}`, paddingLeft: 12 }}>
                      <div style={{ fontSize: 12.5, color: t.textPrimary }}>
                        {a.action === 'status_change' ? (
                          <em style={{ color: t.textSecondary }}>{a.remark}</em>
                        ) : (
                          <>
                            <strong>{a.employee_name || 'Unknown'}</strong>: {a.remark}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3" style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 2 }}>
                        <span>{formatDate(a.action_date)}</span>
                        {a.action === 'comment' && (
                          <button type="button" onClick={() => setReplyTo(a)} className="flex items-center gap-1"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, padding: 0 }}>
                            <MdReply size={13} /> Reply
                          </button>
                        )}
                      </div>
                      {a.replies.length > 0 && (
                        <div style={{ marginTop: 8, marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {a.replies.map((r) => (
                            <div key={r.id} style={{ borderLeft: `2px solid ${t.surfaceBorder}`, paddingLeft: 10 }}>
                              <div style={{ fontSize: 12, color: t.textPrimary }}>
                                <strong>{r.employee_name || 'Unknown'}</strong>: {r.remark}
                              </div>
                              <div style={{ fontSize: 10, color: t.textSecondary, marginTop: 2 }}>{formatDate(r.action_date)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeadCrudView;
