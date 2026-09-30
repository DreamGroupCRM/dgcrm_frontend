// ==========================================
// DREAM GROUP CRM - 2D BUILDING VIEW: FLOOR PLAN
// ==========================================
// The selected floor of the selected wing drawn as a plan: outer walls, the
// floor's flats as rooms on both sides of a common corridor, each with its
// door onto the corridor and a balcony on the outside wall. The flats (count,
// order, numbers, type, area, status) are exactly the ones configured in
// Building Master for that floor; only the walls/corridor are drawing.
//
// Display-only: clicking a flat selects it (the page shows Unit Details) —
// nothing here writes to the server or changes a status.
import React from 'react';
import { BuildingFloor, BuildingWing } from '../../../types/index';
import { AppTheme } from '../../../styles/theme';
import { STATUS_COLOR, STATUS_TEXT } from './Building2DViewPage';
import { PlanFlat, toPlanFlat } from './FlatTooltip';

const ROOM_W = 118;
const ROOM_H = 92;
const CORR_H = 46;
const BALCONY = 10;
const PAD = 16;
const CORE_W = 74;   // lift + staircase core at the end of the corridor

// Status tint for a room fill (the status colour itself, lightened).
const tint = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};
// Readable status text on a light tint.
const STATUS_INK: Record<string, string> = { available: '#15803d', booked: '#a16207', blocked: '#7f1d1d' };

interface Props {
  t: AppTheme;
  wing: BuildingWing;
  floor: BuildingFloor | null;
  selectedFlatId: string | null;
  onSelectFlat: (flat: PlanFlat) => void;
  onHover: (flat: PlanFlat | null, e?: React.MouseEvent) => void;
}

