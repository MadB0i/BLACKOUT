// Blast radius: simulated metrics, labelled as such, staged numeric transitions.

import { REGION_LABEL } from '../core/types';
import { useBlackout } from '../state/store';
import { fmtPct01 } from './format';

export function BlastRadius() {
  const metrics = useBlackout((s) => s.snapshot.metrics);
  const reducedMotion = useBlackout((s) => s.reducedMotion);
  const rows: [string, string, string][] = [
    ['CONNECTIVITY RETAINED', fmtPct01(metrics.connectivity), 'simulated share of demand still served'],
    ['RESILIENCE SCORE', `${metrics.resilience} / 100`, 'composite model score, not a measurement'],
    ['TRAFFIC REROUTED', fmtPct01(metrics.reroutedShare), 'share of baseline demand on alternate paths'],
    ['DEMAND UNSERVED', fmtPct01(metrics.unservedShare), 'dropped for lack of surviving path'],
    ['ROUTES FAILED', String(metrics.failedRoutes), 'of simulated segments'],
    ['STRAINED / OVERLOADED', `${metrics.strainedRoutes} / ${metrics.overloadedRoutes}`, 'utilisation ≥80% / >100%'],
    ['NODES UNREACHABLE', String(metrics.unreachableNodes), 'isolated or failed'],
    ['LATENCY SHIFT', `+${metrics.latencyShiftPct}%`, 'representative path-stretch estimate'],
  ];
  return (
    <section aria-labelledby="bo-blast-h" className="bo-blast">
      <h2 id="bo-blast-h">
        BLAST RADIUS <span className="bo-sim-tag">SIMULATED</span>
      </h2>
      <dl className={reducedMotion ? 'bo-metric-grid' : 'bo-metric-grid bo-anim'}>
        {rows.map(([k, v, title]) => (
          <div key={k} title={title}>
            <dt>{k}</dt>
            <dd className="bo-mono" data-testid={`metric-${k.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="bo-regions">
        <h3>REGIONS AFFECTED</h3>
        {metrics.degradedRegions.length === 0 ? (
          <p className="bo-ok">NONE — mesh nominal.</p>
        ) : (
          <ul>
            {metrics.degradedRegions.map((r) => (
              <li key={r} className="bo-mono">
                {REGION_LABEL[r as keyof typeof REGION_LABEL] ?? r}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
