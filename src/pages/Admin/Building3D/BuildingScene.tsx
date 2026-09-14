// ==========================================
// DREAM GROUP CRM - 3D BUILDING VIEW: THREE.JS SCENE
// ==========================================
// Pure presentation — every mesh here is generated straight from the
// Building Master hierarchy (Building3DViewPage does the data work); this
// file only knows how to draw a wing tower, a floor slab, or a row of
// units and report clicks back up. No fetching, no business rules.
//
// Visual note: the "windows" drawn on a wing tower (building level) and on
// a floor slab (wing level) are real data, not decoration — a tower's
// per-floor window row is tinted by that floor's own available/total
// ratio, and a floor slab's window row is colored one rectangle per real
// flat, using the exact same status each flat already resolves to at
// floor level. No building photo, no fabricated floor plan, no per-unit
// image — those were explicitly left out (see Building3DViewPage's header
// comment) since this app has no such data.
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { BuildingWing, BuildingFlat, BuildingShop } from '../../../types/index';
import { DrillLevel, UnitVM, UnitStatus, unitCounts } from './types';

const STATUS_COLOR: Record<UnitStatus, string> = {
  available: '#16a34a', // green
  booked: '#dc2626',    // red
  blocked: '#6b7280',   // gray
};
const SELECTED_COLOR = '#2563eb'; // blue
const FACADE_COLOR = '#e2e8f0';
const ROOF_COLOR = '#94a3b8';
const SHOPS_FACADE_COLOR = '#fde68a';
const SHOPS_ROOF_COLOR = '#d97706';

const flatStatus = (f: BuildingFlat): UnitStatus => {
  if (f.is_active === false) return 'blocked';
  if (f.booked_by_customer_id) return 'booked';
  return 'available';
};

// Green (all available) -> amber (mixed) -> red (all booked/blocked), for a
// whole floor's window row when only that floor's aggregate counts are
// known (building level — we haven't drawn individual flats yet).
function ratioColor(available: number, total: number): string {
  if (total === 0) return '#cbd5e1';
  const r = available / total;
  const c = new THREE.Color();
  if (r >= 0.999) c.set(STATUS_COLOR.available);
  else if (r <= 0.001) c.set(STATUS_COLOR.booked);
  else c.set('#f59e0b'); // amber — a mixed floor
  return `#${c.getHexString()}`;
}

export interface BuildingSceneHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

