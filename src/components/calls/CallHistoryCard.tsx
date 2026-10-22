// src/components/calls/CallHistoryCard.tsx
// V_27.0 — "Calls" card on the Lead and Customer pages: SIM calls synced
// from employee phones by the DGCRM Calls app. Recording playback arrives
// in a later phase; until then each call states why there is no recording,
// and no Play control is ever shown for a call without a usable recording.
import React, { useEffect, useState } from 'react';
import { MdCallMade, MdCallReceived, MdCallMissed, MdCallEnd, MdCall, MdFiberNew } from 'react-icons/md';
import { useAppearanceTokens } from '../../styles/appearanceTokens';
import { getAccordionCardStyle, getAccordionHeaderStyle } from '../common/MasterListUI';
import { formatLastLogin } from '../../utils';
import { CallDirection, CallLog, RecordingStatus } from '../../services/callService';

const DIRECTION: Record<CallDirection, { label: string; color: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  incoming: { label: 'Incoming', color: '#047857', Icon: MdCallReceived },
  outgoing: { label: 'Outgoing', color: '#1D4ED8', Icon: MdCallMade },
  missed: { label: 'Missed', color: '#DC2626', Icon: MdCallMissed },
  rejected: { label: 'Rejected', color: '#DC2626', Icon: MdCallEnd },
  other: { label: 'Call', color: '#64748B', Icon: MdCall },
};

const RECORDING_TEXT: Record<RecordingStatus, string> = {
  completed: 'Recording available',
  pending: 'Recording uploading',
  recording: 'Recording in progress',
  failed: 'Recording failed',
  unsupported: 'No recording (not supported on this phone yet)',
};

export const formatTalkTime = (seconds: number): string => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m === 0 ? `${s}s` : `${m}m ${String(s).padStart(2, '0')}s`;
};

interface Props {
  /** Loads this record's calls; called once on mount. */
  load: () => Promise<CallLog[]>;
}

const CallHistoryCard: React.FC<Props> = ({ load }) => {
  const { t } = useAppearanceTokens();
  const [calls, setCalls] = useState<CallLog[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    load()
      .then((rows) => { if (alive) setCalls(rows); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const muted = { fontSize: 12, color: t.textSecondary } as const;
  return (
    <div style={getAccordionCardStyle(t)}>
      <div style={getAccordionHeaderStyle(t, true)}>
        <span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>
          Calls{calls && calls.length > 0 ? ` (${calls.length})` : ''}
        </span>
        <span style={muted}>Synced from employee phones</span>
      </div>
      <div style={{ padding: 16 }}>
        {error ? (
          <div style={{ ...muted, textAlign: 'center', padding: 12 }}>Could not load calls.</div>
        ) : calls === null ? (
          <div style={{ ...muted, textAlign: 'center', padding: 12 }}>Loading calls...</div>
        ) : calls.length === 0 ? (
          <div style={{ ...muted, textAlign: 'center', padding: 12 }}>No calls synced yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {calls.map((c) => {
              const d = DIRECTION[c.direction] ?? DIRECTION.other;
              return (
                <div key={c.id} className="flex items-start gap-3"
                  style={{ borderLeft: `2px solid ${d.color}`, paddingLeft: 10 }}>
                  <d.Icon size={18} color={d.color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: t.textPrimary }}>
                      <strong>{d.label}</strong> · {formatTalkTime(c.duration_sec)}
                      {c.employee_name ? <> · {c.employee_name}</> : null}
                      {c.lead_created && (
                        <span title="This call created the lead" style={{ marginLeft: 6, color: '#B45309', verticalAlign: 'middle' }}>
                          <MdFiberNew size={16} />
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 2 }}>
                      {formatLastLogin(c.started_at)}
                      {c.phone_number ? ` · ${c.country_code ?? ''} ${c.phone_number}` : ''}
                      {c.device_label ? ` · ${c.device_label}` : ''}
                    </div>
                    {c.direction !== 'missed' && c.direction !== 'rejected' && c.duration_sec > 0 && (
                      <div style={{ fontSize: 10.5, color: t.textSecondary, marginTop: 2 }}>{RECORDING_TEXT[c.recording_status]}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallHistoryCard;
