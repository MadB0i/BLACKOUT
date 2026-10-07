// BLACKOUT core model types.
// All capacities/demands are SYNTHETIC model units (labelled "simulated").
// City coordinates are plain geographic facts used only to place nodes.

export type RegionCode =
  | 'NAM'
  | 'SAM'
  | 'EUR'
  | 'AFR'
  | 'MEA'
  | 'SAS'
  | 'EAS'
  | 'SEA'
  | 'OCE';

export type NodeKind = 'hub' | 'landing' | 'ixp' | 'cloud' | 'dns';
export type EdgeKind = 'submarine' | 'terrestrial' | 'cloud' | 'dns';

export interface SimNode {
  id: string;
  label: string;
  kind: NodeKind;
  region: RegionCode;
  lat: number;
  lon: number;
  /** synthetic capacity units */
  capacity: number;
  /** synthetic baseline demand units */
  demand: number;
  note: string;
}

export interface SimEdge {
  id: string;
  label: string;
  kind: EdgeKind;
  from: string;
  to: string;
  /** synthetic capacity units */
  capacity: number;
  /** synthetic baseline demand units */
  demand: number;
  /** representative one-way ms, used as routing weight */
  latencyMs: number;
  corridor: string;
  note: string;
}

export type EdgeStatus = 'healthy' | 'strained' | 'overloaded' | 'failed';
export type NodeStatus = 'healthy' | 'degraded' | 'isolated' | 'failed';

export type FailureKind = 'edge' | 'node' | 'surge' | 'recover-edge' | 'recover-node';

export interface Failure {
  kind: FailureKind;
  /** edge id, node id, or edge id for surge */
  id: string;
  /** simulation seconds */
  at: number;
  /** extra demand units for surge */
  amount?: number;
  cause: string;
}

export type Severity = 'info' | 'warn' | 'critical' | 'good';

export interface SimEvent {
  t: number;
  type: string;
  message: string;
  severity: Severity;
  refId?: string;
}

export interface EdgeRuntime {
  status: EdgeStatus;
  /** total carried load / capacity */
  util: number;
  load: number;
  diverted: number;
}

export interface RegionImpact {
  region: RegionCode;
  /** 0..1 share of that region's baseline demand affected by the failure */
  impact: number;
  /** synthetic demand units attributed to the region (edges with an endpoint there) */
  demand: number;
  /** units dropped for lack of a surviving path */
  unserved: number;
}

export interface Metrics {
  /** 0..1 share of baseline demand still served */
  connectivity: number;
  reroutedShare: number;
  unservedShare: number;
  failedRoutes: number;
  strainedRoutes: number;
  overloadedRoutes: number;
  unreachableNodes: number;
  degradedRegions: string[];
  /** representative % increase of average path latency */
  latencyShiftPct: number;
  /** 0..100 composite resilience score */
  resilience: number;
  totalDemand: number;
  servedDemand: number;
  /** per-region impact ratios, sorted by impact desc then region code */
  regionImpact: RegionImpact[];
}

export interface Snapshot {
  edges: Record<string, EdgeRuntime>;
  nodes: Record<string, NodeStatus>;
  metrics: Metrics;
  events: SimEvent[];
  cascadeRounds: number;
}

export const REGION_LABEL: Record<RegionCode, string> = {
  NAM: 'N. America',
  SAM: 'S. America',
  EUR: 'Europe',
  AFR: 'Africa',
  MEA: 'Middle East',
  SAS: 'South Asia',
  EAS: 'East Asia',
  SEA: 'SE Asia',
  OCE: 'Oceania',
};

/* ---------- orbital / ground-segment dependency domain ---------- */

export type OrbitClassId = 'gnss' | 'leo' | 'weather' | 'eo' | 'ground';

/** How one link in the dependency chain is currently doing. */
export type OrbitStageState = 'nominal' | 'strained' | 'delayed' | 'unreachable';

export type StationState = 'nominal' | 'strained' | 'unreachable';

/**
 * Dependency chain, in propagation order. Spacecraft keep flying when the
 * terrestrial side is impaired — the model degrades *services delivered
 * through the ground*, never the vehicle.
 */
export const ORBIT_STAGES = [
  'ground-segment',
  'telemetry',
  'command',
  'timing',
  'dissemination',
] as const;
export type OrbitStageId = (typeof ORBIT_STAGES)[number];

export const ORBIT_STAGE_LABEL: Record<OrbitStageId, string> = {
  'ground-segment': 'GROUND SEGMENT',
  telemetry: 'TELEMETRY DELIVERY',
  command: 'COMMAND PATH',
  timing: 'TIMING / DISTRIBUTION',
  dissemination: 'DOWNSTREAM SERVICES',
};

export interface OrbitClassStage {
  stage: OrbitStageId;
  state: OrbitStageState;
  /** 0..1 share of stations or services still working at this stage */
  health: number;
}

export interface OrbitClassState {
  classId: OrbitClassId;
  /** 0..1 share of ground stations reachable over healthy terrestrial links */
  reachableStations: number;
  totalStations: number;
  /** spacecraft continue autonomous operation regardless of ground state */
  autonomous: boolean;
  stages: OrbitClassStage[];
  /** worst stage state — the headline for this class */
  worst: OrbitStageState;
  note: string;
}

export interface OrbitState {
  classes: OrbitClassState[];
  /** 0..1 mean service health across the orbital classes */
  orbitHealth: number;
  /** 0..1 mean reachability of mission-control / ground-segment infrastructure */
  controlHealth: number;
  /** ground stations currently reachable from at least one orbital class */
  reachableStations: number;
  totalStations: number;
  /** per-ground-station state, for the scene's station markers */
  stationStates: Record<string, StationState>;
}