// Frames the camera for whatever level/count is showing — reruns whenever
// the level changes (drilling down/up) or the Reset View button bumps
// resetToken, snapping straight to that level's default framing instead of
// leaving the user's rotate/zoom/pan from the previous level in place.
// Also the one place that owns the live OrbitControls instance, mirrored
// out to controlsRef so BuildingScene's imperative zoomIn/zoomOut/resetView
// (used by the on-canvas +/-/Home buttons) can drive the same controls.
const CameraRig: React.FC<{ level: DrillLevel; itemCount: number; resetToken: number; controlsRef: React.MutableRefObject<any> }> = ({ level, itemCount, resetToken, controlsRef }) => {
  const { camera } = useThree();

  const frame = () => {
    const width = Math.max(6, itemCount * 2.4);
    let pos: [number, number, number];
    let target: [number, number, number];
    if (level === 'building') { pos = [width * 0.65, width * 0.55, width * 0.95]; target = [width * 0.32, width * 0.22, 0]; }
    else if (level === 'wing') { pos = [9, itemCount * 0.85 + 1, 13]; target = [0, itemCount * 0.45, 0]; }
    else { pos = [0, 2.2, Math.max(8, itemCount * 1.5)]; target = [0, 0.5, 0]; }
    camera.position.set(...pos);
    camera.lookAt(...target);
    if (controlsRef.current) { controlsRef.current.target.set(...target); controlsRef.current.update(); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(frame, [level, itemCount, resetToken, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan enableZoom enableRotate
      minDistance={3} maxDistance={90}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
};

const StatusLabel: React.FC<{ status: UnitStatus; selected: boolean }> = ({ status, selected }) => (
  <span
    style={{
      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, color: '#fff',
      background: selected ? SELECTED_COLOR : STATUS_COLOR[status], whiteSpace: 'nowrap',
    }}
  >
    {selected ? 'Selected' : status === 'available' ? 'Available' : status === 'booked' ? 'Booked' : 'Blocked'}
  </span>
);

// A row of small "window" rectangles across a face — used both for a whole
// tower (one row per floor, tinted by that floor's availability ratio) and
// for a single floor slab (one rectangle per real flat, its own status
// color). Purely geometric (no textures), so it stays crisp at any zoom.
const WindowRow: React.FC<{ y: number; width: number; depth: number; colors: string[] }> = ({ y, width, depth, colors }) => {
  const n = colors.length;
  if (n === 0) return null;
  const margin = width * 0.1;
  const usable = width - margin * 2;
  const winW = Math.min(0.5, usable / n * 0.7);
  const gap = usable / n;
  const startX = -width / 2 + margin + gap / 2;
  return (
    <group position={[0, y, 0]}>
      {colors.map((color, i) => (
        <mesh key={i} position={[startX + i * gap, 0, depth / 2 + 0.02]}>
          <boxGeometry args={[winW, 0.32, 0.04]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

// ── Level 1: Building — one tower per wing, plus a Shops block ──────────
const WingTower: React.FC<{
  wing: BuildingWing; index: number; floorAvailability: { available: number; total: number }[]; onSelect: () => void;
}> = ({ wing, index, floorAvailability, onSelect }) => {
  const floors = Math.max(1, wing.floors.length);
  const floorHeight = 0.95;
  const height = floors * floorHeight;
  const width = 2.2, depth = 2.2;
  const x = index * 3;
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, height / 2, 0]} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(); }} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={FACADE_COLOR} roughness={0.85} />
      </mesh>
      {/* Parapet/roof cap */}
      <mesh position={[0, height + 0.08, 0]}>
        <boxGeometry args={[width * 1.05, 0.16, depth * 1.05]} />
        <meshStandardMaterial color={ROOF_COLOR} roughness={0.7} />
      </mesh>
      {/* One window row per real floor, tinted by that floor's own
          available/total ratio — real data, aggregated since individual
          flats aren't drawn until the floor is actually selected. */}
      {wing.floors.map((f, i) => {
        const avail = floorAvailability[i] ?? { available: 0, total: 0 };
        const count = Math.max(3, Math.min(6, avail.total || 4));
        const colors = Array.from({ length: count }, () => ratioColor(avail.available, avail.total));
        return <WindowRow key={f.id} y={i * floorHeight + floorHeight / 2} width={width} depth={depth} colors={colors} />;
      })}
      <Html position={[0, height + 0.7, 0]} center distanceFactor={12}>
        <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0c4a6e', background: 'rgba(255,255,255,0.92)', padding: '2px 8px', borderRadius: 6 }}>
            {wing.name}
          </div>
          <div style={{ fontSize: 10, color: '#0369a1', background: 'rgba(255,255,255,0.85)', padding: '1px 6px', borderRadius: 4, marginTop: 2 }}>
            {floors} floor{floors !== 1 ? 's' : ''}
          </div>
        </div>
      </Html>
    </group>
  );
};

const ShopsBlock: React.FC<{ x: number; shops: BuildingShop[]; onSelect: () => void }> = ({ x, shops, onSelect }) => {
  const c = unitCounts(shops.map((s) => ({
    kind: 'shop' as const, id: s.id, no: s.shop_no, typeLabel: 'Shop', areaSqft: s.area_sqft,
    status: s.is_active === false ? 'blocked' as const : s.booked_by_customer_id ? 'booked' as const : 'available' as const,
    bookedByName: null, wingName: null, floorLabel: null,
  })));
  const width = 2.8, depth = 2.2, height = 1.1;
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, height / 2, 0]} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(); }} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={SHOPS_FACADE_COLOR} roughness={0.8} />
      </mesh>
      <mesh position={[0, height + 0.06, 0]}>
        <boxGeometry args={[width * 1.05, 0.12, depth * 1.05]} />
        <meshStandardMaterial color={SHOPS_ROOF_COLOR} roughness={0.7} />
      </mesh>
      <WindowRow y={height / 2} width={width} depth={depth} colors={shops.map((s) => STATUS_COLOR[
        s.is_active === false ? 'blocked' : s.booked_by_customer_id ? 'booked' : 'available'
      ])} />
      <Html position={[0, height + 0.6, 0]} center distanceFactor={12}>
        <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#78350f', background: 'rgba(255,255,255,0.92)', padding: '2px 8px', borderRadius: 6 }}>
            Shops
          </div>
          <div style={{ fontSize: 10, color: '#92400e', background: 'rgba(255,255,255,0.85)', padding: '1px 6px', borderRadius: 4, marginTop: 2 }}>
            {c.available}/{c.total} available
          </div>
        </div>
      </Html>
    </group>
  );
};

