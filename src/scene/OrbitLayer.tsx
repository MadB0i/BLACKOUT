// ORBITAL LAYER — synthetic ground-segment / orbital dependency view.
//
// Restraint is the design brief: a handful of thin tracks, a few sparse
// markers per class, ground-station markers only where they exist, and
// ground-to-orbit links that vanish as terrestrial reachability drops.
// No constellations, no clutter, no sci-fi. The globe stays readable.

import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ORBITAL_CLASSES, ORBIT_STATIONS, type OrbitClassDef } from '../data/orbit';
import { nodeById } from '../data/topology';
import { GLOBE_R, latLonToVec3 } from './geo';
import type { OrbitClassState, OrbitState, StationState } from '../core/types';

const TRACK_SEGS = 128;
/** Globe radii per altitude band — visual separation, not physical scale. */
const ALT_BAND: Record<number, number> = { 550: 1.075, 705: 1.13, 830: 1.17, 20200: 1.22 };

const COLOR_TRACK = '#3a5567';
const COLOR_NOMINAL = '#79a9b3';
const COLOR_STRAINED = '#e8a33d';
const COLOR_UNREACHABLE = '#c1362f';

const STATION_COLOR: Record<StationState, string> = {
  nominal: COLOR_NOMINAL,
  strained: COLOR_STRAINED,
  unreachable: COLOR_UNREACHABLE,
};

function radiusOf(def: OrbitClassDef): number {
  return ALT_BAND[def.altitudeKm] ?? 1.1;
}

function tiltQuat(def: OrbitClassDef): THREE.Quaternion {
  return new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (def.inclinationDeg * Math.PI) / 180,
  );
}

/** Position along an inclined circular track at phase fraction p (0..1). */
function trackPosition(def: OrbitClassDef, p: number, out: THREE.Vector3): THREE.Vector3 {
  const r = radiusOf(def);
  const a = p * Math.PI * 2 + def.phaseRad;
  return out.set(r * Math.cos(a), 0, r * Math.sin(a)).applyQuaternion(tiltQuat(def));
}

const trackGeomCache = new Map<string, THREE.BufferGeometry>();
function trackGeometry(def: OrbitClassDef): THREE.BufferGeometry {
  let g = trackGeomCache.get(def.id);
  if (!g) {
    const arr = new Float32Array((TRACK_SEGS + 1) * 3);
    for (let i = 0; i <= TRACK_SEGS; i++) {
      const v = trackPosition(def, i / TRACK_SEGS, new THREE.Vector3());
      arr.set([v.x, v.y, v.z], i * 3);
    }
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    trackGeomCache.set(def.id, g);
  }
  return g;
}

/** Imperative THREE.Line avoids the JSX `<line>`/SVG intrinsic collision. */
function useTrackLine(def: OrbitClassDef): THREE.Line {
  const line = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: COLOR_TRACK,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    return new THREE.Line(trackGeometry(def), mat);
  }, [def]);
  return line;
}

const markerGeom = new THREE.OctahedronGeometry(0.0105);

/** Sparse marker + its ground link, built imperatively to avoid per-frame JSX churn. */
class OrbitMarker {
  readonly mesh: THREE.Mesh;
  readonly link: THREE.Line | null;
  readonly phase: number;

