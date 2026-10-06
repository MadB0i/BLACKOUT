// BLACKOUT simplified educational topology.
// DISCLAIMER: synthetic model. City coordinates are geographic facts used for
// placement; capacities, demands, latencies and corridor names are INVENTED
// for teaching and carry no operational meaning. See docs/DATA_SOURCES.md.

import type { SimEdge, SimNode } from '../core/types';

export const NODES: SimNode[] = [
  { id: 'ashburn', label: 'Ashburn · US-East Hub', kind: 'hub', region: 'NAM', lat: 39.04, lon: -77.49, capacity: 100, demand: 40, note: 'Major peering + cloud-adjacent backbone hub (model abstraction).' },
  { id: 'newyork', label: 'New York Landing', kind: 'landing', region: 'NAM', lat: 40.71, lon: -74.0, capacity: 90, demand: 34, note: 'Transatlantic cable landing + metro handoff (simulated).' },
  { id: 'losangeles', label: 'Los Angeles Landing', kind: 'landing', region: 'NAM', lat: 34.05, lon: -118.24, capacity: 80, demand: 30, note: 'Transpacific landing + metro handoff (simulated).' },
  { id: 'dublin', label: 'Dublin Landing', kind: 'landing', region: 'EUR', lat: 53.35, lon: -6.26, capacity: 70, demand: 26, note: 'Transatlantic landing point (simulated).' },
  { id: 'london', label: 'London Exchange', kind: 'ixp', region: 'EUR', lat: 51.5, lon: -0.13, capacity: 100, demand: 42, note: 'Exchange/gateway abstraction: many networks meet here (simulated).' },
  { id: 'amsterdam', label: 'Amsterdam Exchange', kind: 'ixp', region: 'EUR', lat: 52.37, lon: 4.9, capacity: 85, demand: 34, note: 'Exchange/gateway abstraction (simulated).' },
  { id: 'frankfurt', label: 'Frankfurt Exchange', kind: 'ixp', region: 'EUR', lat: 50.11, lon: 8.68, capacity: 95, demand: 38, note: 'Exchange/gateway abstraction (simulated).' },
  { id: 'marseille', label: 'Marseille Landing', kind: 'landing', region: 'EUR', lat: 43.3, lon: 5.37, capacity: 70, demand: 26, note: 'Mediterranean + Suez-bound landing (simulated).' },
  { id: 'fortaleza', label: 'Fortaleza Landing', kind: 'landing', region: 'SAM', lat: -3.73, lon: -38.52, capacity: 40, demand: 14, note: 'Atlantic landing for South America (simulated).' },
  { id: 'saopaulo', label: 'São Paulo Hub', kind: 'hub', region: 'SAM', lat: -23.55, lon: -46.63, capacity: 60, demand: 24, note: 'Regional backbone hub (simulated).' },
  { id: 'lagos', label: 'Lagos Hub', kind: 'hub', region: 'AFR', lat: 6.45, lon: 3.39, capacity: 45, demand: 18, note: 'West-African handoff hub (simulated).' },
  { id: 'cairo', label: 'Cairo Landing', kind: 'landing', region: 'AFR', lat: 30.04, lon: 31.24, capacity: 55, demand: 20, note: 'Suez-corridor landing (simulated).' },
  { id: 'johannesburg', label: 'Johannesburg Hub', kind: 'hub', region: 'AFR', lat: -26.2, lon: 28.05, capacity: 40, demand: 15, note: 'Southern-African hub (simulated).' },
  { id: 'dubai', label: 'Dubai Landing', kind: 'landing', region: 'MEA', lat: 25.2, lon: 55.27, capacity: 60, demand: 22, note: 'Gulf handoff + Red-Sea corridor (simulated).' },
  { id: 'mumbai', label: 'Mumbai Hub', kind: 'hub', region: 'SAS', lat: 19.08, lon: 72.88, capacity: 75, demand: 30, note: 'South-Asian hub (simulated).' },
  { id: 'singapore', label: 'Singapore Hub', kind: 'hub', region: 'SEA', lat: 1.35, lon: 103.82, capacity: 95, demand: 40, note: 'SE-Asian interconnection hub (simulated).' },
  { id: 'hongkong', label: 'Hong Kong Hub', kind: 'hub', region: 'EAS', lat: 22.32, lon: 114.17, capacity: 85, demand: 34, note: 'East-Asian hub (simulated).' },
  { id: 'seoul', label: 'Seoul Hub', kind: 'hub', region: 'EAS', lat: 37.57, lon: 126.98, capacity: 60, demand: 22, note: 'Northeast-Asian hub (simulated).' },
  { id: 'tokyo', label: 'Tokyo Hub', kind: 'hub', region: 'EAS', lat: 35.68, lon: 139.69, capacity: 90, demand: 36, note: 'Transpacific + intra-Asian hub (simulated).' },
  { id: 'sydney', label: 'Sydney Hub', kind: 'hub', region: 'OCE', lat: -33.87, lon: 151.21, capacity: 55, demand: 20, note: 'Oceania hub, few diverse paths (simulated).' },
  { id: 'cloud-use1', label: 'Cloud Region US-EAST', kind: 'cloud', region: 'NAM', lat: 38.2, lon: -78.6, capacity: 120, demand: 44, note: 'Cloud-region abstraction: concentrated compute + storage demand.' },
  { id: 'cloud-euw1', label: 'Cloud Region EU-WEST', kind: 'cloud', region: 'EUR', lat: 51.9, lon: -2.4, capacity: 120, demand: 46, note: 'Cloud-region abstraction (simulated demand sink).' },
  { id: 'cloud-apse1', label: 'Cloud Region AP-SE', kind: 'cloud', region: 'SEA', lat: 1.9, lon: 103.1, capacity: 110, demand: 40, note: 'Cloud-region abstraction (simulated demand sink).' },
  { id: 'dns-na', label: 'DNS Anycast · N. America', kind: 'dns', region: 'NAM', lat: 40.2, lon: -79.6, capacity: 30, demand: 8, note: 'DNS infrastructure abstraction (anycast instance).' },
  { id: 'dns-eu', label: 'DNS Anycast · Europe', kind: 'dns', region: 'EUR', lat: 49.4, lon: 9.6, capacity: 30, demand: 8, note: 'DNS infrastructure abstraction (anycast instance).' },
  { id: 'dns-ap', label: 'DNS Anycast · Asia-Pacific', kind: 'dns', region: 'SEA', lat: 0.6, lon: 104.4, capacity: 30, demand: 8, note: 'DNS infrastructure abstraction (anycast instance).' },
];

