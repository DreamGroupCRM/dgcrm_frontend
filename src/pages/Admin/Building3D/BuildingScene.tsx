// ==========================================
// DREAM GROUP CRM - 3D BUILDING VIEW: THREE.JS SCENE
// ==========================================
// Pure presentation — every mesh here is generated straight from the
// Building Master hierarchy (Building3DViewPage does the data work); this
// file only knows how to draw a wing tower, a floor slab, or a row of
// units and report clicks back up. No fetching, no business rules.
import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { BuildingWing, BuildingShop } from '../../../types/index';
import { DrillLevel, UnitVM, UnitStatus } from './types';

const STATUS_COLOR: Record<UnitStatus, string> = {
  available: '#16a34a', // green
  booked: '#dc2626',    // red
  blocked: '#6b7280',   // gray
};
const SELECTED_COLOR = '#2563eb'; // blue
const WING_COLOR = '#0ea5e9';
const SHOPS_BLOCK_COLOR = '#d97706';

// Frames the camera for whatever level/count is showing — reruns whenever
// the level changes (drilling down/up) or the Reset View button bumps
// resetToken, snapping straight to that level's default framing instead of
// leaving the user's rotate/zoom/pan from the previous level in place.
const CameraRig: React.FC<{ level: DrillLevel; itemCount: number; resetToken: number }> = ({ level, itemCount, resetToken }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const width = Math.max(6, itemCount * 2.2);
    let pos: [number, number, number];
    let target: [number, number, number];
    if (level === 'building') { pos = [width * 0.6, width * 0.5, width * 0.9]; target = [width * 0.3, width * 0.25, 0]; }
    else if (level === 'wing') { pos = [8, itemCount * 0.9, 12]; target = [0, itemCount * 0.45, 0]; }
    else { pos = [0, 2, Math.max(8, itemCount * 1.6)]; target = [0, 0.5, 0]; }

    camera.position.set(...pos);
    camera.lookAt(...target);
    if (controlsRef.current) {
      controlsRef.current.target.set(...target);
      controlsRef.current.update();
    }
  }, [level, itemCount, resetToken, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan enableZoom enableRotate
      minDistance={3} maxDistance={80}
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

// ── Level 1: Building — one tower per wing, plus a Shops block ──────────
const WingTower: React.FC<{
  wing: BuildingWing; index: number; onSelect: () => void;
}> = ({ wing, index, onSelect }) => {
  const floors = Math.max(1, wing.floors.length);
  const height = floors * 0.9;
  const x = index * 2.6;
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, height / 2, 0]} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(); }}>
        <boxGeometry args={[2, height, 2]} />
        <meshStandardMaterial color={WING_COLOR} />
      </mesh>
      <Html position={[0, height + 0.5, 0]} center distanceFactor={12}>
        <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0c4a6e', background: 'rgba(255,255,255,0.9)', padding: '2px 8px', borderRadius: 6 }}>
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

const ShopsBlock: React.FC<{ x: number; count: number; onSelect: () => void }> = ({ x, count, onSelect }) => (
  <group position={[x, 0, 0]}>
    <mesh position={[0, 0.5, 0]} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(); }}>
      <boxGeometry args={[2.4, 1, 2]} />
      <meshStandardMaterial color={SHOPS_BLOCK_COLOR} />
    </mesh>
    <Html position={[0, 1.5, 0]} center distanceFactor={12}>
      <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#78350f', background: 'rgba(255,255,255,0.9)', padding: '2px 8px', borderRadius: 6 }}>
          Shops
        </div>
        <div style={{ fontSize: 10, color: '#92400e', background: 'rgba(255,255,255,0.85)', padding: '1px 6px', borderRadius: 4, marginTop: 2 }}>
          {count} unit{count !== 1 ? 's' : ''}
        </div>
      </div>
    </Html>
  </group>
);

// ── Level 2: Wing — floors stacked as slabs ──────────────────────────────
const FloorSlab: React.FC<{
  label: string; index: number; unitSummary: string; onSelect: () => void;
}> = ({ label, index, unitSummary, onSelect }) => {
  const y = index * 0.9;
  return (
    <group position={[0, y, 0]}>
      <mesh onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(); }}>
        <boxGeometry args={[5, 0.7, 3]} />
        <meshStandardMaterial color={WING_COLOR} />
      </mesh>
      <Html position={[3.2, 0, 0]} center distanceFactor={10}>
        <div style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0c4a6e', background: 'rgba(255,255,255,0.92)', padding: '2px 8px', borderRadius: 6 }}>
            {label}
          </div>
          <div style={{ fontSize: 9.5, color: '#0369a1', background: 'rgba(255,255,255,0.85)', padding: '1px 6px', borderRadius: 4, marginTop: 2 }}>
            {unitSummary}
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
      <mesh position={[0, 0.4, 0]} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(); }}>
        <boxGeometry args={[1.2, 0.8, 1.2]} />
        <meshStandardMaterial color={color} />
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
    if (spin && ref.current) ref.current.rotation.y += delta * 0.12;
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
  floorUnitSummaries: Record<string, string>; // floorId -> "3/5 available"
  resetToken: number;
  onSelectWing: (wingId: string) => void;
  onSelectShopsBlock: () => void;
  onSelectFloor: (floorLabel: string) => void;
  onSelectUnit: (unit: UnitVM) => void;
}

const BuildingScene: React.FC<BuildingSceneProps> = ({
  level, wings, shops, selectedWingId, units, selectedUnitId,
  floorUnitSummaries, resetToken, onSelectWing, onSelectShopsBlock, onSelectFloor, onSelectUnit,
}) => {
  const selectedWing = useMemo(() => wings.find((w) => w.id === selectedWingId) || null, [wings, selectedWingId]);
  const itemCount = level === 'building' ? wings.length + (shops.length > 0 ? 1 : 0)
    : level === 'wing' ? (selectedWing?.floors.length ?? 1)
    : Math.max(1, units.length);

  return (
    <Canvas shadows camera={{ fov: 45 }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 15, 10]} intensity={0.9} castShadow />
      <CameraRig level={level} itemCount={itemCount} resetToken={resetToken} />

      {level === 'building' && (
        <SlowSpin spin={wings.length > 1}>
          {wings.map((w, i) => (
            <WingTower key={w.id} wing={w} index={i} onSelect={() => onSelectWing(w.id)} />
          ))}
          {shops.length > 0 && (
            <ShopsBlock x={wings.length * 2.6} count={shops.length} onSelect={onSelectShopsBlock} />
          )}
        </SlowSpin>
      )}

      {level === 'wing' && selectedWing && (
        <group position={[-2.5, 0, 0]}>
          {selectedWing.floors.map((f, i) => (
            <FloorSlab
              key={f.id} label={f.label} index={i}
              unitSummary={floorUnitSummaries[f.id] || `${f.flats.length} flat${f.flats.length !== 1 ? 's' : ''}`}
              onSelect={() => onSelectFloor(f.label)}
            />
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
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#e5e7eb" transparent opacity={0.35} />
      </mesh>
    </Canvas>
  );
};

export default BuildingScene;