// ── Level 2: Wing — floors stacked as slabs, real per-flat window colors ──
const FloorSlab: React.FC<{
  label: string; index: number; flats: BuildingFlat[]; onSelect: () => void;
}> = ({ label, index, flats, onSelect }) => {
  const y = index * 0.95;
  const width = 5.5, depth = 3;
  const counts = unitCounts(flats.map((fl) => ({
    kind: 'flat' as const, id: fl.id, no: fl.flat_no, typeLabel: '', areaSqft: null,
    status: flatStatus(fl), bookedByName: null, wingName: null, floorLabel: null,
  })));
  return (
    <group position={[0, y, 0]}>
      <mesh onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(); }} castShadow receiveShadow>
        <boxGeometry args={[width, 0.72, depth]} />
        <meshStandardMaterial color={FACADE_COLOR} roughness={0.85} />
      </mesh>
      <WindowRow y={0.02} width={width} depth={depth} colors={flats.length ? flats.map((f) => STATUS_COLOR[flatStatus(f)]) : ['#cbd5e1']} />
      <Html position={[width / 2 + 0.9, 0, 0]} center distanceFactor={10}>
        <div style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0c4a6e', background: 'rgba(255,255,255,0.92)', padding: '2px 8px', borderRadius: 6 }}>
            {label}
          </div>
          <div style={{ fontSize: 9.5, color: '#0369a1', background: 'rgba(255,255,255,0.85)', padding: '1px 6px', borderRadius: 4, marginTop: 2 }}>
            {counts.available}/{counts.total} available
          </div>
        </div>
      </Html>
    </group>
  );
};

// ── Level 3: Floor / Shops — a row (wrapping into a grid) of units ───────
const UnitBox: React.FC<{ unit: UnitVM; index: number; selected: boolean; onSelect: () => void }> = ({ unit, index, selected, onSelect }) => {
  const perRow = 8;
  const col = index % perRow;
  const row = Math.floor(index / perRow);
  const x = col * 1.6;
  const z = row * 1.8;
  const color = selected ? SELECTED_COLOR : STATUS_COLOR[unit.status];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.4, 0]} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(); }} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.8, 1.2]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <Html position={[0, -0.15, 0]} center distanceFactor={8}>
        <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#111827', background: 'rgba(255,255,255,0.92)', padding: '1px 5px', borderRadius: 4 }}>
            {unit.no}
          </div>
          <div style={{ marginTop: 2 }}><StatusLabel status={unit.status} selected={selected} /></div>
        </div>
      </Html>
    </group>
  );
};

const SlowSpin: React.FC<{ children: React.ReactNode; spin: boolean }> = ({ children, spin }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (spin && ref.current) ref.current.rotation.y += delta * 0.1;
  });
  return <group ref={ref}>{children}</group>;
};

export interface BuildingSceneProps {
  level: DrillLevel;
  wings: BuildingWing[];
  shops: BuildingShop[];
  selectedWingId: string | null;
  units: UnitVM[];               // populated only for 'floor' | 'shops'
  selectedUnitId: string | null;
  resetToken: number;
  onSelectWing: (wingId: string) => void;
  onSelectShopsBlock: () => void;
  onSelectFloor: (floorLabel: string) => void;
  onSelectUnit: (unit: UnitVM) => void;
}

