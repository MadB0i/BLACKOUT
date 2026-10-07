// Deterministic educational failure simulation.
// Model: fixed demand per edge; a failed edge's demand reroutes over up to two
// shortest healthy alternate paths (60/40 split). Utilisation thresholds mark
// strain (>=0.8) and overload (>1.0). Overloaded edges fail in cascade rounds.
// Snapshots are pure functions of (topology, failures, seed) so replays,
// scrubbing and share URLs reproduce exactly.

import { alternatePaths, reachableComponent } from './graph';
import type {
  Failure,
  Metrics,
  RegionCode,
  RegionImpact,
  Severity,
  SimEdge,
  SimEvent,
  SimNode,
  Snapshot,
} from './types';

export const STRAIN_AT = 0.8;
export const OVERLOAD_ABOVE = 1.0;
/** Protection trips only with real margin breach; at most two per round, worst first. */
export const TRIP_ABOVE = 1.2;
/** Above this utilisation there is no headroom left: excess demand is shed (lost), not stacked. */
export const SHED_AT = 1.5;
const MAX_TRIPS_PER_ROUND = 1;
const MAX_CASCADE_ROUNDS = 6;
/** ECMP-style spread across up to three diverse alternates. */
const ALT_SPLIT = [0.4, 0.35, 0.25];

function ev(t: number, type: string, message: string, severity: Severity, refId?: string): SimEvent {
  return { t, type, message, severity, refId };
}

export interface RunOptions {
  cascade?: boolean;
}

