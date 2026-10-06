import { describe, expect, it } from 'vitest';
import { buildAdjacency, shortestPath, alternatePaths, reachableComponent } from '../../src/core/graph';
import type { SimEdge } from '../../src/core/types';

const edges: SimEdge[] = [
  { id: 'a-b', label: 'A-B', kind: 'terrestrial', from: 'a', to: 'b', capacity: 10, demand: 5, latencyMs: 10, corridor: 't', note: '' },
  { id: 'b-c', label: 'B-C', kind: 'terrestrial', from: 'b', to: 'c', capacity: 10, demand: 5, latencyMs: 10, corridor: 't', note: '' },
  { id: 'a-c', label: 'A-C', kind: 'submarine', from: 'a', to: 'c', capacity: 10, demand: 5, latencyMs: 30, corridor: 't', note: '' },
];

describe('graph', () => {
  it('finds the lowest-latency path', () => {
    const adj = buildAdjacency(edges);
    const p = shortestPath(adj, 'a', 'c');
    expect(p?.edgeIds).toEqual(['a-b', 'b-c']);
  });

  it('routes around excluded edges', () => {
    const adj = buildAdjacency(edges, { excludeEdges: new Set(['a-b']) });
    const p = shortestPath(adj, 'a', 'c');
    expect(p?.edgeIds).toEqual(['a-c']);
  });

  it('returns null when disconnected', () => {
    const adj = buildAdjacency(edges, { excludeEdges: new Set(['a-b', 'a-c']) });
    expect(shortestPath(adj, 'a', 'c')).toBeNull();
  });

  it('produces two diverse alternates', () => {
    const alts = alternatePaths(edges, [], 'a', 'c', new Set(), new Set());
    expect(alts.length).toBe(2);
    expect(alts[0].edgeIds).toEqual(['a-b', 'b-c']);
    expect(alts[1].edgeIds).toEqual(['a-c']);
  });

  it('keeps DNS links out of general transit alternates', () => {
    const nodes = [
      { id: 'a', kind: 'hub' },
      { id: 'b', kind: 'hub' },
      { id: 'd', kind: 'dns' },
    ];
    const withDns: SimEdge[] = [
      ...edges,
      { id: 'a-d', label: 'A-D', kind: 'dns', from: 'a', to: 'd', capacity: 10, demand: 1, latencyMs: 1, corridor: 't', note: '' },
      { id: 'd-c', label: 'D-C', kind: 'dns', from: 'd', to: 'c', capacity: 10, demand: 1, latencyMs: 1, corridor: 't', note: '' },
    ];
    const alts = alternatePaths(withDns, nodes, 'a', 'c', new Set(), new Set());
    expect(alts.length).toBeGreaterThan(0);
    for (const p of alts) {
      expect(p.edgeIds.includes('a-d')).toBe(false);
      expect(p.edgeIds.includes('d-c')).toBe(false);
    }
    // …but a DNS endpoint may still use its attachments
    const dnsAlts = alternatePaths(withDns, nodes, 'd', 'c', new Set(), new Set());
    expect(dnsAlts.length).toBeGreaterThan(0);
  });

  it('is deterministic under shuffled input order', () => {
    const rev = [...edges].reverse();
    const p1 = shortestPath(buildAdjacency(edges), 'a', 'c');
    const p2 = shortestPath(buildAdjacency(rev), 'a', 'c');
    expect(p1).toEqual(p2);
  });

  it('computes reachable components', () => {
    const comp = reachableComponent(edges, 'a', new Set(['a-b', 'a-c']), new Set());
    expect([...comp]).toEqual(['a']);
  });
});