// capacity/demand in synthetic units; ~55–70% baseline utilisation by design.
export const EDGES: SimEdge[] = [
  // — Transatlantic —
  { id: 'e-tat-n1', label: 'TAT-N1 · New York ↔ Dublin', kind: 'submarine', from: 'newyork', to: 'dublin', capacity: 120, demand: 55, latencyMs: 62, corridor: 'North Atlantic', note: 'Simulated transatlantic segment. One of diverse northern crossings.' },
  { id: 'e-tat-n2', label: 'TAT-N2 · New York ↔ London', kind: 'submarine', from: 'newyork', to: 'london', capacity: 120, demand: 55, latencyMs: 65, corridor: 'North Atlantic', note: 'Simulated transatlantic segment.' },
  { id: 'e-tat-n3', label: 'TAT-N3 · New York ↔ Amsterdam', kind: 'submarine', from: 'newyork', to: 'amsterdam', capacity: 110, demand: 50, latencyMs: 68, corridor: 'North Atlantic', note: 'Simulated transatlantic segment.' },
  { id: 'e-tat-w1', label: 'TAT-W1 · Ashburn ↔ Dublin', kind: 'submarine', from: 'ashburn', to: 'dublin', capacity: 70, demand: 28, latencyMs: 58, corridor: 'North Atlantic', note: 'Simulated western diverse crossing — landing-point diversity for Ireland.' },
  // — Americas —
  { id: 'e-am-1', label: 'AM-1 · New York ↔ Fortaleza', kind: 'submarine', from: 'newyork', to: 'fortaleza', capacity: 60, demand: 28, latencyMs: 72, corridor: 'Americas Atlantic', note: 'Simulated Americas corridor.' },
  { id: 'e-am-2', label: 'AM-2 · New York ↔ São Paulo', kind: 'submarine', from: 'newyork', to: 'saopaulo', capacity: 55, demand: 26, latencyMs: 85, corridor: 'Americas Atlantic', note: 'Simulated Americas corridor.' },
  { id: 'e-br-1', label: 'BR-1 · Fortaleza ↔ São Paulo', kind: 'terrestrial', from: 'fortaleza', to: 'saopaulo', capacity: 45, demand: 22, latencyMs: 28, corridor: 'Brazil backhaul', note: 'Simulated terrestrial backhaul.' },
  { id: 'e-sat-3', label: 'SAT-3 · Fortaleza ↔ Lagos', kind: 'submarine', from: 'fortaleza', to: 'lagos', capacity: 60, demand: 26, latencyMs: 88, corridor: 'South Atlantic', note: 'Simulated South-Atlantic crossing.' },
  { id: 'e-sat-4', label: 'SAT-4 · São Paulo ↔ Lagos', kind: 'submarine', from: 'saopaulo', to: 'lagos', capacity: 35, demand: 15, latencyMs: 78, corridor: 'South Atlantic', note: 'Simulated South-Atlantic crossing.' },
  // — North America terrestrial —
  { id: 'e-na-1', label: 'NA-1 · Los Angeles ↔ New York', kind: 'terrestrial', from: 'losangeles', to: 'newyork', capacity: 95, demand: 50, latencyMs: 45, corridor: 'US backbone', note: 'Simulated coast-to-coast backbone.' },
  { id: 'e-na-2', label: 'NA-2 · Ashburn ↔ New York', kind: 'terrestrial', from: 'ashburn', to: 'newyork', capacity: 100, demand: 60, latencyMs: 8, corridor: 'US backbone', note: 'Simulated metro backbone.' },
  { id: 'e-na-3', label: 'NA-3 · Ashburn ↔ Los Angeles', kind: 'terrestrial', from: 'ashburn', to: 'losangeles', capacity: 85, demand: 42, latencyMs: 40, corridor: 'US backbone', note: 'Simulated coast-to-coast backbone.' },
  // — Europe terrestrial —
  { id: 'e-eu-1', label: 'EU-1 · Marseille ↔ London', kind: 'terrestrial', from: 'marseille', to: 'london', capacity: 95, demand: 42, latencyMs: 22, corridor: 'European backbone', note: 'Simulated European backbone.' },
  { id: 'e-eu-2', label: 'EU-2 · London ↔ Frankfurt', kind: 'terrestrial', from: 'london', to: 'frankfurt', capacity: 120, demand: 58, latencyMs: 12, corridor: 'European backbone', note: 'Simulated European backbone.' },
  { id: 'e-eu-3', label: 'EU-3 · Frankfurt ↔ Amsterdam', kind: 'terrestrial', from: 'frankfurt', to: 'amsterdam', capacity: 110, demand: 50, latencyMs: 8, corridor: 'European backbone', note: 'Simulated European backbone.' },
  { id: 'e-eu-4', label: 'EU-4 · Dublin ↔ London', kind: 'terrestrial', from: 'dublin', to: 'london', capacity: 120, demand: 48, latencyMs: 10, corridor: 'European backbone', note: 'Simulated landing backhaul (diverse parallel paths abstracted).' },
  // — Suez / Mediterranean / Middle East —
  { id: 'e-med-1', label: 'MED-1 · Marseille ↔ Cairo', kind: 'submarine', from: 'marseille', to: 'cairo', capacity: 80, demand: 44, latencyMs: 48, corridor: 'Suez corridor', note: 'Simulated Suez-corridor segment — a known chokepoint archetype.' },
  { id: 'e-med-2', label: 'MED-2 · Marseille ↔ Dubai', kind: 'submarine', from: 'marseille', to: 'dubai', capacity: 70, demand: 36, latencyMs: 70, corridor: 'Suez corridor', note: 'Simulated Suez-corridor segment.' },
  { id: 'e-rs-1', label: 'RS-1 · Cairo ↔ Dubai', kind: 'submarine', from: 'cairo', to: 'dubai', capacity: 55, demand: 26, latencyMs: 45, corridor: 'Red Sea', note: 'Simulated Red-Sea segment.' },
  // — Africa —
  { id: 'e-af-1', label: 'AF-1 · Lagos ↔ Cairo', kind: 'terrestrial', from: 'lagos', to: 'cairo', capacity: 60, demand: 24, latencyMs: 55, corridor: 'African backbone', note: 'Simulated trans-African path.' },
  { id: 'e-af-2', label: 'AF-2 · Lagos ↔ Johannesburg', kind: 'terrestrial', from: 'lagos', to: 'johannesburg', capacity: 35, demand: 16, latencyMs: 48, corridor: 'African backbone', note: 'Simulated trans-African path.' },
  // — Indian Ocean —
  { id: 'e-io-w1', label: 'IO-W1 · Dubai ↔ Mumbai', kind: 'submarine', from: 'dubai', to: 'mumbai', capacity: 60, demand: 30, latencyMs: 30, corridor: 'Arabian Sea', note: 'Simulated Arabian-Sea segment.' },
  { id: 'e-io-e1', label: 'IO-E1 · Mumbai ↔ Singapore', kind: 'submarine', from: 'mumbai', to: 'singapore', capacity: 85, demand: 48, latencyMs: 55, corridor: 'Indian Ocean', note: 'Simulated Indian-Ocean trunk.' },
  { id: 'e-io-e2', label: 'IO-E2 · Dubai ↔ Singapore', kind: 'submarine', from: 'dubai', to: 'singapore', capacity: 75, demand: 40, latencyMs: 62, corridor: 'Indian Ocean', note: 'Simulated Indian-Ocean trunk.' },
  { id: 'e-io-e3', label: 'IO-E3 · Mumbai ↔ Hong Kong', kind: 'submarine', from: 'mumbai', to: 'hongkong', capacity: 60, demand: 30, latencyMs: 58, corridor: 'Indian Ocean', note: 'Simulated Asia trunk.' },
  { id: 'e-io-s1', label: 'IO-S1 · Johannesburg ↔ Mumbai', kind: 'submarine', from: 'johannesburg', to: 'mumbai', capacity: 40, demand: 18, latencyMs: 85, corridor: 'Indian Ocean', note: 'Simulated southern trunk.' },
  { id: 'e-io-s2', label: 'IO-S2 · Johannesburg ↔ Sydney', kind: 'submarine', from: 'johannesburg', to: 'sydney', capacity: 25, demand: 10, latencyMs: 140, corridor: 'Southern Ocean', note: 'Simulated thin southern path — high latency, low capacity.' },
  // — Asia-Pacific —
  { id: 'e-ap-e1', label: 'AP-E1 · Singapore ↔ Hong Kong', kind: 'submarine', from: 'singapore', to: 'hongkong', capacity: 90, demand: 52, latencyMs: 38, corridor: 'South China Sea', note: 'Simulated busy intra-Asia trunk.' },
  { id: 'e-ap-e2', label: 'AP-E2 · Hong Kong ↔ Tokyo', kind: 'submarine', from: 'hongkong', to: 'tokyo', capacity: 85, demand: 50, latencyMs: 42, corridor: 'East China Sea', note: 'Simulated intra-Asia trunk.' },
  { id: 'e-ap-e3', label: 'AP-E3 · Singapore ↔ Seoul', kind: 'submarine', from: 'singapore', to: 'seoul', capacity: 60, demand: 30, latencyMs: 68, corridor: 'East Asia', note: 'Simulated intra-Asia trunk.' },
  { id: 'e-ap-e4', label: 'AP-E4 · Seoul ↔ Tokyo', kind: 'submarine', from: 'seoul', to: 'tokyo', capacity: 65, demand: 34, latencyMs: 18, corridor: 'East Asia', note: 'Simulated short-haul segment.' },
  { id: 'e-ap-e5', label: 'AP-E5 · Seoul ↔ Hong Kong', kind: 'submarine', from: 'seoul', to: 'hongkong', capacity: 55, demand: 28, latencyMs: 34, corridor: 'East Asia', note: 'Simulated intra-Asia trunk.' },
  { id: 'e-ap-s1', label: 'AP-S1 · Tokyo ↔ Sydney', kind: 'submarine', from: 'tokyo', to: 'sydney', capacity: 50, demand: 24, latencyMs: 120, corridor: 'Western Pacific', note: 'Simulated Pacific trunk.' },
  { id: 'e-ap-s2', label: 'AP-S2 · Singapore ↔ Sydney', kind: 'submarine', from: 'singapore', to: 'sydney', capacity: 55, demand: 26, latencyMs: 95, corridor: 'Western Pacific', note: 'Simulated Pacific trunk.' },
  // — Transpacific —
  { id: 'e-tp-n1', label: 'TP-N1 · Los Angeles ↔ Tokyo', kind: 'submarine', from: 'losangeles', to: 'tokyo', capacity: 100, demand: 58, latencyMs: 118, corridor: 'North Pacific', note: 'Simulated transpacific trunk.' },
  { id: 'e-tp-c1', label: 'TP-C1 · Los Angeles ↔ Hong Kong', kind: 'submarine', from: 'losangeles', to: 'hongkong', capacity: 80, demand: 44, latencyMs: 130, corridor: 'Central Pacific', note: 'Simulated transpacific trunk.' },
  { id: 'e-tp-s1', label: 'TP-S1 · Los Angeles ↔ Sydney', kind: 'submarine', from: 'losangeles', to: 'sydney', capacity: 45, demand: 20, latencyMs: 165, corridor: 'South Pacific', note: 'Simulated thin transpacific path.' },
  // — Cloud attachments —
  { id: 'e-cl-1', label: 'CL-1 · Cloud US-EAST ↔ Ashburn', kind: 'cloud', from: 'cloud-use1', to: 'ashburn', capacity: 120, demand: 70, latencyMs: 4, corridor: 'Cloud metro', note: 'Simulated cloud interconnect.' },
  { id: 'e-cl-2', label: 'CL-2 · Cloud US-EAST ↔ New York', kind: 'cloud', from: 'cloud-use1', to: 'newyork', capacity: 80, demand: 40, latencyMs: 10, corridor: 'Cloud metro', note: 'Simulated cloud interconnect.' },
  { id: 'e-cl-3', label: 'CL-3 · Cloud EU-WEST ↔ London', kind: 'cloud', from: 'cloud-euw1', to: 'london', capacity: 120, demand: 72, latencyMs: 6, corridor: 'Cloud metro', note: 'Simulated cloud interconnect.' },
  { id: 'e-cl-4', label: 'CL-4 · Cloud EU-WEST ↔ Frankfurt', kind: 'cloud', from: 'cloud-euw1', to: 'frankfurt', capacity: 90, demand: 48, latencyMs: 10, corridor: 'Cloud metro', note: 'Simulated cloud interconnect.' },
  { id: 'e-cl-5', label: 'CL-5 · Cloud AP-SE ↔ Singapore', kind: 'cloud', from: 'cloud-apse1', to: 'singapore', capacity: 110, demand: 64, latencyMs: 5, corridor: 'Cloud metro', note: 'Simulated cloud interconnect.' },
  { id: 'e-cl-6', label: 'CL-6 · Cloud AP-SE ↔ Hong Kong', kind: 'cloud', from: 'cloud-apse1', to: 'hongkong', capacity: 70, demand: 34, latencyMs: 30, corridor: 'Cloud backbone', note: 'Simulated cloud interconnect.' },
  { id: 'e-cl-7', label: 'CL-7 · US-EAST ↔ EU-WEST', kind: 'cloud', from: 'cloud-use1', to: 'cloud-euw1', capacity: 60, demand: 28, latencyMs: 65, corridor: 'Inter-region replication', note: 'Simulated inter-region replication path.' },
  { id: 'e-cl-8', label: 'CL-8 · EU-WEST ↔ AP-SE', kind: 'cloud', from: 'cloud-euw1', to: 'cloud-apse1', capacity: 55, demand: 26, latencyMs: 110, corridor: 'Inter-region replication', note: 'Simulated inter-region replication path.' },
  { id: 'e-cl-9', label: 'CL-9 · US-EAST ↔ AP-SE', kind: 'cloud', from: 'cloud-use1', to: 'cloud-apse1', capacity: 45, demand: 20, latencyMs: 150, corridor: 'Inter-region replication', note: 'Simulated inter-region replication path.' },
  // — DNS anycast —
  { id: 'e-dns-1', label: 'DNS-1 · Anycast NA ↔ Ashburn', kind: 'dns', from: 'dns-na', to: 'ashburn', capacity: 30, demand: 12, latencyMs: 5, corridor: 'DNS anycast', note: 'Simulated DNS attachment.' },
  { id: 'e-dns-2', label: 'DNS-2 · Anycast NA ↔ New York', kind: 'dns', from: 'dns-na', to: 'newyork', capacity: 25, demand: 10, latencyMs: 8, corridor: 'DNS anycast', note: 'Simulated DNS attachment.' },
  { id: 'e-dns-3', label: 'DNS-3 · Anycast EU ↔ London', kind: 'dns', from: 'dns-eu', to: 'london', capacity: 30, demand: 12, latencyMs: 6, corridor: 'DNS anycast', note: 'Simulated DNS attachment.' },
  { id: 'e-dns-4', label: 'DNS-4 · Anycast EU ↔ Frankfurt', kind: 'dns', from: 'dns-eu', to: 'frankfurt', capacity: 25, demand: 10, latencyMs: 8, corridor: 'DNS anycast', note: 'Simulated DNS attachment.' },
  { id: 'e-dns-5', label: 'DNS-5 · Anycast AP ↔ Singapore', kind: 'dns', from: 'dns-ap', to: 'singapore', capacity: 30, demand: 11, latencyMs: 5, corridor: 'DNS anycast', note: 'Simulated DNS attachment.' },
  { id: 'e-dns-6', label: 'DNS-6 · Anycast AP ↔ Tokyo', kind: 'dns', from: 'dns-ap', to: 'tokyo', capacity: 25, demand: 10, latencyMs: 40, corridor: 'DNS anycast', note: 'Simulated DNS attachment.' },
  { id: 'e-dns-7', label: 'DNS-SYNC-1 · NA ↔ EU sync', kind: 'dns', from: 'dns-na', to: 'dns-eu', capacity: 15, demand: 6, latencyMs: 65, corridor: 'DNS sync', note: 'Simulated zone-sync path.' },
  { id: 'e-dns-8', label: 'DNS-SYNC-2 · EU ↔ AP sync', kind: 'dns', from: 'dns-eu', to: 'dns-ap', capacity: 15, demand: 6, latencyMs: 110, corridor: 'DNS sync', note: 'Simulated zone-sync path.' },
];

export const NODE_IDS = new Set(NODES.map((n) => n.id));
export const EDGE_IDS = new Set(EDGES.map((e) => e.id));

export function edgeById(id: string) {
  return EDGES.find((e) => e.id === id);
}
export function nodeById(id: string) {
  return NODES.find((n) => n.id === id);
}
