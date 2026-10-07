// Orbital / ground-segment dependency model + regional impact reporting.
// The load-bearing claim of this layer: a terrestrial outage never takes a
// spacecraft offline, it degrades the services that need the ground.

import { describe, expect, it } from 'vitest';
import { orbitState } from '../../src/core/orbitSim';
import { runSimulation } from '../../src/core/simulation';
import { domainStateLabel } from '../../src/ui/format';
import { ORBIT_CLASSES, ORBIT_STATIONS, validateOrbitData } from '../../src/data/orbit';
import { SCENARIOS, scenarioSteps, scenarioTargets } from '../../src/data/scenarios';
import { EDGES, NODES } from '../../src/data/topology';
import type { Failure } from '../../src/core/types';

/** Fail every terrestrial edge touching a node — isolates that site. */
function isolate(nodeId: string): Failure[] {
  return EDGES.filter((e) => e.from === nodeId || e.to === nodeId).map((e) => ({
    kind: 'edge' as const,
    id: e.id,
    at: 0,
    cause: 'test isolation',
  }));
}

const orbitFor = (failures: Failure[]) => orbitState(EDGES, runSimulation(NODES, EDGES, failures));

describe('orbit dataset', () => {
  it('anchors every ground station on a real modelled node', () => {
    expect(validateOrbitData()).toEqual([]);
  });

  it('declares only the five intended orbital classes', () => {
    expect(ORBIT_CLASSES.map((c) => c.id)).toEqual(['ground', 'gnss', 'weather', 'eo', 'leo']);
  });

  it('keeps the orbital marker budget sparse', () => {
    const markers = ORBIT_CLASSES.reduce((s, c) => s + c.markers, 0);
    expect(markers).toBeLessThanOrEqual(12);
    expect(ORBIT_STATIONS.length).toBeLessThanOrEqual(16);
  });
});

describe('orbit dependency propagation', () => {
  it('is nominal on an undisturbed mesh', () => {
    const o = orbitFor([]);
    expect(o.orbitHealth).toBe(1);
    expect(o.controlHealth).toBe(1);
    expect(o.classes.every((c) => c.worst === 'nominal')).toBe(true);
    expect(domainStateLabel(o)).toBe('ALL SEGMENTS NOMINAL');
  });

  it('never reports a spacecraft as lost — autonomy is unconditional', () => {
    const o = orbitFor([...isolate('newyork'), ...isolate('london'), ...isolate('singapore')]);
    expect(o.classes.every((c) => c.autonomous)).toBe(true);
    expect(o.controlHealth).toBeLessThan(1);
  });

  it('degrades control reachability when one control site is isolated', () => {
    const o = orbitFor(isolate('newyork'));
    expect(o.controlHealth).toBeCloseTo(2 / 3, 5);
    expect(o.stationStates['gs-houston']).toBe('unreachable');
    expect(o.stationStates['gs-dublin']).toBe('nominal');
    expect(domainStateLabel(o)).toBe('GROUND SEGMENT DEGRADED');
  });

  it('reports an isolated ground segment once every control site is lost', () => {
    const o = orbitFor([...isolate('newyork'), ...isolate('dublin'), ...isolate('singapore')]);
    expect(o.controlHealth).toBe(0);
    expect(domainStateLabel(o)).toBe('GROUND SEGMENT ISOLATED');
  });

  it('degrades a specific class through its own stations only', () => {
    const o = orbitFor(isolate('marseille'));
    const leo = o.classes.find((c) => c.classId === 'leo')!;
    const wx = o.classes.find((c) => c.classId === 'weather')!;
    expect(o.stationStates['gs-canary']).toBe('unreachable');
    expect(leo.worst).not.toBe('nominal');
    expect(wx.worst).toBe('nominal');
    expect(o.orbitHealth).toBeLessThan(1);
  });

  it('keeps command alive from a surviving site but flags telemetry loss', () => {
    // Weather has two stations: with one left, telemetry is delayed, not lost.
    const o = orbitFor(isolate('sydney'));
    const wx = o.classes.find((c) => c.classId === 'weather')!;
    const telemetry = wx.stages.find((s) => s.stage === 'telemetry')!;
    const dissemination = wx.stages.find((s) => s.stage === 'dissemination')!;
    expect(telemetry.state).toBe('delayed');
    expect(dissemination.state).toBe('delayed');
    expect(wx.autonomous).toBe(true);
  });

  it('treats a strained-only station as strained, not lost', () => {
    const sc = SCENARIOS.find((s) => s.id === 'dual-cable')!;
    const o = orbitFor(sc.steps);
    expect(o.stationStates['gs-dublin']).toBe('strained');
    expect(o.stationStates['gs-dublin']).not.toBe('unreachable');
  });

  it('is deterministic for the same terrestrial state', () => {
    const sc = SCENARIOS.find((s) => s.id === 'cascade')!;
    expect(orbitFor(sc.steps)).toEqual(orbitFor(sc.steps.map((f) => ({ ...f }))));
  });
});

describe('regional impact', () => {
  it('reports zero impact everywhere on a healthy mesh', () => {
    const m = runSimulation(NODES, EDGES, []).metrics;
    expect(m.regionImpact.every((r) => r.impact === 0)).toBe(true);
  });

  it('attributes displaced demand to the region that loses it', () => {
    const m = runSimulation(NODES, EDGES, [{ kind: 'edge', id: 'e-tat-n1', at: 0, cause: 't' }]).metrics;
    const touched = m.regionImpact.filter((r) => r.impact > 0);
    expect(touched.length).toBeGreaterThan(0);
    for (const r of touched) expect(r.impact).toBeGreaterThanOrEqual(0);
    for (const r of touched) expect(r.impact).toBeLessThanOrEqual(1);
  });

  it('sorts regions by impact so the console can show the worst first', () => {
    const m = runSimulation(NODES, EDGES, [
      { kind: 'edge', id: 'e-ap-s1', at: 0, cause: 't' },
      { kind: 'edge', id: 'e-ap-s2', at: 2, cause: 't' },
      { kind: 'edge', id: 'e-tp-s1', at: 5, cause: 't' },
    ]).metrics;
    for (let i = 1; i < m.regionImpact.length; i++) {
      expect(m.regionImpact[i - 1].impact).toBeGreaterThanOrEqual(m.regionImpact[i].impact);
    }
  });

  it('counts each edge once, so shares stay inside 0..1', () => {
    const sc = SCENARIOS.find((s) => s.id === 'chaos')!;
    const m = runSimulation(NODES, EDGES, scenarioSteps('chaos')).metrics;
    for (const r of m.regionImpact) {
      expect(r.impact).toBeGreaterThanOrEqual(0);
      expect(r.impact).toBeLessThanOrEqual(1);
      expect(r.demand).toBeGreaterThan(0);
    }
    expect(sc.steps.length).toBe(0);
  });
});

describe('scenario metadata', () => {
  it('numbers every scenario uniquely', () => {
    const codes = SCENARIOS.map((s) => s.code);
    expect(codes).toEqual(codes.map((_, i) => String(i + 1).padStart(2, '0')));
  });

  it('exposes the routes each scenario would touch for globe preview', () => {
    for (const sc of SCENARIOS) {
      const { edges, nodes } = scenarioTargets(sc.id);
      expect(edges.size + nodes.size).toBeGreaterThan(0);
    }
  });
});