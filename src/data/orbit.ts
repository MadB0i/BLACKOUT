// SYNTHETIC ORBITAL / GROUND-SEGMENT DATASET — SIMPLIFIED EDUCATIONAL MODEL.
//
// Disclaimer: every orbital element below is invented for teaching. Class
// definitions are deliberately generic (GNSS/timing, LEO connectivity,
// weather, Earth observation, mission control) rather than specific
// constellations; altitudes, inclinations, station sites and station counts
// are plausible but fictional. Ground stations are anchored to the existing
// synthetic terrestrial nodes so the dependency path is traceable on one
// model instead of two unrelated datasets.
//
// Scientific framing: a terrestrial outage does NOT take a spacecraft offline.
// Spacecraft in these classes keep flying and keep their on-board autonomy.
// What degrades is everything the spacecraft needs the ground segment for —
// telemetry delivery, command uplink, timing corrections, and the
// dissemination of their products to users. That is what this layer models.

import type { OrbitClassId, OrbitStageId } from '../core/types';
import { NODE_IDS } from './topology';

export interface OrbitStation {
  id: string;
  /** terrestrial node id this ground station rides on */
  nodeId: string;
  label: string;
  /** synthetic callsign shown as a selective label in ORBIT view */
  callsign: string;
}

export interface OrbitClassDef {
  id: OrbitClassId;
  label: string;
  short: string;
  /** synthetic altitude in km, used only for track separation */
  altitudeKm: number;
  /** orbit inclination in degrees (synthetic) */
  inclinationDeg: number;
  /** deterministic phase offset for the track and its markers */
  phaseRad: number;
  /** how many sparse markers represent this class (kept tiny on purpose) */
  markers: number;
  stations: OrbitStation[];
  /** which dependency stages this class actually depends on */
  stages: OrbitStageId[];
  /** what the class does with the ground link — shown in the inspector */
  service: string;
  lesson: string;
}

