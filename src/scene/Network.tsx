// Network overlay: arcs, traffic pulses, node markers, shockwaves, picking.
// Visual grammar — thickness: capacity class · velocity: traffic movement
// brightness: utilisation · amber oscillation: strain · red break: failure
// teal: rerouted load · halo: selection · shock ring: event origin.

import { useMemo, useRef, useState } from 'react';
import { Html, Billboard } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { EDGES, NODES, edgeById, nodeById } from '../data/topology';
import type { Failure, Snapshot } from '../core/types';
import { useBlackout, type Layers } from '../state/store';
import { arcCurve, GLOBE_R, latLonToVec3 } from './geo';

export const C = {
  healthy: new THREE.Color('#5f7f8f'),
  healthyHi: new THREE.Color('#7fd4dc'),
  diverted: new THREE.Color('#3fd6b2'),
  strained: new THREE.Color('#e8a33d'),
  overloaded: new THREE.Color('#e8643d'),
  failed: new THREE.Color('#c1362f'),
  nodeWhite: new THREE.Color('#c9d5de'),
  nodeAmber: new THREE.Color('#e8a33d'),
  nodeRed: new THREE.Color('#e0574a'),
  nodeDim: new THREE.Color('#4a2b28'),
};

const ARC_SEGS = 56;

interface EdgeGeom {
  id: string;
  curve: THREE.QuadraticBezierCurve3;
  points: Float32Array;
  lineGeom: THREE.BufferGeometry;
  mid: THREE.Vector3;
}

const geomCache = new Map<string, EdgeGeom>();
function edgeGeom(id: string): EdgeGeom {
  let g = geomCache.get(id);
  if (!g) {
    const e = edgeById(id)!;
    const a = NODES.find((n) => n.id === e.from)!;
    const b = NODES.find((n) => n.id === e.to)!;
    const curve = arcCurve(
      latLonToVec3(a.lat, a.lon, GLOBE_R * 1.004),
      latLonToVec3(b.lat, b.lon, GLOBE_R * 1.004),
    );
    const pts = curve.getPoints(ARC_SEGS);
    const arr = new Float32Array((ARC_SEGS + 1) * 3);
    pts.forEach((p, i) => arr.set([p.x, p.y, p.z], i * 3));
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    g = { id, curve, points: arr, lineGeom, mid: curve.getPoint(0.5) };
    geomCache.set(id, g);
  }
  return g;
}

function layerOf(kind: string, layers: Layers): boolean {
  if (kind === 'submarine') return layers.submarine;
  if (kind === 'terrestrial') return layers.terrestrial;
  if (kind === 'cloud') return layers.cloud;
  return layers.dns;
}

export interface SelectionRef {
  kind: 'edge' | 'node';
  id: string;
}

interface Props {
  snapshot: Snapshot;
  failures: Failure[];
  layers: Layers;
  selection: SelectionRef | null;
  reducedMotion: boolean;
  onSelect: (s: SelectionRef | null) => void;
  onHoverEdge: (id: string | null) => void;
  hoverEdge: string | null;
}

export function Network(props: Props) {
  return (
    <group>
      <Arcs {...props} />
      <Pulses {...props} />
      <NodeMarkers {...props} />
      <ShockFieldLive failures={props.failures} reducedMotion={props.reducedMotion} />
    </group>
  );
}

function arcStyle(edgeId: string, snapshot: Snapshot, hovered: boolean, selected: boolean) {
  const rt = snapshot.edges[edgeId];
  if (!rt || rt.status === 'failed')
    return { color: C.failed, opacity: selected || hovered ? 0.95 : 0.5 };
  if (rt.status === 'overloaded') return { color: C.overloaded, opacity: 0.95 };
  if (rt.status === 'strained')
    return { color: C.strained, opacity: selected || hovered ? 1 : 0.9 };
  if (rt.diverted > 0.5) return { color: C.diverted, opacity: selected || hovered ? 1 : 0.85 };
  return { color: hovered || selected ? C.healthyHi : C.healthy, opacity: hovered || selected ? 0.9 : 0.42 };
}

