// ORBIT DEPENDENCY PROPAGATION — deterministic, pure.
//
// Reads the terrestrial snapshot and answers the only question that matters
// here: which ground-dependent services survive, and at what cost.
//
//   terrestrial route failure
//     -> ground segment isolated   (station has no healthy terrestrial path)
//       -> telemetry delivery degraded / command path delayed
//         -> timing + downstream dissemination degraded
//
// The spacecraft is never modelled as failed. Autonomous operation is
// reported explicitly so the UI cannot imply otherwise.
//
// Determinism: no randomness, no time input. Same snapshot ⇒ same state, so
// scrubbing and replay reproduce the orbital layer exactly.

import type {
  OrbitClassStage,
  OrbitClassState,
  OrbitStageId,
  OrbitStageState,
  OrbitState,
  SimEdge,
  Snapshot,
  StationState,
} from './types';
import { ORBIT_CLASSES, ORBIT_STATIONS, type OrbitClassDef } from '../data/orbit';

const STATE_RANK: Record<OrbitStageState, number> = {
  nominal: 0,
  strained: 1,
  delayed: 1,
  unreachable: 2,
};

/** A station is usable only while the mesh still reaches it. */
function stationState(
  nodeId: string,
  incident: Map<string, SimEdge[]>,
  snapshot: Snapshot,
): StationState {
  const status = snapshot.nodes[nodeId];
  if (!status || status === 'failed' || status === 'isolated') return 'unreachable';
  const edges = incident.get(nodeId) ?? [];
  let healthy = 0;
  let marginal = 0;
  for (const e of edges) {
    const rt = snapshot.edges[e.id];
    if (!rt || rt.status === 'failed') continue;
    if (rt.status === 'healthy') healthy++;
    else marginal++;
  }
  if (healthy > 0) return 'nominal';
  if (marginal > 0) return 'strained';
  return 'unreachable';
}

/**
 * Per-stage health with the real asymmetry between up- and down-links:
 * command can often route around a lost site (any one station is enough),
 * while telemetry delivery and dissemination degrade with every site lost.
 */
function stageState(
  stage: OrbitStageId,
  ok: number,
  marginal: number,
  total: number,
): OrbitStageState {
  const usable = ok + marginal * 0.5;
  if (total === 0) return 'unreachable';
  if (stage === 'command') return usable >= 1 ? 'nominal' : 'unreachable';
  if (stage === 'telemetry' || stage === 'dissemination') {
    if (ok === total && total > 0) return 'nominal';
    return usable > 0 ? 'delayed' : 'unreachable';
  }
  // ground-segment, timing: proportional, with marginal stations counted half
  if (ok === total) return 'nominal';
  return usable > 0 ? 'strained' : 'unreachable';
}

function classStage(
  stage: OrbitStageId,
  ok: number,
  marginal: number,
  total: number,
): OrbitClassStage {
  return {
    stage,
    state: stageState(stage, ok, marginal, total),
    health: total === 0 ? 0 : Math.max(0, Math.min(1, (ok + marginal * 0.5) / total)),
  };
}

/** Full orbital/ground dependency state for a given terrestrial snapshot. */
export function orbitState(edges: SimEdge[], snapshot: Snapshot): OrbitState {
  const incident = new Map<string, SimEdge[]>();
  const push = (id: string, e: SimEdge) => {
    const list = incident.get(id);
    if (list) list.push(e);
    else incident.set(id, [e]);
  };
  for (const e of edges) {
    push(e.from, e);
    push(e.to, e);
  }

  // Every ground station gets a state, including two classes that share a
  // terrestrial node (two facilities in one modelled city) — keying by node
  // alone would silently drop one of them.
  const nodeStateCache = new Map<string, StationState>();
  const stationStates: Record<string, StationState> = {};
  for (const station of ORBIT_STATIONS) {
    const cached = nodeStateCache.get(station.nodeId);
    const st = cached ?? stationState(station.nodeId, incident, snapshot);
    nodeStateCache.set(station.nodeId, st);
    stationStates[station.id] = st;
  }

  const classes: OrbitClassState[] = ORBIT_CLASSES.map((def: OrbitClassDef) => {
    const total = def.stations.length;
    let ok = 0;
    let marginal = 0;
    for (const s of def.stations) {
      const st = stationStates[s.id];
      if (st === 'nominal') ok++;
      else if (st === 'strained') marginal++;
    }
    const stages = def.stages.map((st) => classStage(st, ok, marginal, total));
    let worst: OrbitStageState = 'nominal';
    for (const s of stages) {
      if (STATE_RANK[s.state] > STATE_RANK[worst]) worst = s.state;
    }
    return {
      classId: def.id,
      reachableStations: total === 0 ? 0 : (ok + marginal) / total,
      totalStations: total,
      // The spacecraft itself is never taken offline by a terrestrial event.
      autonomous: true,
      stages,
      worst,
      note: def.service,
    };
  });

  const orbital = classes.filter((c) => c.classId !== 'ground');
  const mean = (vals: number[]) => (vals.length === 0 ? 1 : vals.reduce((s, v) => s + v, 0) / vals.length);
  const control = classes.find((c) => c.classId === 'ground');

  return {
    classes,
    orbitHealth: mean(
      orbital.map((c) => mean(c.stages.map((s) => s.health))),
    ),
    controlHealth: control ? control.reachableStations : 1,
    reachableStations: Object.values(stationStates).filter((s) => s !== 'unreachable').length,
    totalStations: Object.keys(stationStates).length,
    stationStates,
  };
}