export const ORBIT_CLASSES: OrbitClassDef[] = [
  {
    id: 'ground',
    label: 'MISSION CONTROL / GROUND SEGMENT',
    short: 'CONTROL',
    altitudeKm: 0,
    inclinationDeg: 0,
    phaseRad: 0,
    markers: 0,
    stations: [
      { id: 'gs-dublin', nodeId: 'dublin', label: 'Dublin Mission Ops', callsign: 'DUB-1' },
      { id: 'gs-houston', nodeId: 'newyork', label: 'East-coast Ops', callsign: 'NYC-1' },
      { id: 'gs-singapore', nodeId: 'singapore', label: 'Asia-Pacific Ops', callsign: 'SIN-1' },
    ],
    stages: ['ground-segment'],
    service: 'Control centres and their terrestrial reachability — the first thing that breaks.',
    lesson: 'Ground segments are ordinary terrestrial facilities. They inherit every cable, power and backhaul dependency the rest of the mesh has.',
  },
  {
    id: 'gnss',
    label: 'GNSS / TIMING',
    short: 'GNSS',
    altitudeKm: 20200,
    inclinationDeg: 55,
    phaseRad: 0.6,
    markers: 3,
    stations: [
      { id: 'gs-keystone', nodeId: 'losangeles', label: 'Timing reference site', callsign: 'Lax-R' },
      { id: 'gs-esa', nodeId: 'frankfurt', label: 'Timing reference site', callsign: 'Fra-R' },
      { id: 'gs-mccmurdo', nodeId: 'johannesburg', label: 'Southern timing site', callsign: 'Jnb-R' },
    ],
    stages: ['ground-segment', 'timing', 'dissemination'],
    service: 'Broadcasts its own clock; uses the ground segment for ephemeris corrections and integrity data.',
    lesson: 'Positioning satellites keep broadcasting through a ground outage. What degrades is correction accuracy and the availability of integrity warnings.',
  },
  {
    id: 'weather',
    label: 'WEATHER',
    short: 'WX',
    altitudeKm: 830,
    inclinationDeg: 98.6,
    phaseRad: 2.1,
    markers: 2,
    stations: [
      { id: 'gs-svalbard', nodeId: 'london', label: 'Polar downlink', callsign: 'LON-P' },
      { id: 'gs-melbourne', nodeId: 'sydney', label: 'Southern downlink', callsign: 'Syd-D' },
    ],
    stages: ['ground-segment', 'telemetry', 'dissemination'],
    service: 'Delivers observations continuously and disseminates products that expire in hours.',
    lesson: 'Weather data is perishable. A late downlink means a stale forecast, not a dead satellite.',
  },
  {
    id: 'eo',
    label: 'EARTH OBSERVATION',
    short: 'EO',
    altitudeKm: 705,
    inclinationDeg: 98,
    phaseRad: 4.0,
    markers: 2,
    stations: [
      { id: 'gs-troll', nodeId: 'dubai', label: 'Equatorial downlink', callsign: 'DXB-D' },
      { id: 'gs-santiago', nodeId: 'saopaulo', label: 'Southern downlink', callsign: 'SAO-D' },
    ],
    stages: ['ground-segment', 'telemetry', 'dissemination'],
    service: 'Streams bulk observation data that is queued, processed in cloud regions, then distributed.',
    lesson: 'Earth observation depends on terrestrial backhaul twice: downlink, then cloud processing. Both can bottleneck without the spacecraft noticing.',
  },
  {
    id: 'leo',
    label: 'LEO CONNECTIVITY',
    short: 'LEO',
    altitudeKm: 550,
    inclinationDeg: 53,
    phaseRad: 5.2,
    markers: 3,
    stations: [
      { id: 'gs-canary', nodeId: 'marseille', label: 'Gateway cluster', callsign: 'MRS-G' },
      { id: 'gs-anchorage', nodeId: 'losangeles', label: 'Gateway cluster', callsign: 'LAX-G' },
      { id: 'gs-svalbard2', nodeId: 'cairo', label: 'Gateway cluster', callsign: 'CAI-G' },
    ],
    stages: ['ground-segment', 'command', 'dissemination'],
    service: 'Routes user-terminal traffic to a gateway, then hands it to the terrestrial internet.',
    lesson: 'A user terminal is only as good as its gateway backhaul. Beam in view is worthless if the gateway cannot reach the internet.',
  },
];

export const ORBIT_CLASS_BY_ID = new Map(ORBIT_CLASSES.map((c) => [c.id, c]));

/** Every ground station, de-duplicated by terrestrial node. */
export const ORBIT_STATIONS: OrbitStation[] = ORBIT_CLASSES.flatMap((c) => c.stations);

export const ORBIT_STATION_BY_ID = new Map(ORBIT_STATIONS.map((s) => [s.id, s]));

/** Every station at a terrestrial node — two classes can share one modelled city. */
export const ORBIT_STATIONS_BY_NODE = new Map<string, OrbitStation[]>();
for (const s of ORBIT_STATIONS) {
  const list = ORBIT_STATIONS_BY_NODE.get(s.nodeId);
  if (list) list.push(s);
  else ORBIT_STATIONS_BY_NODE.set(s.nodeId, [s]);
}

/** Classes with an actual orbit track (everything except the ground segment). */
export const ORBITAL_CLASSES = ORBIT_CLASSES.filter((c) => c.markers > 0);

/** Integrity guard: every ground station must sit on a real modelled node. */
export function validateOrbitData(): string[] {
  const errors: string[] = [];
  for (const c of ORBIT_CLASSES) {
    for (const s of c.stations) {
      if (!NODE_IDS.has(s.nodeId)) errors.push(`${c.id}: unknown ground-station node ${s.nodeId}`);
    }
    if (c.stations.length === 0) errors.push(`${c.id}: no ground stations`);
  }
  return errors;
}