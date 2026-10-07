// ==========================================
// DREAM GROUP CRM - 2D BUILDING VIEW: BUILDING ELEVATION
// ==========================================
// The building drawn as a building: every wing is a tower (front facade, a
// shaded side face and a roof for depth), every configured floor a storey,
// every flat a balcony window painted in its status colour. Towers stand on
// a landscaped plot. Only the architecture is decorative — which wings,
// floors and flats exist, and each flat's status, come straight from the
// loaded Building Master data (ViewBuilding), nothing is invented.
//
// A floor with fewer flats than the widest floor of its wing keeps the
// remaining bays as plain glass (not clickable) so every storey stays the
// same width, as a real facade does.
//
// The building's shops (Building Master's Building -> Shop list, which
// belongs to no wing/floor) stand as a one-storey shopping arcade beside the
// towers, one shopfront per shop in its status colour.
import React, { useMemo } from 'react';
import { BuildingShop, BuildingWing } from '../../../types/index';
import { STATUS_COLOR } from './Building2DViewPage';
import { PlanFlat, toPlanFlat, toPlanShop } from './FlatTooltip';

// Drawing units (SVG px).
const BAY_W = 40;        // one flat / window bay
const FLOOR_H = 30;      // one storey
const SIDE_PAD = 14;     // facade margin left/right of the bays
const DEPTH = 34;        // side face depth (x)
const RISE = 16;         // side face rise (y) — the "3D" angle
const TOWER_GAP = 70;    // space between towers
const TOP_PAD = 70;      // room for the wing label + roof
const GROUND_H = 90;     // landscaped plot under the towers
const OUTER_PAD = 40;
const SHOP_W = 46;       // one shopfront
const SHOP_H = 54;       // arcade height (fascia + shopfronts)

// Facade palette (neutral stone), independent of the app theme.
const FACADE = '#eee5d6';
const FACADE_DARK = '#dccfb9';
const SIDE = '#c9b99f';
const ROOF = '#d8cbb5';
const GLASS = '#a9bccd';
const SLAB = '#cdbfa6';

interface Props {
  wings: BuildingWing[];
  shops: BuildingShop[];
  shopsSelected: boolean;
  onSelectShops: () => void;
  selectedWingId: string;
  selectedFloorId: string | null;
  selectedFlatId: string | null;
  selectedShopId: string | null;
  onSelectFlat: (flat: PlanFlat) => void;
  onSelectFloor: (wingId: string, floorId: string) => void;
  onHover: (flat: PlanFlat | null, e?: React.MouseEvent) => void;
}

