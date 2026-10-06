// Graph utilities: adjacency + capacity-aware Dijkstra + 2-path alternates.
// Fully deterministic: neighbours sorted, ties broken by id.

import type { SimEdge } from './types';

export interface AdjEntry {
  to: string;
  edgeId: string;
  weight: number;
}

export function buildAdjacency(
  edges: SimEdge[],
  opts: {
    excludeEdges?: Set<string>;
    excludeNodes?: Set<string>;
    /** extra per-edge weight multiplier (e.g. congestion) */
    weightMul?: (edgeId: string) => number;
  } = {},
): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();
  const push = (from: string, to: string, edgeId: string, w: number) => {
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from)!.push({ to, edgeId, weight: w });
  };
  const sorted = [...edges].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const e of sorted) {
    if (opts.excludeEdges?.has(e.id)) continue;
    if (opts.excludeNodes?.has(e.from) || opts.excludeNodes?.has(e.to)) continue;
    const m = opts.weightMul ? opts.weightMul(e.id) : 1;
    const w = Math.max(1, e.latencyMs * m);
    push(e.from, e.to, e.id, w);
    push(e.to, e.from, e.id, w);
  }
  for (const list of adj.values()) {
    list.sort((a, b) => a.weight - b.weight || (a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0));
  }
  return adj;
}

export interface PathResult {
  nodes: string[];
  edgeIds: string[];
  cost: number;
}

export function shortestPath(
  adj: Map<string, AdjEntry[]>,
  from: string,
  to: string,
): PathResult | null {
  if (from === to) return { nodes: [from], edgeIds: [], cost: 0 };
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, { node: string; edgeId: string }>();
  const visited = new Set<string>();
  // Simple O(V^2) Dijkstra — graph is tiny (<40 nodes), clarity over heap.
  for (;;) {
    let cur: string | null = null;
    let best = Infinity;
    for (const [n, d] of dist) {
      if (!visited.has(n) && d < best) {
        best = d;
        cur = n;
      }
    }
    if (cur === null) return null;
    if (cur === to) break;
    visited.add(cur);
    const links = adj.get(cur) ?? [];
    for (const l of links) {
      if (visited.has(l.to)) continue;
      const nd = best + l.weight;
      const prevBest = dist.get(l.to);
      if (prevBest === undefined || nd < prevBest - 1e-9) {
        dist.set(l.to, nd);
        prev.set(l.to, { node: cur, edgeId: l.edgeId });
      }
    }
  }
  const nodes: string[] = [to];
  const edgeIds: string[] = [];
  let c = to;
  while (c !== from) {
    const p = prev.get(c);
    if (!p) return null;
    edgeIds.unshift(p.edgeId);
    c = p.node;
    nodes.unshift(c);
  }
  return { nodes, edgeIds, cost: dist.get(to) ?? Infinity };
}

/** Up to k loop-free alternate paths; each found with prior-path penalty (ECMP-like spread).
 * Policy: DNS and cloud links only carry transit when a DNS/cloud node is an
 * endpoint — otherwise they are excluded from alternates entirely. */
export function alternatePaths(
  edges: SimEdge[],
  nodes: { id: string; kind: string }[],
  from: string,
  to: string,
  excludeEdges: Set<string>,
  excludeNodes: Set<string>,
  k = 3,
): PathResult[] {
  const out: PathResult[] = [];
  const nodeKind = new Map(nodes.map((n) => [n.id, n.kind]));
  const allowDns = nodeKind.get(from) === 'dns' || nodeKind.get(to) === 'dns';
  const allowCloud = nodeKind.get(from) === 'cloud' || nodeKind.get(to) === 'cloud';
  const policyExcluded = new Set<string>();
  for (const e of edges) {
    if (e.kind === 'dns' && !allowDns) policyExcluded.add(e.id);
    if (e.kind === 'cloud' && !allowCloud) policyExcluded.add(e.id);
  }
  const penalized = new Set([...excludeEdges, ...policyExcluded]);
  const kindOf = new Map(edges.map((e) => [e.id, e.kind]));
  for (let i = 0; i < k; i++) {
    const adj = buildAdjacency(edges, {
      excludeEdges: penalized,
      excludeNodes,
      weightMul: (id) => transitWeight(kindOf.get(id) ?? ''),
    });
    const p = shortestPath(adj, from, to);
    if (!p || p.edgeIds.length === 0) break;
    // avoid returning a duplicate of an already-found path
    if (out.some((q) => q.edgeIds.join('|') === p.edgeIds.join('|'))) break;
    out.push(p);
    for (const id of p.edgeIds) penalized.add(id);
  }
  return out;
}

/** Policy weights: DNS sync and cloud replication links are not general
 * transit. Without this, latency-only routing would send Atlantic reroutes
 * through a DNS zone-sync path — cheap on paper, nonsense in practice. */
export function transitWeight(kind: string): number {
  if (kind === 'dns') return 8;
  if (kind === 'cloud') return 3;
  return 1;
}

/** Nodes reachable from seed over healthy edges (component analysis). */
export function reachableComponent(
  edges: SimEdge[],
  seed: string,
  excludeEdges: Set<string>,
  excludeNodes: Set<string>,
): Set<string> {
  const adj = buildAdjacency(edges, { excludeEdges, excludeNodes });
  const seen = new Set<string>([seed]);
  const stack = [seed];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const l of adj.get(cur) ?? []) {
      if (!seen.has(l.to)) {
        seen.add(l.to);
        stack.push(l.to);
      }
    }
  }
  return seen;
}