function Arcs({ snapshot, layers, selection, reducedMotion, onSelect, onHoverEdge, hoverEdge }: Props) {
  void reducedMotion;
  const visible = useMemo(() => EDGES.filter((e) => layerOf(e.kind, layers)), [layers]);
  return (
    <group>
      {visible.map((e) => (
        <ArcLine
          key={e.id}
          edgeId={e.id}
          snapshot={snapshot}
          selected={selection?.kind === 'edge' && selection.id === e.id}
          hovered={hoverEdge === e.id}
          onSelect={onSelect}
          onHoverEdge={onHoverEdge}
        />
      ))}
    </group>
  );
}

/** Imperative THREE.Line: avoids the JSX `<line>`/SVG intrinsic collision. */
function ArcLine({
  edgeId,
  snapshot,
  selected,
  hovered,
  onSelect,
  onHoverEdge,
}: {
  edgeId: string;
  snapshot: Snapshot;
  selected: boolean;
  hovered: boolean;
  onSelect: (s: SelectionRef | null) => void;
  onHoverEdge: (id: string | null) => void;
}) {
  const g = edgeGeom(edgeId);
  const line = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const obj = new THREE.Line(g.lineGeom, mat);
    return obj;
  }, [g]);

  const st = arcStyle(edgeId, snapshot, hovered, selected);
  const failed = snapshot.edges[edgeId]?.status === 'failed';
  line.material.color.copy(st.color);
  line.material.opacity = failed ? st.opacity * 0.55 : st.opacity;

  return (
    <primitive
      object={line}
      onClick={(ev: ThreeEvent<MouseEvent>) => {
        ev.stopPropagation();
        onSelect({ kind: 'edge', id: edgeId });
      }}
      onPointerOver={(ev: ThreeEvent<PointerEvent>) => {
        ev.stopPropagation();
        onHoverEdge(edgeId);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onHoverEdge(null);
        document.body.style.cursor = 'auto';
      }}
    />
  );
}

interface Pulse {
  edgeId: string;
  curve: THREE.QuadraticBezierCurve3;
  speed: number;
  offset: number;
}