const BuildingElevation: React.FC<Props> = ({ wings, shops, shopsSelected, onSelectShops, selectedWingId, selectedFloorId, selectedFlatId, selectedShopId, onSelectFlat, onSelectFloor, onHover }) => {
  const layout = useMemo(() => {
    const towers = wings.map((w) => {
      const floors = [...w.floors].sort((a, b) => a.sort_order - b.sort_order);
      const bays = Math.max(1, ...floors.map((f) => f.flats.length));
      return { wing: w, floors, bays, w: bays * BAY_W + SIDE_PAD * 2, h: Math.max(1, floors.length) * FLOOR_H };
    });
    const maxH = Math.max(towers.length ? FLOOR_H : SHOP_H, ...towers.map((t) => t.h));
    const baseline = OUTER_PAD + TOP_PAD + maxH;
    let x = OUTER_PAD;
    const placed = towers.map((t) => { const p = { ...t, x }; x += t.w + DEPTH + TOWER_GAP; return p; });
    const arcade = shops.length ? { x, w: shops.length * SHOP_W + SIDE_PAD * 2 } : null;
    if (arcade) x += arcade.w + DEPTH + TOWER_GAP;
    const width = x - TOWER_GAP + OUTER_PAD;
    return { placed, arcade, baseline, width, height: baseline + GROUND_H };
  }, [wings, shops]);

  const { placed, arcade, baseline, width, height } = layout;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="bv-elevation" role="img" aria-label="Building elevation">
      <defs>
        <linearGradient id="bvFacade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={FACADE} /><stop offset="1" stopColor={FACADE_DARK} />
        </linearGradient>
        <linearGradient id="bvGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9d7a8" /><stop offset="1" stopColor="#9cc389" />
        </linearGradient>
        <filter id="bvShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="6" dy="8" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Plot: lawn, a paved path in front of the towers, trees. */}
      <rect x={0} y={baseline - 6} width={width} height={GROUND_H + 6} fill="url(#bvGround)" />
      <rect x={0} y={baseline + 26} width={width} height={20} fill="#e2e2dc" />
      <rect x={0} y={baseline + 26} width={width} height={2} fill="#cfcfc6" />
      {Array.from({ length: Math.max(3, Math.floor(width / 70)) }).map((_, i) => {
        const tx = 24 + i * 70 + (i % 2) * 18;
        const ty = baseline + 62 + (i % 3) * 6;
        return (
          <g key={i} className="bv-tree">
            <rect x={tx - 2} y={ty - 4} width={4} height={14} fill="#7c5b3b" />
            <circle cx={tx} cy={ty - 10} r={13} fill="#4f8f3a" />
            <circle cx={tx - 7} cy={ty - 4} r={9} fill="#5ea347" />
            <circle cx={tx + 7} cy={ty - 5} r={9} fill="#468235" />
          </g>
        );
      })}

      {placed.map((tw) => {
        const top = baseline - tw.h;
        const isSelWing = !shopsSelected && tw.wing.id === selectedWingId;
        return (
          <g key={tw.wing.id} filter="url(#bvShadow)">
            {/* Side face (depth) */}
            <polygon points={`${tw.x + tw.w},${top} ${tw.x + tw.w + DEPTH},${top - RISE} ${tw.x + tw.w + DEPTH},${baseline - RISE} ${tw.x + tw.w},${baseline}`} fill={SIDE} />
            {tw.floors.map((_, k) => {
              const y = baseline - (k + 1) * FLOOR_H;
              return (
                <g key={k}>
                  <polygon points={`${tw.x + tw.w + 8},${y + 8 - 3} ${tw.x + tw.w + DEPTH - 8},${y + 8 - RISE + 4} ${tw.x + tw.w + DEPTH - 8},${y + FLOOR_H - 8 - RISE + 4} ${tw.x + tw.w + 8},${y + FLOOR_H - 8 - 3}`} fill="#9fb2c3" opacity={0.75} />
                  <line x1={tw.x + tw.w} y1={y} x2={tw.x + tw.w + DEPTH} y2={y - RISE} stroke="#b5a487" strokeWidth={1} />
                </g>
              );
            })}
            {/* Roof slab + machine room */}
            <polygon points={`${tw.x},${top} ${tw.x + DEPTH},${top - RISE} ${tw.x + tw.w + DEPTH},${top - RISE} ${tw.x + tw.w},${top}`} fill={ROOF} />
            <rect x={tw.x - 3} y={top - 6} width={tw.w + 6} height={8} fill={FACADE_DARK} />
            <rect x={tw.x + tw.w / 2 - 22} y={top - 26} width={44} height={20} fill={FACADE} stroke={SLAB} />
            <polygon points={`${tw.x + tw.w / 2 + 22},${top - 26} ${tw.x + tw.w / 2 + 34},${top - 32} ${tw.x + tw.w / 2 + 34},${top - 12} ${tw.x + tw.w / 2 + 22},${top - 6}`} fill={SIDE} />

            {/* Front facade */}
            <rect x={tw.x} y={top} width={tw.w} height={tw.h} fill="url(#bvFacade)" />
            {tw.floors.map((floor, k) => {
              const y = baseline - (k + 1) * FLOOR_H;
              const isSelFloor = isSelWing && floor.id === selectedFloorId;
              return (
                <g key={floor.id}>
                  {/* Clicking the storey (outside a window) opens that floor. */}
                  <rect x={tw.x} y={y} width={tw.w} height={FLOOR_H} fill="transparent" className="bv-storey"
                    onClick={() => onSelectFloor(tw.wing.id, floor.id)}>
                    <title>{`${tw.wing.name} — ${floor.label}`}</title>
                  </rect>
                  <rect x={tw.x} y={y + FLOOR_H - 3} width={tw.w} height={3} fill={SLAB} pointerEvents="none" />
                  {Array.from({ length: tw.bays }).map((__, j) => {
                    const bx = tw.x + SIDE_PAD + j * BAY_W;
                    const fl = floor.flats[j];
                    if (!fl) {
                      return <rect key={j} x={bx + 5} y={y + 6} width={BAY_W - 10} height={FLOOR_H - 13} rx={2} fill={GLASS} opacity={0.6} pointerEvents="none" />;
                    }
                    const pf = toPlanFlat(fl, floor, tw.wing);
                    const sel = fl.id === selectedFlatId;
                    return (
                      <g key={fl.id} className={`bv-window${sel ? ' bv-window-selected' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onSelectFlat(pf); }}
                        onMouseEnter={(e) => onHover(pf, e)} onMouseMove={(e) => onHover(pf, e)} onMouseLeave={() => onHover(null)}>
                        <rect x={bx + 5} y={y + 5} width={BAY_W - 10} height={FLOOR_H - 11} rx={2} fill={STATUS_COLOR[pf.status]} />
                        {/* glazing mullion + balcony railing */}
                        <line x1={bx + BAY_W / 2} y1={y + 6} x2={bx + BAY_W / 2} y2={y + FLOOR_H - 11} stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
                        <rect x={bx + 3} y={y + FLOOR_H - 9} width={BAY_W - 6} height={2} fill="rgba(255,255,255,0.85)" />
                        {sel && <rect x={bx + 2} y={y + 2} width={BAY_W - 4} height={FLOOR_H - 5} rx={3} fill="none" stroke="#1d4ed8" strokeWidth={3} />}
                      </g>
                    );
                  })}
                  {isSelFloor && (
                    <g pointerEvents="none">
                      <rect x={tw.x - 4} y={y} width={tw.w + 8} height={FLOOR_H} fill="rgba(37,99,235,0.16)" stroke="#2563eb" strokeWidth={2} rx={2} className="bv-floor-band" />
                      <polygon points={`${tw.x + tw.w + 4},${y} ${tw.x + tw.w + DEPTH},${y - RISE} ${tw.x + tw.w + DEPTH},${y + FLOOR_H - RISE} ${tw.x + tw.w + 4},${y + FLOOR_H}`} fill="rgba(37,99,235,0.22)" />
                    </g>
                  )}
                </g>
              );
            })}
            {/* Pilasters between bays */}
            {Array.from({ length: tw.bays + 1 }).map((_, j) => (
              <rect key={`p${j}`} x={tw.x + SIDE_PAD + j * BAY_W - 1.5} y={top} width={3} height={tw.h} fill="rgba(120,100,70,0.12)" pointerEvents="none" />
            ))}
            {/* Entrance canopy */}
            <rect x={tw.x + tw.w / 2 - 26} y={baseline - 12} width={52} height={5} fill="#8a7d6a" pointerEvents="none" />
            <rect x={tw.x + tw.w / 2 - 12} y={baseline - 7} width={24} height={7} fill="#5b6470" pointerEvents="none" />

            {/* Wing label */}
            <g className="bv-wing-label" onClick={() => { const f = tw.floors[0]; if (f) onSelectFloor(tw.wing.id, (tw.floors.find((x) => x.id === selectedFloorId) ?? f).id); }}>
              <rect x={tw.x + tw.w / 2 - 38} y={top - 62} width={76} height={24} rx={6} fill={isSelWing ? '#2563eb' : '#1f2937'} />
              <polygon points={`${tw.x + tw.w / 2 - 6},${top - 38} ${tw.x + tw.w / 2 + 6},${top - 38} ${tw.x + tw.w / 2},${top - 32}`} fill={isSelWing ? '#2563eb' : '#1f2937'} />
              <text x={tw.x + tw.w / 2} y={top - 45} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="#fff">{tw.wing.name}</text>
            </g>
          </g>
        );
      })}
      {arcade && (() => {
        const ax = arcade.x; const aw = arcade.w; const top = baseline - SHOP_H;
        return (
          <g filter="url(#bvShadow)">
            <polygon points={`${ax + aw},${top} ${ax + aw + DEPTH},${top - RISE} ${ax + aw + DEPTH},${baseline - RISE} ${ax + aw},${baseline}`} fill={SIDE} />
            <polygon points={`${ax},${top} ${ax + DEPTH},${top - RISE} ${ax + aw + DEPTH},${top - RISE} ${ax + aw},${top}`} fill={ROOF} />
            <rect x={ax} y={top} width={aw} height={SHOP_H} fill="url(#bvFacade)" />
            {/* Fascia (signboard band) — clicking it opens the shops plan. */}
            <rect x={ax - 3} y={top} width={aw + 6} height={14} fill="#334155" className="bv-storey" onClick={onSelectShops}>
              <title>Shops — Ground Floor</title>
            </rect>
            <text x={ax + aw / 2} y={top + 10.5} textAnchor="middle" fontSize={9} fontWeight={800} letterSpacing={3} fill="#f8fafc" pointerEvents="none">SHOPS</text>
            {shops.map((sh, j) => {
              const bx = ax + SIDE_PAD + j * SHOP_W;
              const pf = toPlanShop(sh);
              const sel = sh.id === selectedShopId;
              const fy = top + 22; const fh = SHOP_H - 26;
              return (
                <g key={sh.id} className={`bv-window bv-shop${sel ? ' bv-window-selected' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onSelectFlat(pf); }}
                  onMouseEnter={(e) => onHover(pf, e)} onMouseMove={(e) => onHover(pf, e)} onMouseLeave={() => onHover(null)}>
                  {/* awning */}
                  <polygon points={`${bx + 2},${top + 15} ${bx + SHOP_W - 2},${top + 15} ${bx + SHOP_W},${top + 21} ${bx},${top + 21}`} fill={STATUS_COLOR[pf.status]} opacity={0.85} />
                  {/* shopfront glass / shutter */}
                  <rect x={bx + 4} y={fy} width={SHOP_W - 8} height={fh} rx={1.5} fill={STATUS_COLOR[pf.status]} />
                  {[0.25, 0.45, 0.65, 0.85].map((k) => (
                    <line key={k} x1={bx + 5} x2={bx + SHOP_W - 5} y1={fy + fh * k} y2={fy + fh * k} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
                  ))}
                  <text x={bx + SHOP_W / 2} y={fy + fh / 2 + 3} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#fff" pointerEvents="none"
                    style={{ paintOrder: 'stroke' }} stroke="rgba(15,23,42,0.45)" strokeWidth={2}>{sh.shop_no}</text>
                  {sel && <rect x={bx + 1} y={top + 14} width={SHOP_W - 2} height={SHOP_H - 15} rx={3} fill="none" stroke="#1d4ed8" strokeWidth={3} />}
                </g>
              );
            })}
            {Array.from({ length: shops.length + 1 }).map((_, j) => (
              <rect key={`sp${j}`} x={ax + SIDE_PAD + j * SHOP_W - 1.5} y={top + 14} width={3} height={SHOP_H - 14} fill="rgba(120,100,70,0.25)" pointerEvents="none" />
            ))}
            {shopsSelected && (
              <rect x={ax - 4} y={top - 1} width={aw + 8} height={SHOP_H + 1} fill="rgba(37,99,235,0.10)" stroke="#2563eb" strokeWidth={2} rx={2} pointerEvents="none" className="bv-floor-band" />
            )}
            <g className="bv-wing-label" onClick={onSelectShops}>
              <rect x={ax + aw / 2 - 38} y={top - 62} width={76} height={24} rx={6} fill={shopsSelected ? '#2563eb' : '#1f2937'} />
              <polygon points={`${ax + aw / 2 - 6},${top - 38} ${ax + aw / 2 + 6},${top - 38} ${ax + aw / 2},${top - 32}`} fill={shopsSelected ? '#2563eb' : '#1f2937'} />
              <text x={ax + aw / 2} y={top - 45} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="#fff">Shops</text>
            </g>
          </g>
        );
      })()}
    </svg>
  );
};

export default BuildingElevation;
