// Authored scenario library. Deterministic: fixed steps + seeds.
// Wording is careful: "simulated", "model", no claims about real outages.

import { buildChaosPlan } from './chaos';
import type { Failure } from '../core/types';

export type ScenarioStep = Failure;

/** Which dependency domains a scenario is meant to expose. */
export type ScenarioDomain = 'mesh' | 'control' | 'hybrid';

export interface Scenario {
  id: string;
  /** 2-digit mission index shown in the library */
  code: string;
  title: string;
  premise: string;
  seed: string;
  steps: ScenarioStep[];
  mechanics: string;
  lesson: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  /** what breaking this hurts beyond the terrestrial mesh */
  dependency: string;
  domain: ScenarioDomain;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'single-cable',
    code: '01',
    title: 'SILENT ATLANTIC',
    premise: 'One transatlantic segment goes dark; traffic squeezes onto two survivors.',
    seed: 'blackout-silent-atlantic',
    steps: [{ kind: 'edge', id: 'e-tat-n1', at: 0, cause: 'simulated cable fault' }],
    mechanics: '68u of demand reroutes over TAT-N2/TAT-N3. Survivors go strained; no cascade expected.',
    lesson: 'Diverse physical paths absorb a single failure — but margin shrinks. Redundancy is headroom, not immunity.',
    intensity: 1,
    dependency: 'Stations ride the surviving landings.',
    domain: 'mesh',
  },
  {
    id: 'dual-cable',
    code: '02',
    title: 'DOUBLE CUT',
    premise: 'Both diverse landings into Dublin fail hours apart; Ireland hangs by one backhaul thread.',
    seed: 'blackout-double-cut',
    steps: [
      { kind: 'edge', id: 'e-tat-n1', at: 0, cause: 'simulated cable fault' },
      { kind: 'edge', id: 'e-tat-w1', at: 4, cause: 'simulated second fault' },
    ],
    mechanics: 'Dublin keeps a single attachment (London backhaul). Expect deep strain across the northern mesh, overload warnings, latency shift — but no partition.',
    lesson: 'Landing-point diversity works until the last diverse entry is also the same building, trench, or power feed. Backhaul is the lifeline nobody budgets.',
    intensity: 2,
    dependency: 'Dublin hosts mission control.',
    domain: 'control',
  },
  {
    id: 'gateway',
    code: '03',
    title: 'EXCHANGE DARK',
    premise: 'A major European exchange/gateway abstraction drops offline entirely.',
    seed: 'blackout-exchange-dark',
    steps: [{ kind: 'node', id: 'london', at: 0, cause: 'simulated facility power + failover failure' }],
    mechanics: 'All London-incident capacity is removed at once; mesh reroutes via Frankfurt/Amsterdam/Dublin.',
    lesson: 'Hubs concentrate risk. Gateway loss is worse than any single cable: it removes many logical paths simultaneously.',
    intensity: 3,
    dependency: 'Ground stations attach here.',
    domain: 'control',
  },
  {
    id: 'cloud-region',
    code: '04',
    title: 'REGION DOWN',
    premise: 'A cloud-region abstraction fails; replicas and users stampede to survivors.',
    seed: 'blackout-region-down',
    steps: [
      { kind: 'node', id: 'cloud-euw1', at: 0, cause: 'simulated region-wide control-plane fault' },
      { kind: 'surge', id: 'e-cl-7', at: 2, amount: 18, cause: 'replica failover stampede' },
    ],
    mechanics: 'Inter-region links absorb replica traffic; watch CL-7/CL-8 for strain and cascade.',
    lesson: 'Failover is itself load. Recovery traffic can break the lifeboat — backoff and shedding matter.',
    intensity: 3,
    dependency: 'EO processing runs in this region.',
    domain: 'hybrid',
  },
  {
    id: 'dns',
    code: '05',
    title: 'POISONED ROOTS',
    premise: 'DNS anycast infrastructure in Europe is disrupted; lookups detour globally.',
    seed: 'blackout-poisoned-roots',
    steps: [
      { kind: 'node', id: 'dns-eu', at: 0, cause: 'simulated DNS infrastructure disruption' },
      { kind: 'surge', id: 'e-dns-7', at: 2, amount: 10, cause: 'lookup retries hammer surviving sync paths' },
    ],
    mechanics: 'Resolution demand shifts to NA/AP instances; sync links strain; latency shift is the visible symptom.',
    lesson: 'DNS rarely "goes down" — it degrades into timeouts. Everything above it slows, retries, and amplifies load.',
    intensity: 2,
    dependency: 'Distribution rides this path.',
    domain: 'mesh',
  },
  {
    id: 'bgp-leak',
    code: '06',
    title: 'ROUTE LEAK',
    premise: 'A misconfigured network announces paths it cannot serve; neighbours believe it.',
    seed: 'blackout-route-leak',
    steps: [
      { kind: 'surge', id: 'e-eu-2', at: 0, amount: 42, cause: 'leaked announcement attracts European transit' },
      { kind: 'surge', id: 'e-eu-3', at: 1, amount: 30, cause: 'leak propagation to adjacent exchange' },
      { kind: 'surge', id: 'e-eu-4', at: 3, amount: 22, cause: 'retry + re-announcement churn' },
    ],
    mechanics: 'No cable is cut — demand is misdirected until links trip on overload. Educational model of a leak/contamination event.',
    lesson: 'BGP trusts by default. A leak breaks nothing physically yet congests everything logically — filtering and RPKI exist for this.',
    intensity: 4,
    dependency: 'Stations inherit the congestion.',
    domain: 'mesh',
  },
  {
    id: 'isolation',
    code: '07',
    title: 'ISLAND CONTINENT',
    premise: 'Oceania loses every Pacific path at once; one thin southern link remains.',
    seed: 'blackout-island',
    steps: [
      { kind: 'edge', id: 'e-ap-s1', at: 0, cause: 'simulated dual subsea fault' },
      { kind: 'edge', id: 'e-ap-s2', at: 2, cause: 'simulated dual subsea fault' },
      { kind: 'edge', id: 'e-tp-s1', at: 5, cause: 'simulated third fault' },
    ],
    mechanics: 'Sydney hangs on IO-S2 (Johannesburg) — expect isolation warnings and unserved demand.',
    lesson: 'Geography is destiny for islands: few diverse paths means regional isolation is a matter of when, with what backup.',
    intensity: 4,
    dependency: 'Sydney carries the southern link.',
    domain: 'control',
  },
  {
    id: 'cascade',
    code: '08',
    title: 'DOMINOES',
    premise: 'Two saturated Asian trunks fail under evening load; the mesh cannot catch it all.',
    seed: 'blackout-dominoes',
    steps: [
      { kind: 'edge', id: 'e-ap-e1', at: 0, cause: 'simulated overload trip' },
      { kind: 'edge', id: 'e-io-e1', at: 3, cause: 'simulated overload trip' },
      { kind: 'surge', id: 'e-io-e2', at: 4, amount: 32, cause: 'spillover from both failures' },
    ],
    mechanics: 'Designed to trigger at least one cascade round: watch OVERLOAD TRIP events chain.',
    lesson: 'Cascades are a capacity story, not a cable story. Highly-utilised backups are decorations — margin is survival.',
    intensity: 5,
    dependency: 'Downlink scheduling thins out.',
    domain: 'hybrid',
  },
  {
    id: 'recovery',
    code: '09',
    title: 'RECONVERGENCE',
    premise: 'Break it, then fix it: Atlantic segment fails, crews repair, traffic flows home.',
    seed: 'blackout-reconvergence',
    steps: [
      { kind: 'edge', id: 'e-tat-n1', at: 0, cause: 'simulated cable fault' },
      { kind: 'recover-edge', id: 'e-tat-n1', at: 20, cause: 'simulated repair complete' },
    ],
    mechanics: 'Snapshot scrubbing shows the wound and the healing: compare utilisation before/after t=20.',
    lesson: 'Recovery is a routing event too. Reconvergence takes time, and traffic returns unevenly — watch the pulses.',
    intensity: 1,
    dependency: 'Ground-segment health returns.',
    domain: 'mesh',
  },
  {
    id: 'chaos',
    code: '10',
    title: 'CHAOS MODE',
    premise: 'Seeded sequential failures, ramping intensity. How much survives?',
    seed: 'blackout-chaos-prime',
    steps: [],
    mechanics: 'Generated at runtime from the seed: 8 escalating failures across cables, a hub, and a surge. Copy the seed to replay.',
    lesson: 'Resilience is a curve, not a switch. Every system has a failure count beyond which it stops degrading gracefully.',
    intensity: 5,
    dependency: 'Ramps through every domain.',
    domain: 'hybrid',
  },
];

/** Deterministic step list for a scenario (chaos derives its own plan). */
export function scenarioSteps(id: string): Failure[] {
  const sc = getScenario(id);
  if (!sc) return [];
  return id === 'chaos' ? buildChaosPlan(sc.seed).steps : sc.steps;
}

/** Edge and node ids a scenario touches — used for globe preview highlights. */
export function scenarioTargets(id: string): { edges: Set<string>; nodes: Set<string> } {
  const edges = new Set<string>();
  const nodes = new Set<string>();
  for (const f of scenarioSteps(id)) {
    if (f.kind === 'edge' || f.kind === 'recover-edge' || f.kind === 'surge') edges.add(f.id);
    else nodes.add(f.id);
  }
  return { edges, nodes };
}

export function getScenario(id: string | null): Scenario | null {
  if (!id) return null;
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
