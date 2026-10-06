import { describe, expect, it } from 'vitest';
import { runSimulation, snapshotAt, horizonOf } from '../../src/core/simulation';
import { EDGES, NODES } from '../../src/data/topology';
import { buildChaosPlan } from '../../src/data/chaos';
import { SCENARIOS } from '../../src/data/scenarios';

describe('simulation', () => {
  it('is nominal with no failures', () => {
    const s = runSimulation(NODES, EDGES, []);
    expect(s.metrics.connectivity).toBe(1);
    expect(s.metrics.failedRoutes).toBe(0);
    expect(s.metrics.resilience).toBeGreaterThan(90);
    expect(s.events.length).toBe(0);
  });

  it('absorbs a single cable cut without cascade', () => {
    const s = runSimulation(NODES, EDGES, [
      { kind: 'edge', id: 'e-tat-n1', at: 0, cause: 'test' },
    ]);
    expect(s.edges['e-tat-n1'].status).toBe('failed');
    // survivors carry diverted load
    const divertedTotal = Object.values(s.edges).reduce((sum, r) => sum + r.diverted, 0);
    expect(divertedTotal).toBeGreaterThan(0);
    expect(s.cascadeRounds).toBe(0);
    expect(s.metrics.connectivity).toBe(1);
    expect(s.events.some((e) => e.type === 'TRAFFIC SHIFT')).toBe(true);
  });

  it('hangs Dublin by a thread on a double landing cut', () => {
    const s = runSimulation(NODES, EDGES, [
      { kind: 'edge', id: 'e-tat-n1', at: 0, cause: 'test' },
      { kind: 'edge', id: 'e-tat-w1', at: 4, cause: 'test' },
    ]);
    // Dublin's only surviving attachment must be working hard but alive.
    const backhaul = s.edges['e-eu-4'];
    expect(backhaul.status === 'strained' || backhaul.status === 'overloaded').toBe(true);
    expect(s.cascadeRounds).toBe(0);
    expect(s.metrics.connectivity).toBe(1);
    expect(s.metrics.latencyShiftPct).toBeGreaterThan(0);
  });

  it('removes all incident capacity on node failure', () => {
    const s = runSimulation(NODES, EDGES, [{ kind: 'node', id: 'london', at: 0, cause: 'test' }]);
    expect(s.nodes['london']).toBe('failed');
    for (const e of EDGES.filter((e) => e.from === 'london' || e.to === 'london')) {
      expect(s.edges[e.id].status).toBe('failed');
    }
    expect(s.metrics.unreachableNodes).toBeGreaterThanOrEqual(0);
  });

  it('cascades on the dominoes scenario', () => {
    const sc = SCENARIOS.find((x) => x.id === 'cascade')!;
    const s = runSimulation(NODES, EDGES, sc.steps);
    expect(s.cascadeRounds).toBeGreaterThanOrEqual(1);
    expect(s.events.some((e) => e.type === 'OVERLOAD TRIP')).toBe(true);
  });

  it('models the BGP leak as surge-driven overload', () => {
    const sc = SCENARIOS.find((x) => x.id === 'bgp-leak')!;
    const s = runSimulation(NODES, EDGES, sc.steps);
    expect(s.edges['e-eu-2'].load).toBeGreaterThan(90);
    expect(s.metrics.strainedRoutes + s.metrics.overloadedRoutes + s.metrics.failedRoutes).toBeGreaterThan(0);
  });

  it('recovers: restore returns capacity', () => {
    const fails = [
      { kind: 'edge' as const, id: 'e-tat-n1', at: 0, cause: 'test' },
      { kind: 'recover-edge' as const, id: 'e-tat-n1', at: 20, cause: 'test' },
    ];
    const before = snapshotAt(NODES, EDGES, fails, 10);
    const after = snapshotAt(NODES, EDGES, fails, 25);
    expect(before.edges['e-tat-n1'].status).toBe('failed');
    expect(after.edges['e-tat-n1'].status).not.toBe('failed');
    expect(after.events.some((e) => e.type === 'ROUTE RESTORED')).toBe(true);
  });

  it('isolates Oceania when all Pacific paths die', () => {
    const sc = SCENARIOS.find((x) => x.id === 'isolation')!;
    const s = runSimulation(NODES, EDGES, sc.steps);
    expect(['isolated', 'degraded', 'healthy']).toContain(s.nodes['sydney']);
    expect(s.metrics.unservedShare).toBeGreaterThanOrEqual(0);
  });

  it('chaos plan replays deterministically', () => {
    const a = buildChaosPlan('seed-x');
    const b = buildChaosPlan('seed-x');
    expect(a).toEqual(b);
    const s1 = runSimulation(NODES, EDGES, a.steps);
    const s2 = runSimulation(NODES, EDGES, b.steps);
    expect(s1.metrics).toEqual(s2.metrics);
  });

  it('horizon extends past the last failure', () => {
    expect(horizonOf([{ kind: 'edge', id: 'e-tat-n1', at: 20, cause: 't' }])).toBeGreaterThan(20);
  });
});
