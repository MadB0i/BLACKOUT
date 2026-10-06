// CHAOS MODE: deterministic seeded failure sequence with ramping intensity.
// Same seed => same sequence => same replay. No uncontrollable randomness.

import { rngFor } from '../core/rng';
import type { Failure } from '../core/types';
import { EDGES, NODES } from './topology';

export interface ChaosPlan {
  seed: string;
  steps: Failure[];
}

/** Build an 8-step escalating plan: cables → hub → cloud surge → DNS. */
export function buildChaosPlan(seed: string): ChaosPlan {
  const rand = rngFor(seed, 'chaos');
  const steps: Failure[] = [];
  let t = 0;

  const subEdges = EDGES.filter((e) => e.kind === 'submarine');
  const picked = new Set<string>();
  const pickEdge = (minDemand: number): string => {
    const pool = subEdges.filter((e) => !picked.has(e.id) && e.demand >= minDemand);
    const src = pool.length ? pool : subEdges.filter((e) => !picked.has(e.id));
    const e = src[Math.floor(rand() * src.length)];
    picked.add(e.id);
    return e.id;
  };

  // Phase 1 (t=0..8): two cable cuts, escalating size.
  const c1 = pickEdge(20);
  steps.push({ kind: 'edge', id: c1, at: t, cause: 'chaos event 1 · seeded fault' });
  t += 6 + Math.floor(rand() * 4);
  const c2 = pickEdge(40);
  steps.push({ kind: 'edge', id: c2, at: t, cause: 'chaos event 2 · seeded fault' });

  // Phase 2 (t≈14): a hub goes dark.
  t += 7 + Math.floor(rand() * 4);
  const hubPool = NODES.filter((n) => n.kind === 'hub' || n.kind === 'ixp');
  const hub = hubPool[Math.floor(rand() * hubPool.length)];
  steps.push({ kind: 'node', id: hub.id, at: t, cause: 'chaos event 3 · seeded facility failure' });

  // Phase 3: surge on a random survivor trunk + third cut.
  t += 6 + Math.floor(rand() * 4);
  const survivors = EDGES.filter((e) => !picked.has(e.id) && e.kind !== 'dns');
  const surgeTarget = survivors[Math.floor(rand() * survivors.length)];
  steps.push({
    kind: 'surge',
    id: surgeTarget.id,
    at: t,
    amount: Math.round(surgeTarget.capacity * (0.25 + rand() * 0.2)),
    cause: 'chaos event 4 · failover stampede',
  });
  t += 5 + Math.floor(rand() * 4);
  steps.push({ kind: 'edge', id: pickEdge(15), at: t, cause: 'chaos event 5 · seeded fault' });

  // Phase 4: DNS disruption + cloud-region loss + final cut.
  t += 6 + Math.floor(rand() * 4);
  const dnsNodes = NODES.filter((n) => n.kind === 'dns');
  const dns = dnsNodes[Math.floor(rand() * dnsNodes.length)];
  steps.push({ kind: 'node', id: dns.id, at: t, cause: 'chaos event 6 · seeded DNS disruption' });
  t += 6 + Math.floor(rand() * 4);
  const clouds = NODES.filter((n) => n.kind === 'cloud');
  const cloud = clouds[Math.floor(rand() * clouds.length)];
  steps.push({ kind: 'node', id: cloud.id, at: t, cause: 'chaos event 7 · seeded region loss' });
  t += 5 + Math.floor(rand() * 4);
  steps.push({ kind: 'edge', id: pickEdge(10), at: t, cause: 'chaos event 8 · final seeded fault' });

  return { seed, steps };
}