function Pulses({ snapshot, layers, reducedMotion }: Props) {
  const ref = useRef<THREE.Points>(null!);
  const pulses = useMemo<Pulse[]>(() => {
    const list: Pulse[] = [];
    for (const e of EDGES) {
      if (!layerOf(e.kind, layers)) continue;
      const count = e.capacity >= 90 ? 3 : e.capacity >= 50 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        list.push({
          edgeId: e.id,
          curve: edgeGeom(e.id).curve,
          speed: 0.1 + (e.demand / e.capacity) * 0.22,
          offset: i / count,
        });
      }
    }
    return list;
  }, [layers]);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(pulses.length * 3);
    const colors = new Float32Array(pulses.length * 3);
    return { positions, colors };
  }, [pulses]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  // refresh pulse colours when the sim state changes (<=10Hz from clock throttle)
  useMemo(() => {
    const col = new THREE.Color();
    pulses.forEach((p, i) => {
      const rt = snapshot.edges[p.edgeId];
      if (!rt || rt.status === 'failed') col.copy(C.failed).multiplyScalar(0.0);
      else if (rt.status === 'overloaded') col.copy(C.overloaded);
      else if (rt.status === 'strained') col.copy(C.strained);
      else if (rt.diverted > 0.5) col.copy(C.diverted);
      else col.copy(C.healthyHi).multiplyScalar(0.85);
      colors.set([col.r, col.g, col.b], i * 3);
    });
    geom.attributes.color.needsUpdate = true;
  }, [snapshot, pulses, colors, geom]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    pulses.forEach((p, i) => {
      const rt = snapshot.edges[p.edgeId];
      if (!rt || rt.status === 'failed') {
        v.set(0, 0, 0);
      } else {
        const k = reducedMotion ? 0 : 1;
        const f = (p.offset + t * p.speed * k) % 1;
        p.curve.getPoint(f, v);
      }
      posAttr.setXYZ(i, v.x, v.y, v.z);
    });
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial
        size={0.013}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const nodeGeoms: Record<string, THREE.BufferGeometry> = {
  hub: new THREE.OctahedronGeometry(0.0105),
  ixp: new THREE.BoxGeometry(0.014, 0.014, 0.014),
  landing: new THREE.SphereGeometry(0.0085, 12, 12),
  cloud: new THREE.IcosahedronGeometry(0.012, 0),
  dns: new THREE.TorusGeometry(0.009, 0.0032, 8, 20),
};

function NodeMarkers({ snapshot, selection, onSelect }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <group>
      {NODES.map((n) => {
        const pos = latLonToVec3(n.lat, n.lon, GLOBE_R * 1.006);
        const st = snapshot.nodes[n.id] ?? 'healthy';
        const sel = selection?.kind === 'node' && selection.id === n.id;
        const hov = hover === n.id;
        const color =
          st === 'failed' ? C.nodeRed : st === 'isolated' ? C.nodeDim : st === 'degraded' ? C.nodeAmber : C.nodeWhite;
        return (
          <group key={n.id} position={pos}>
            <mesh
              geometry={nodeGeoms[n.kind]}
              scale={sel || hov ? 1.7 : 1}
              onClick={(ev: ThreeEvent<MouseEvent>) => {
                ev.stopPropagation();
                onSelect({ kind: 'node', id: n.id });
              }}
              onPointerOver={(ev: ThreeEvent<PointerEvent>) => {
                ev.stopPropagation();
                setHover(n.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHover(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            {/* invisible fat hit-target for touch */}
            <mesh
              onClick={(ev: ThreeEvent<MouseEvent>) => {
                ev.stopPropagation();
                onSelect({ kind: 'node', id: n.id });
              }}
            >
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {sel && (
              <Billboard>
                <mesh>
                  <ringGeometry args={[0.032, 0.036, 40]} />
                  <meshBasicMaterial color="#7fd4dc" transparent opacity={0.95} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
              </Billboard>
            )}
            {(hov || sel) && <NodeTip nodeId={n.id} />}
          </group>
        );
      })}
    </group>
  );
}

function NodeTip({ nodeId }: { nodeId: string }) {
  const n = nodeById(nodeId)!;
  return (
    <Html center distanceFactor={2.6} zIndexRange={[20, 0]} className="bo-tip" wrapperClass="bo-tip-wrap">
      <div className="bo-tip-inner">
        <strong>{n.label}</strong>
        <span>
          {n.kind.toUpperCase()} · {n.region}
        </span>
      </div>
    </Html>
  );
}

/** Subscribes to the live clock itself so the scene above can render at 1Hz. */
function ShockFieldLive({ failures, reducedMotion }: { failures: Failure[]; reducedMotion: boolean }) {
  const simT = useBlackout((s) => s.simT);
  return <ShockField failures={failures} simT={simT} reducedMotion={reducedMotion} />;
}
function ShockField({
  failures,
  simT,
  reducedMotion,
}: {
  failures: Failure[];
  simT: number;
  reducedMotion: boolean;
}) {
  const shocks = useMemo(
    () =>
      failures
        .filter((f) => (f.kind === 'edge' || f.kind === 'node') && f.at <= simT && simT - f.at < 5)
        .slice(-6)
        .map((f, i) => ({ f, key: `${f.kind}:${f.id}:${f.at}:${i}` })),
    [failures, simT],
  );
  return (
    <group>
      {shocks.map(({ f, key }) => (
        <ShockRing key={key} failure={f} age={simT - f.at} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}

function ShockRing({ failure, age, reducedMotion }: { failure: Failure; age: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const center = useMemo(() => {
    if (failure.kind === 'node') {
      const n = nodeById(failure.id);
      return n ? latLonToVec3(n.lat, n.lon, GLOBE_R * 1.01) : new THREE.Vector3();
    }
    try {
      return edgeGeom(failure.id).mid.clone().setLength(GLOBE_R * 1.02);
    } catch {
      return new THREE.Vector3();
    }
  }, [failure]);
  const quat = useMemo(() => {
    const m = new THREE.Mesh();
    m.position.copy(center);
    m.lookAt(center.clone().multiplyScalar(2));
    return m.quaternion.clone();
  }, [center]);

  useFrame(() => {
    const k = Math.min(1, Math.max(0, age / 2.4));
    const s = reducedMotion ? 2.2 : 1 + k * 3.4;
    ref.current.scale.setScalar(s);
    mat.current.opacity = reducedMotion ? 0.4 : 0.9 * (1 - k);
  });

  return (
    <mesh ref={ref} position={center} quaternion={quat}>
      <ringGeometry args={[0.03, 0.034, 48]} />
      <meshBasicMaterial
        ref={mat}
        color="#e0574a"
        transparent
        opacity={0.9}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