const BuildingScene = forwardRef<BuildingSceneHandle, BuildingSceneProps>(({
  level, wings, shops, selectedWingId, units, selectedUnitId,
  resetToken, onSelectWing, onSelectShopsBlock, onSelectFloor, onSelectUnit,
}, ref) => {
  const selectedWing = useMemo(() => wings.find((w) => w.id === selectedWingId) || null, [wings, selectedWingId]);
  const itemCount = level === 'building' ? wings.length + (shops.length > 0 ? 1 : 0)
    : level === 'wing' ? (selectedWing?.floors.length ?? 1)
    : Math.max(1, units.length);

  const controlsRef = useRef<any>(null);
  const [zoomToken, setZoomToken] = React.useState(0);

  useImperativeHandle(ref, () => ({
    zoomIn: () => setZoomToken((n) => n + 1),
    zoomOut: () => setZoomToken((n) => n - 1),
    resetView: () => setZoomToken(0),
  }), []);

  // Applies queued zoomToken steps as an actual camera dolly — a separate
  // effect (not the imperative handlers above) since it needs the live
  // camera/controls instance, which only exists inside the Canvas.
  const ZoomBridge: React.FC = () => {
    const { camera } = useThree();
    const prevToken = useRef(0);
    useEffect(() => {
      const delta = zoomToken - prevToken.current;
      prevToken.current = zoomToken;
      if (delta === 0 || !controlsRef.current) return;
      const controls = controlsRef.current;
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
      const dist = dir.length();
      const scale = Math.pow(0.85, delta); // one step = ±15%
      const nextDist = THREE.MathUtils.clamp(dist * scale, controls.minDistance, controls.maxDistance);
      dir.setLength(nextDist);
      camera.position.copy(controls.target).add(dir);
      controls.update();
    }, [camera]);
    return null;
  };

  return (
    <Canvas shadows camera={{ fov: 45 }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[10, 16, 10]} intensity={1} castShadow />
      <hemisphereLight args={['#e0f2fe', '#f8fafc', 0.5]} />
      <CameraRig level={level} itemCount={itemCount} resetToken={resetToken} controlsRef={controlsRef} />
      <ZoomBridge />

      {level === 'building' && (
        <SlowSpin spin={wings.length > 1}>
          {wings.map((w, i) => (
            <WingTower
              key={w.id} wing={w} index={i}
              floorAvailability={w.floors.map((f) => {
                const c = unitCounts(f.flats.map((fl) => ({
                  kind: 'flat' as const, id: fl.id, no: fl.flat_no, typeLabel: '', areaSqft: null,
                  status: flatStatus(fl), bookedByName: null, wingName: null, floorLabel: null,
                })));
                return { available: c.available, total: c.total };
              })}
              onSelect={() => onSelectWing(w.id)}
            />
          ))}
          {shops.length > 0 && (
            <ShopsBlock x={wings.length * 3} shops={shops} onSelect={onSelectShopsBlock} />
          )}
        </SlowSpin>
      )}

      {level === 'wing' && selectedWing && (
        <group position={[-2.75, 0, 0]}>
          {selectedWing.floors.map((f, i) => (
            <FloorSlab key={f.id} label={f.label} index={i} flats={f.flats} onSelect={() => onSelectFloor(f.label)} />
          ))}
        </group>
      )}

      {(level === 'floor' || level === 'shops') && (
        <group position={[-((Math.min(units.length, 8) - 1) * 1.6) / 2, 0, -2]}>
          {units.map((u, i) => (
            <UnitBox key={u.id} unit={u} index={i} selected={u.id === selectedUnitId} onSelect={() => onSelectUnit(u)} />
          ))}
        </group>
      )}

      {/* Ground plane — purely a visual anchor so the scene doesn't float in a void. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#e5e7eb" transparent opacity={0.4} />
      </mesh>
    </Canvas>
  );
});
BuildingScene.displayName = 'BuildingScene';

export default BuildingScene;
