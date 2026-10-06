// Blast radius: simulated metrics, labelled as such, gauge-like transitions.

import { useEffect, useRef } from 'react';
import { REGION_LABEL } from '../core/types';
import { useBlackout } from '../state/store';
import { fmtPct01 } from './format';

const fmtInt = (v: number) => String(Math.round(v));
const fmtResilience = (v: number) => `${Math.round(v)} / 100`;
const fmtLatency = (v: number) => `+${Math.round(v)}%`;

const ROLL_MS = 380;

/**
 * Instrument-gauge roll: interpolates toward the target over ~380ms by writing
 * textContent through a ref — zero React re-renders. Ends exactly on target
 * (deterministic display, same formatter throughout, no extra decimals).
 * Reduced motion: instant values, no loop.
 */
function Rolled({ value, format }: { value: number; format: (v: number) => string }) {
  const reducedMotion = useBlackout((s) => s.reducedMotion);
  const node = useRef<HTMLElement>(null);
  const from = useRef(value);

  useEffect(() => {
    const el = node.current;
    const start = from.current;
    if (!el || reducedMotion || start === value) {
      if (el) el.textContent = format(value);
      from.current = value;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ROLL_MS);
      const eased = 1 - Math.pow(1 - k, 3);
      if (node.current) node.current.textContent = format(start + (value - start) * eased);
      if (k < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        from.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, format, reducedMotion]);

  return <span ref={node as React.RefObject<HTMLSpanElement>}>{format(value)}</span>;
}

export function BlastRadius() {
  const metrics = useBlackout((s) => s.snapshot.metrics);
  const reducedMotion = useBlackout((s) => s.reducedMotion);
  const rows: [string, number, (v: number) => string, string][] = [
    ['CONNECTIVITY RETAINED', metrics.connectivity, fmtPct01, 'simulated share of demand still served'],
    ['RESILIENCE SCORE', metrics.resilience, fmtResilience, 'composite model score, not a measurement'],
    ['TRAFFIC REROUTED', metrics.reroutedShare, fmtPct01, 'share of baseline demand on alternate paths'],
    ['DEMAND UNSERVED', metrics.unservedShare, fmtPct01, 'dropped for lack of surviving path'],
    ['ROUTES FAILED', metrics.failedRoutes, fmtInt, 'of simulated segments'],
    ['NODES UNREACHABLE', metrics.unreachableNodes, fmtInt, 'isolated or failed'],
    ['LATENCY SHIFT', metrics.latencyShiftPct, fmtLatency, 'representative path-stretch estimate'],
  ];
  const pair: [string, string] = [
    `${metrics.strainedRoutes} / ${metrics.overloadedRoutes}`,
    'utilisation ≥80% / >100%',
  ];
  const testid = (k: string) => `metric-${k.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <section aria-labelledby="bo-blast-h" className="bo-blast">
      <h2 id="bo-blast-h">
        BLAST RADIUS <span className="bo-sim-tag">SIMULATED</span>
      </h2>
      <dl className={reducedMotion ? 'bo-metric-grid' : 'bo-metric-grid bo-anim'}>
        {rows.map(([k, v, format, title]) => (
          <div key={k} title={title}>
            <dt>{k}</dt>
            <dd className="bo-mono" data-testid={testid(k)}>
              <Rolled value={v} format={format} />
            </dd>
          </div>
        ))}
        <div title={pair[1]}>
          <dt>STRAINED / OVERLOADED</dt>
          <dd className="bo-mono" data-testid={testid('STRAINED / OVERLOADED')}>
            <Rolled value={metrics.strainedRoutes} format={fmtInt} />
            {' / '}
            <Rolled value={metrics.overloadedRoutes} format={fmtInt} />
          </dd>
        </div>
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
