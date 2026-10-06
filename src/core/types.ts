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