  constructor(
    def: OrbitClassDef,
    index: number,
    station: { lat: number; lon: number } | null,
    color: string,
    projected: boolean,
  ) {
    this.phase = index / def.markers;
    this.mesh = new THREE.Mesh(markerGeom, new THREE.MeshBasicMaterial({ color, toneMapped: false, wireframe: projected, transparent: true, opacity: projected ? 0.65 : 1 }));
    if (!station) {
      this.link = null;
      return;
    }
    const geom = new THREE.BufferGeometry();
    // Two points: moving marker at index 0, ground station at index 3.
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.link = new THREE.Line(
      geom,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: projected ? 0.24 : 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const p = latLonToVec3(station.lat, station.lon, GLOBE_R * 1.005);
    const arr = geom.attributes.position.array as Float32Array;
    arr.set([p.x, p.y, p.z], 3);
  }

  /** @param t monotonic seconds; advancing it moves the marker along the track. */
  update(def: OrbitClassDef, t: number): void {
    const p = ((this.phase + t) % 1 + 1) % 1;
    trackPosition(def, p, this.mesh.position);
    if (!this.link) return;
    const attr = this.link.geometry.attributes.position as THREE.BufferAttribute;
    (attr.array as Float32Array).set([this.mesh.position.x, this.mesh.position.y, this.mesh.position.z], 0);
    attr.needsUpdate = true;
  }

  /** Links own per-instance GPU buffers; the shared marker/track geoms do not. */
  dispose(): void {
    (this.mesh.material as THREE.Material).dispose();
    this.link?.geometry.dispose();
    (this.link?.material as THREE.Material | undefined)?.dispose();
  }
}

/** One class: thin track, a few markers, and the links that still have a ground end. */
function OrbitClassTrack({
  def,
  state,
  stationStates,
  reducedMotion,
  projected,
}: {
  def: OrbitClassDef;
  state: OrbitClassState;
  stationStates: OrbitState['stationStates'];
  reducedMotion: boolean;
  projected: boolean;
}) {
  const color =
    state.worst === 'nominal' ? COLOR_NOMINAL : projected ? COLOR_STRAINED : state.worst === 'unreachable' ? COLOR_UNREACHABLE : COLOR_STRAINED;

  // Link each marker to a ground station that can still reach it. Rebuilt only
  // when the reachable set changes, not on every snapshot tick.
  const reachableIds = def.stations
    .filter((s) => stationStates[s.id] !== 'unreachable' && nodeById(s.nodeId))
    .map((s) => s.nodeId)
    .join('|');
  const markers = useMemo(
    () =>
      Array.from({ length: def.markers }, (_, i) => {
        const ids = reachableIds === '' ? [] : reachableIds.split('|');
        const node = nodeById(ids[i % Math.max(1, ids.length)] ?? '');
        return new OrbitMarker(def, i, node ? { lat: node.lat, lon: node.lon } : null, color, projected);
      }),
    [def, reachableIds, color, projected],
  );
  // Markers rebuild whenever the reachable station set or class state changes;
  // release the previous set's per-link GPU buffers so a long chaos run does
  // not accumulate them.
  useEffect(() => () => markers.forEach((m) => m.dispose()), [markers]);

  useFrame(({ clock }) => {
    // Orbital progression: slow and deterministic. Frozen in reduced motion.
    const t = reducedMotion ? 0 : clock.elapsedTime * 0.006;
    for (const m of markers) m.update(def, t);
  });

  const showLabel = state.worst !== 'nominal';
  const track = useTrackLine(def);
  return (
    <group>
      <primitive object={track} />
      {markers.map((m, i) => (
        <group key={i}>
          <primitive object={m.mesh} />
          {m.link && <primitive object={m.link} />}
        </group>
      ))}
      {showLabel && <OrbitLabel def={def} state={state} projected={projected} />}
    </group>
  );
}

/** Selective label: only for classes the terrestrial event actually degraded. */
function OrbitLabel({ def, state, projected }: { def: OrbitClassDef; state: OrbitClassState; projected: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const point = useMemo(() => trackPosition(def, 0.5, new THREE.Vector3()), [def]);
  const dir = useMemo(() => point.clone().normalize(), [point]);

  useFrame(() => {
    if (ref.current) ref.current.visible = dir.dot(camera.position.clone().normalize()) > -0.15;
  });

  return (
    <group position={point}>
      <group ref={ref}>
        <Html center distanceFactor={1.3} zIndexRange={[12, 0]} className="bo-tip" wrapperClass="bo-tip-wrap">
          <div className={`bo-tip-inner bo-tip-orbit${projected ? ' is-projected' : ''}`}>
            <strong>{def.short}</strong>
            <span>
              {def.altitudeKm === 0 ? 'GROUND' : `${(def.altitudeKm / 1000).toFixed(0)}K km`} ·{' '}
              {projected ? 'PROJECTED · ' : ''}{state.worst.toUpperCase()}
            </span>
          </div>
        </Html>
      </group>
    </group>
  );
}

/** Ground-station markers — only in orbit views. */
function GroundStations({ orbit, projected }: { orbit: OrbitState; projected: boolean }) {
  return (
    <group>
      {ORBIT_STATIONS.map((s) => {
        const node = nodeById(s.nodeId);
        if (!node) return null;
        const st = orbit.stationStates[s.id] ?? 'nominal';
        const color = projected && st !== 'nominal' ? COLOR_STRAINED : STATION_COLOR[st];
        return (
          <group key={s.id} position={latLonToVec3(node.lat, node.lon, GLOBE_R * 1.008)}>
            <mesh>
              <ringGeometry args={[0.019, 0.023, 24]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={projected ? 0.5 : st === 'nominal' ? 0.85 : 1}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh>
              <circleGeometry args={[0.005, 10]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function OrbitLayer({
  orbit,
  reducedMotion,
  view,
  projected,
}: {
  orbit: OrbitState;
  reducedMotion: boolean;
  view: 'network' | 'orbit' | 'hybrid';
  projected: boolean;
}) {
  if (view === 'network') return null;
  return (
    <group name="orbit-layer">
      <GroundStations orbit={orbit} projected={projected} />
      {ORBITAL_CLASSES.map((def) => {
        const state = orbit.classes.find((c) => c.classId === def.id);
        if (!state) return null;
        return (
          <OrbitClassTrack
            key={`${def.id}-${state.worst}`}
            def={def}
            state={state}
            stationStates={orbit.stationStates}
            reducedMotion={reducedMotion}
            projected={projected}
          />
        );
      })}
    </group>
  );
}