const FloorPlanView: React.FC<Props> = ({ t, wing, floor, selectedFlatId, onSelectFlat, onHover }) => {
  if (wing.floors.length === 0) {
    return <div className="bv-empty" style={{ color: t.textSecondary }}>{wing.name} has no floors configured in Building Master yet.</div>;
  }
  if (!floor) return <div className="bv-empty" style={{ color: t.textSecondary }}>Select a floor.</div>;
  if (floor.flats.length === 0) {
    return <div className="bv-empty" style={{ color: t.textSecondary }}>No flats are configured on {floor.label} of {wing.name} in Building Master.</div>;
  }

  const flats = floor.flats.map((f) => toPlanFlat(f, floor, wing));
  const topCount = Math.ceil(flats.length / 2);
  const rows = [flats.slice(0, topCount), flats.slice(topCount)];
  const cols = Math.max(rows[0].length, rows[1].length);
  const roomsW = cols * ROOM_W;
  const W = roomsW + CORE_W;
  const H = ROOM_H * (rows[1].length ? 2 : 1) + CORR_H;
  const corrY = PAD + BALCONY + ROOM_H;

  return (
    <svg key={floor.id} width={W + PAD * 2} height={H + PAD * 2 + BALCONY * 2} className="bv-plan" role="img" aria-label={`${floor.label} plan`}>
      {/* Outer slab + walls */}
      <rect x={PAD} y={PAD + BALCONY} width={W} height={H} fill="#f8fafc" stroke="#475569" strokeWidth={5} rx={2} />
      {/* Lift + staircase core (drawing only) */}
      {(() => {
        const cx = PAD + roomsW; const top = PAD + BALCONY; const bottom = PAD + BALCONY + H;
        const liftH = corrY - top; const stairY = corrY + CORR_H; const stairH = bottom - stairY;
        return (
          <g pointerEvents="none">
            <line x1={cx} y1={top} x2={cx} y2={corrY} stroke="#64748b" strokeWidth={2.5} />
            <line x1={cx} y1={stairY} x2={cx} y2={bottom} stroke="#64748b" strokeWidth={2.5} />
            <rect x={cx + 12} y={top + 12} width={CORE_W - 26} height={Math.max(20, liftH - 24)} fill="#cbd5e1" stroke="#64748b" strokeWidth={1.5} />
            <line x1={cx + 12} y1={top + 12} x2={cx + CORE_W - 14} y2={top + 12 + Math.max(20, liftH - 24)} stroke="#94a3b8" />
            <line x1={cx + CORE_W - 14} y1={top + 12} x2={cx + 12} y2={top + 12 + Math.max(20, liftH - 24)} stroke="#94a3b8" />
            <text x={cx + CORE_W / 2 - 1} y={top + liftH / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={800} fill="#334155" style={{ paintOrder: 'stroke' }} stroke="#e2e8f0" strokeWidth={3}>LIFT</text>
            {stairH > 0 && Array.from({ length: Math.max(3, Math.floor((stairH - 16) / 8)) }).map((_, i) => (
              <line key={i} x1={cx + 10} x2={cx + CORE_W - 12} y1={stairY + 8 + i * 8} y2={stairY + 8 + i * 8} stroke="#94a3b8" strokeWidth={1} />
            ))}
            {stairH > 0 && <text x={cx + CORE_W / 2 - 1} y={stairY + stairH / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={800} fill="#334155" style={{ paintOrder: 'stroke' }} stroke="#f8fafc" strokeWidth={4}>STAIRS</text>}
          </g>
        );
      })()}
      {/* Common corridor */}
      <rect x={PAD + 3} y={corrY} width={W - 6} height={CORR_H} fill="#e5e7eb" />
      <text x={PAD + roomsW / 2} y={corrY + CORR_H / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#6b7280" letterSpacing={2}>CORRIDOR</text>

      {rows.map((row, ri) => row.map((f, ci) => {
        const top = ri === 0;
        const x = PAD + ci * ROOM_W;
        const y = top ? PAD + BALCONY : corrY + CORR_H;
        const sel = f.id === selectedFlatId;
        const doorX = x + ROOM_W / 2 - 9;
        const doorY = top ? y + ROOM_H : y;
        return (
          <g key={f.id} className={`bv-room${sel ? ' bv-room-selected' : ''}`}
            onClick={() => onSelectFlat(f)}
            onMouseEnter={(e) => onHover(f, e)} onMouseMove={(e) => onHover(f, e)} onMouseLeave={() => onHover(null)}>
            {/* balcony on the outside wall */}
            <rect x={x + 18} y={top ? y - BALCONY : y + ROOM_H} width={ROOM_W - 36} height={BALCONY} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.5} />
            <rect className="bv-room-fill" x={x} y={y} width={ROOM_W} height={ROOM_H} fill={tint(STATUS_COLOR[f.status], 0.24)} stroke="#64748b" strokeWidth={2.5} />
            {/* door opening onto the corridor + swing */}
            <line x1={doorX} y1={doorY} x2={doorX + 18} y2={doorY} stroke="#f8fafc" strokeWidth={4} />
            <path d={top ? `M ${doorX} ${doorY} A 18 18 0 0 0 ${doorX + 18} ${doorY - 18}` : `M ${doorX} ${doorY} A 18 18 0 0 1 ${doorX + 18} ${doorY + 18}`} fill="none" stroke="#94a3b8" strokeWidth={1.2} />
            <line x1={doorX + 18} y1={doorY} x2={doorX + 18} y2={top ? doorY - 18 : doorY + 18} stroke="#94a3b8" strokeWidth={1.2} />
            <text x={x + ROOM_W / 2} y={y + (top ? 34 : 44)} textAnchor="middle" fontSize={15} fontWeight={800} fill="#0f172a">{f.no}</text>
            <text x={x + ROOM_W / 2} y={y + (top ? 51 : 61)} textAnchor="middle" fontSize={11} fontWeight={700} fill={STATUS_INK[f.status]}>{STATUS_TEXT[f.status]}</text>
            {f.type && <text x={x + ROOM_W / 2} y={y + (top ? 65 : 75)} textAnchor="middle" fontSize={10} fontWeight={600} fill="#475569">{f.type}</text>}
            {sel && <rect x={x + 3} y={y + 3} width={ROOM_W - 6} height={ROOM_H - 6} fill="none" stroke="#2563eb" strokeWidth={3.5} rx={2} className="bv-room-ring" />}
          </g>
        );
      }))}
    </svg>
  );
};

export default FloorPlanView;