export function runSimulation(
  nodes: SimNode[],
  edges: SimEdge[],
  failures: Failure[],
  _opts: RunOptions = {},
): Snapshot {
  const cascade = _opts.cascade !== false;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edgeById = new Map(edges.map((e) => [e.id, e]));
  const ordered = [...failures].sort((a, b) => a.at - b.at);
  const events: SimEvent[] = [];

  const failedEdges = new Set<string>();
  const failedNodes = new Set<string>();
  const surgeBonus = new Map<string, number>();

  // cutoff: failures applied by caller (snapshotAt filters by time)
  for (const f of ordered) {
    if (f.kind === 'edge') {
      if (!edgeById.has(f.id)) {
        events.push(ev(f.at, 'INVALID', `Unknown route ${f.id} ignored (sanitised).`, 'warn', f.id));
        continue;
      }
      failedEdges.add(f.id);
      events.push(
        ev(f.at, 'ROUTE OFFLINE', `${edgeById.get(f.id)!.label} taken offline — ${f.cause}`, 'critical', f.id),
      );
    } else if (f.kind === 'node') {
      if (!nodeById.has(f.id)) {
        events.push(ev(f.at, 'INVALID', `Unknown node ${f.id} ignored (sanitised).`, 'warn', f.id));
        continue;
      }
      failedNodes.add(f.id);
      events.push(
        ev(f.at, 'NODE OFFLINE', `${nodeById.get(f.id)!.label} offline — ${f.cause}`, 'critical', f.id),
      );
    } else if (f.kind === 'surge') {
      surgeBonus.set(f.id, (surgeBonus.get(f.id) ?? 0) + (f.amount ?? 0));
      const e = edgeById.get(f.id);
      events.push(
        ev(
          f.at,
          'TRAFFIC SURGE',
          `${e ? e.label : f.id} hit by misdirected demand (+${f.amount ?? 0}u) — ${f.cause}`,
          'warn',
          f.id,
        ),
      );
    } else if (f.kind === 'recover-edge') {
      failedEdges.delete(f.id);
      events.push(
        ev(f.at, 'ROUTE RESTORED', `${edgeById.get(f.id)?.label ?? f.id} restored — ${f.cause}`, 'good', f.id),
      );
    } else if (f.kind === 'recover-node') {
      failedNodes.delete(f.id);
      events.push(
        ev(f.at, 'NODE RESTORED', `${nodeById.get(f.id)?.label ?? f.id} restored — ${f.cause}`, 'good', f.id),
      );
    }
  }

  // Edges incident to failed nodes lose all capacity.
  for (const e of edges) {
    if (failedNodes.has(e.from) || failedNodes.has(e.to)) failedEdges.add(e.id);
  }

  const diverted = new Map<string, number>();
  const unserved: { edgeId: string; amount: number }[] = [];
  const tCursor = ordered.length ? Math.max(...ordered.map((f) => f.at)) : 0;

  const baseOf = (e: SimEdge): number =>
    (failedEdges.has(e.id) ? 0 : e.demand) + (surgeBonus.get(e.id) ?? 0);
  const totalOf = (e: SimEdge): number => baseOf(e) + (diverted.get(e.id) ?? 0);

  const reroute = (edgeId: string, amount: number, cause: string, t: number, depth: number) => {
    if (amount <= 0) return;
    const e = edgeById.get(edgeId);
    if (!e) return;
    const alts = alternatePaths(edges, nodes, e.from, e.to, failedEdges, failedNodes);
    if (alts.length === 0) {
      unserved.push({ edgeId, amount });
      events.push(
        ev(t, 'DEMAND UNSERVED', `${e.label}: no surviving path — ${amount.toFixed(0)}u dropped (${cause})`, 'critical', edgeId),
      );
      return;
    }
    const shares = alts.length === 1 ? [1] : alts.length === 2 ? [0.6, 0.4] : ALT_SPLIT;
    let shed = 0;
    alts.forEach((p, i) => {
      const want = amount * (shares[i] ?? 0);
      // Path bottleneck: only place what the tightest link has room for.
      let room = Infinity;
      for (const id of p.edgeIds) {
        const link = edgeById.get(id)!;
        room = Math.min(room, SHED_AT * link.capacity - totalOf(link));
      }
      const placed = Math.max(0, Math.min(want, room));
      for (const id of p.edgeIds) diverted.set(id, (diverted.get(id) ?? 0) + placed);
      shed += want - placed;
    });
    if (shed > 0.5) unserved.push({ edgeId, amount: shed });
    const via = alts.map((p) => p.edgeIds.length + ' hops').join(' + ');
    events.push(
      ev(
        t,
        depth === 0 ? 'TRAFFIC SHIFT' : 'CASCADE SHIFT',
        `${e.label}: ${amount.toFixed(0)}u rerouted via ${via}` +
          (shed > 0.5 ? `, ${shed.toFixed(0)}u shed (no headroom)` : '') +
          ` (${cause})`,
        shed > 0.5 ? 'warn' : depth === 0 ? 'info' : 'warn',
        edgeId,
      ),
    );
  };

  // Initial reroute of directly failed edges + surges are folded into load.
  let t = tCursor + 1;
  for (const f of ordered) {
    if (f.kind === 'edge') {
      const e = edgeById.get(f.id)!;
      reroute(f.id, e.demand, 'protection switch', f.at + 1, 0);
    }
  }

  const loadOf = (e: SimEdge): number => totalOf(e);

  // Cascade loop.
  let cascadeRounds = 0;
  if (cascade) {
    for (let round = 1; round <= MAX_CASCADE_ROUNDS; round++) {
      const overloaded = edges.filter(
        (e) => !failedEdges.has(e.id) && loadOf(e) / e.capacity > TRIP_ABOVE,
      );
      if (overloaded.length === 0) break;
      cascadeRounds = round;
      t = tCursor + 1 + round;
      // Fail the worst first for deterministic ordering; protection is sequential.
      overloaded.sort((a, b) => loadOf(b) / b.capacity - loadOf(a) / a.capacity);
      const tripped = overloaded.slice(0, MAX_TRIPS_PER_ROUND);
      for (const e of tripped) {
        const carried = loadOf(e);
        failedEdges.add(e.id);
        events.push(
          ev(
            t,
            'OVERLOAD TRIP',
            `${e.label} tripped at ${((carried / e.capacity) * 100).toFixed(0)}% load — cascading failure (round ${round})`,
            'critical',
            e.id,
          ),
        );
      }
      t++;
      for (const e of tripped) {
        reroute(e.id, e.demand + (diverted.get(e.id) ?? 0), `cascade round ${round}`, t, round);
      }
    }
  }

  // Path recalculation + stabilisation markers.
  if (failedEdges.size > 0 || surgeBonus.size > 0) {
    events.push(ev(tCursor + 1, 'PATH RECALCULATION', 'Routing recomputed around failed capacity.', 'info'));
    events.push(
      ev(t + 1, 'ROUTE STABILIZED', cascadeRounds > 0 ? `Network settled after ${cascadeRounds} cascade round(s).` : 'Surviving paths stabilised at new utilisation.', 'good'),
    );
  }

  // Node states.
  const seedNode = nodes.find((n) => !failedNodes.has(n.id))?.id ?? nodes[0].id;
  const mainComponent = reachableComponent(edges, seedNode, failedEdges, failedNodes);
  const nodeStatus: Snapshot['nodes'] = {};
  for (const n of nodes) {
    if (failedNodes.has(n.id)) {
      nodeStatus[n.id] = 'failed';
      continue;
    }
    const incident = edges.filter(
      (e) => (e.from === n.id || e.to === n.id) && !failedEdges.has(e.id),
    );
    if (!mainComponent.has(n.id) || incident.length === 0) {
      nodeStatus[n.id] = 'isolated';
      if (!mainComponent.has(n.id)) {
        events.push(ev(t + 1, 'NODE ISOLATED', `${n.label} cut off from the surviving mesh.`, 'critical', n.id));
      }
    } else if (incident.some((e) => loadOf(e) / e.capacity > OVERLOAD_ABOVE)) {
      nodeStatus[n.id] = 'degraded';
    } else if (incident.some((e) => loadOf(e) / e.capacity >= STRAIN_AT)) {
      nodeStatus[n.id] = 'degraded';
      events.push(ev(tCursor + 2, 'NODE DEGRADED', `${n.label} serving on strained paths.`, 'warn', n.id));
    } else {
      nodeStatus[n.id] = 'healthy';
    }
  }

  const edgeRuntime: Snapshot['edges'] = {};
  let strained = 0;
  let overloaded = 0;
  for (const e of edges) {
    if (failedEdges.has(e.id)) {
      edgeRuntime[e.id] = { status: 'failed', util: 0, load: 0, diverted: diverted.get(e.id) ?? 0 };
    } else {
      const load = loadOf(e);
      const util = load / e.capacity;
      const status = util > OVERLOAD_ABOVE ? 'overloaded' : util >= STRAIN_AT ? 'strained' : 'healthy';
      if (status === 'strained') strained++;
      if (status === 'overloaded') overloaded++;
      edgeRuntime[e.id] = { status, util, load, diverted: diverted.get(e.id) ?? 0 };
      if (status === 'overloaded') {
        events.push(
          ev(tCursor + 2, 'CAPACITY WARNING', `${e.label} at ${(util * 100).toFixed(0)}% of simulated capacity.`, 'warn', e.id),
        );
      }
    }
  }

  const totalDemand = edges.reduce((s, e) => s + e.demand, 0);
  const unservedTotal = unserved.reduce((s, u) => s + u.amount, 0);
  const reroutedTotal = [...diverted.values()].reduce((s, v) => s + v, 0);
  const servedDemand = Math.max(0, totalDemand - unservedTotal);

  // Representative latency shift: average stretch of rerouted demand.
  const latencyShiftPct =
    totalDemand > 0 ? Math.min(400, (reroutedTotal / totalDemand) * 38 + unservedTotal / totalDemand * 120) : 0;

  const degradedRegionSet = new Set<string>();
  for (const n of nodes) {
    if (nodeStatus[n.id] !== 'healthy') degradedRegionSet.add(n.region);
  }
  const unreachable = nodes.filter((n) => nodeStatus[n.id] === 'isolated' || nodeStatus[n.id] === 'failed').length;
  const failedCount = Object.values(edgeRuntime).filter((r) => r.status === 'failed').length;

  const connectivity = totalDemand > 0 ? servedDemand / totalDemand : 1;
  const resilience = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        connectivity * 70 - (strained * 1.2 + overloaded * 3 + unreachable * 2.5) + (failedCount === 0 ? 30 : 30 * Math.max(0, 1 - failedCount / edges.length)),
      ),
    ),
  );

  // Per-region impact: an edge belongs to every region it touches, so a
  // transatlantic cut counts against both sides of the ocean (a cable is
  // shared risk, not a one-sided event). Affected load = demand dropped for
  // lack of path + load absorbed by alternates. Only genuinely affected
  // regions survive the 2% floor applied by the UI.
  const unservedByEdge = new Map<string, number>();
  for (const u of unserved) {
    unservedByEdge.set(u.edgeId, (unservedByEdge.get(u.edgeId) ?? 0) + u.amount);
  }
  const regionOf = (edgeId: string): RegionCode | null => {
    const e = edgeById.get(edgeId);
    if (!e) return null;
    const a = nodeById.get(e.from);
    const b = nodeById.get(e.to);
    if (!a || !b) return null;
    // Count an edge against exactly one region to keep the shares honest:
    // the region that carries more of the edge's demand (ties → lower code).
    return b.demand > a.demand ? b.region : a.region;
  };
  const regionAgg = new Map<RegionCode, { demand: number; affected: number }>();
  for (const e of edges) {
    const r = regionOf(e.id);
    if (!r) continue;
    const cur = regionAgg.get(r) ?? { demand: 0, affected: 0 };
    cur.demand += e.demand;
    cur.affected += Math.min(e.demand, (unservedByEdge.get(e.id) ?? 0) + (diverted.get(e.id) ?? 0));
    regionAgg.set(r, cur);
  }
  const regionImpact: RegionImpact[] = [...regionAgg.entries()]
    .map(([region, a]) => ({
      region,
      demand: a.demand,
      unserved: Math.round(
        [...unservedByEdge.entries()]
          .filter(([id]) => regionOf(id) === region)
          .reduce((s, [, v]) => s + v, 0),
      ),
      impact: a.demand > 0 ? Math.max(0, Math.min(1, a.affected / a.demand)) : 0,
    }))
    .sort((x, y) => y.impact - x.impact || (x.region < y.region ? -1 : 1));

  const metrics: Metrics = {
    connectivity,
    reroutedShare: totalDemand > 0 ? reroutedTotal / totalDemand : 0,
    unservedShare: totalDemand > 0 ? unservedTotal / totalDemand : 0,
    failedRoutes: failedCount,
    strainedRoutes: strained,
    overloadedRoutes: overloaded,
    unreachableNodes: unreachable,
    degradedRegions: [...degradedRegionSet].sort(),
    latencyShiftPct: Math.round(latencyShiftPct),
    resilience,
    totalDemand,
    servedDemand,
    regionImpact,
  };

  events.sort((a, b) => a.t - b.t || (a.type < b.type ? -1 : 1));

  return { edges: edgeRuntime, nodes: nodeStatus, metrics, events, cascadeRounds };
}

/** Snapshot over time: apply only failures with at <= t (deterministic replay/scrub). */
export function snapshotAt(
  nodes: SimNode[],
  edges: SimEdge[],
  failures: Failure[],
  t: number,
  opts: RunOptions = {},
): Snapshot {
  return runSimulation(nodes, edges, failures.filter((f) => f.at <= t), opts);
}

/** Latest simulation second covered by a failure list. */
export function horizonOf(failures: Failure[]): number {
  return failures.reduce((m, f) => Math.max(m, f.at), 0) + 8;
}
