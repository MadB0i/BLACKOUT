// IMPACT INTELLIGENCE CONSOLE — one planetary-mesh instrument.
//
// A single vertical composition, in strict priority order: dominant system
// state, one primary reading, metric groups by system meaning (FLOW / FAILURE
// / STRESS), the orbital dependency chain, then regional impact. Structural
// hairlines and typography carry the hierarchy — no widget boxes, no cards,
// no decorative charts. Every number is computed by the simulation.

import { useMemo } from 'react';
import { useBlackout } from '../state/store';
import { ORBIT_CLASSES } from '../data/orbit';
import { getScenario } from '../data/scenarios';
import { ORBIT_STAGE_LABEL } from '../core/types';
import type { OrbitStageState } from '../core/types';
import { CoreInstrument } from './CoreInstrument';
import { Rolled } from './Rolled';
import {
  CHAIN_ORDER,
  CHAIN_SHORT,
  REGION_SHORT,
  consoleMode,
  coreLabel,
  domainStateLabel,
  fmtInt,
  fmtLatency,
  fmtPct01,
  impactBand,
  isPreviewing,
  worstStageState,
} from './format';

/** Only regions with a meaningful share of demand affected. */
const IMPACT_FLOOR = 0.02;
const MAX_REGIONS = 5;

type Band = 'ok' | 'warn' | 'bad';

interface MetricRow {
  key: string;
  label: string;
  value: number;
  format: (v: number) => string;
  title: string;
  band: Band;
  hero?: boolean;
  /** second interpolated number, e.g. strained / overloaded */
  extra?: { value: number; format: (v: number) => string };
}

const testid = (k: string) => `metric-${k.toLowerCase().replace(/[^a-z]+/g, '-')}`;

function MetricGroup({ name, rows }: { name: string; rows: MetricRow[] }) {
  return (
    <div className="bo-mgroup">
      <h4>{name}</h4>
      <dl>
        {rows.map((r) => (
          <div key={r.key} title={r.title} className={`bo-mrow${r.hero ? ' bo-mrow-hero' : ''} bo-band-${r.band}`}>
            <dt>{r.label}</dt>
            <dd className="bo-mono" data-testid={testid(r.key)}>
              <Rolled value={r.value} format={r.format} />
              {r.extra && (
                <>
                  {' / '}
                  <Rolled value={r.extra.value} format={r.extra.format} />
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** One dependency stage, aggregated across the orbital classes that define it. */
function ChainRow({ stage }: { stage: (typeof CHAIN_ORDER)[number] }) {
  const orbit = useBlackout((s) => s.orbit);
  const armed = useBlackout((s) => s.armed);
  const previewing = isPreviewing(armed);
  const state = previewing && armed ? armed.orbit : orbit;
  const per = useMemo(
    () =>
      ORBIT_CLASSES.filter((c) => c.id !== 'ground')
        .map((def) => {
          const cs = state.classes.find((c) => c.classId === def.id);
          const found = cs?.stages.find((s) => s.stage === stage);
          return found ? { short: def.short, state: found.state } : null;
        })
        .filter((v): v is { short: string; state: OrbitStageState } => v !== null),
    [state, stage],
  );
  if (per.length === 0) return null;
  const worst = worstStageState(per.map((p) => p.state));
  const okCount = per.filter((p) => p.state === 'nominal').length;
  return (
    <li className={`bo-chain-row is-${worst}`}>
      <span className="bo-chain-name">{CHAIN_SHORT[stage]}</span>
      <span className="bo-chain-band" aria-hidden="true">
        {per.map((p) => (
          <i key={p.short} className={`is-${p.state}`} title={`${p.short}: ${p.state}`} />
        ))}
      </span>
      <span className="bo-mono bo-chain-level">
        {worst === 'nominal' ? `${okCount}/${per.length}` : worst.toUpperCase()}
      </span>
      <span className="bo-sr">
        {ORBIT_STAGE_LABEL[stage]}: {per.map((p) => `${p.short} ${p.state}`).join(', ')}
      </span>
    </li>
  );
}

export function ImpactConsole() {
  const snapshot = useBlackout((s) => s.snapshot);
  const orbit = useBlackout((s) => s.orbit);
  const failures = useBlackout((s) => s.failures);
  const armed = useBlackout((s) => s.armed);
  const view = useBlackout((s) => s.view);
  const scenario = useMemo(() => getScenario(armed?.scenarioId ?? null), [armed]);

  const previewing = isPreviewing(armed);
  // While armed, the console reads the projected end state of the scenario so
  // the operator can see the cost before committing to PLAY.
  const metrics = previewing && armed ? armed.metrics : snapshot.metrics;
  const orbitState = previewing && armed ? armed.orbit : orbit;
  const header = consoleMode(metrics, failures, armed);
  // The dependency headline must never claim a degradation that has not
  // happened yet, so while armed it is explicitly marked as projected.
  const orbitHeadlineText = `${previewing ? 'PROJECTED · ' : ''}${domainStateLabel(orbitState)}`;

  const regions = useMemo(
    () => metrics.regionImpact.filter((r) => r.impact >= IMPACT_FLOOR).slice(0, MAX_REGIONS),
    [metrics],
  );

  const flow: MetricRow[] = [
    {
      key: 'CONNECTIVITY RETAINED',
      label: 'CONNECTIVITY RETAINED',
      value: metrics.connectivity,
      format: fmtPct01,
      title: 'simulated share of demand still served',
      band: impactBand(1 - metrics.connectivity),
      hero: true,
    },
    {
      key: 'TRAFFIC REROUTED',
      label: 'TRAFFIC REROUTED',
      value: metrics.reroutedShare,
      format: fmtPct01,
      title: 'share of baseline demand on alternate paths',
      band: metrics.reroutedShare > 0.001 ? 'warn' : 'ok',
    },
    {
      key: 'DEMAND UNSERVED',
      label: 'DEMAND UNSERVED',
      value: metrics.unservedShare,
      format: fmtPct01,
      title: 'dropped for lack of surviving path',
      band: metrics.unservedShare > 0.001 ? 'bad' : 'ok',
    },
  ];
  const failure: MetricRow[] = [
    {
      key: 'ROUTES FAILED',
      label: 'ROUTES FAILED',
      value: metrics.failedRoutes,
      format: fmtInt,
      title: 'of simulated segments',
      band: metrics.failedRoutes > 0 ? 'bad' : 'ok',
    },
    {
      key: 'NODES UNREACHABLE',
      label: 'NODES UNREACHABLE',
      value: metrics.unreachableNodes,
      format: fmtInt,
      title: 'isolated or failed',
      band: metrics.unreachableNodes > 0 ? 'bad' : 'ok',
    },
  ];
  const stress: MetricRow[] = [
    {
      key: 'LATENCY SHIFT',
      label: 'LATENCY SHIFT',
      value: metrics.latencyShiftPct,
      format: fmtLatency,
      title: 'representative path-stretch estimate',
      band: metrics.latencyShiftPct > 20 ? 'warn' : 'ok',
    },
    {
      key: 'STRAINED / OVERLOADED',
      label: 'STRAINED / OVERLOADED',
      value: metrics.strainedRoutes,
      format: fmtInt,
      title: 'utilisation ≥80% / >100%',
      band: metrics.strainedRoutes + metrics.overloadedRoutes > 0 ? 'warn' : 'ok',
      extra: { value: metrics.overloadedRoutes, format: fmtInt },
    },
  ];

  return (
    <section
      aria-labelledby="bo-console-h"
      className={previewing ? 'bo-console is-projected' : 'bo-console is-live'}
    >
      <header className={`bo-console-head bo-tone-${header.tone}`}>
        <h2 id="bo-console-h">IMPACT INTELLIGENCE</h2>
        <p className="bo-console-mode" data-testid="console-mode">
          <span className="bo-mode-mark" aria-hidden="true" />
          {header.mode}
        </p>
        <p className="bo-console-detail bo-mono">{header.detail}</p>
      </header>

      <CoreInstrument
        value={metrics.connectivity}
        resilience={metrics.resilience / 100}
        projected={previewing}
        label={coreLabel(metrics.connectivity)}
      />

      {previewing && armed && scenario && (
        <div className="bo-brief" data-testid="scenario-brief">
          <h3>
            SCENARIO BRIEF<span className="bo-mono">{scenario.code}</span>
          </h3>
          <p className="bo-brief-mech">{scenario.mechanics}</p>
          <p className="bo-brief-lesson">{scenario.lesson}</p>
        </div>
      )}

      <div className="bo-mgroups">
        <MetricGroup name="FLOW" rows={flow} />
        <MetricGroup name="FAILURE" rows={failure} />
        <MetricGroup name="STRESS" rows={stress} />
      </div>

      {view !== 'network' && (
        <div className="bo-depchain" data-testid="orbit-ladder">
          <h3>
            ORBIT DEPENDENCY <span className="bo-dep-syn">SYNTHETIC MODEL</span>
          </h3>
          <p className="bo-console-detail bo-mono" data-testid="orbit-headline">
            {orbitHeadlineText}
          </p>
          <ol className="bo-chain">
            {CHAIN_ORDER.map((stage) => (
              <ChainRow key={stage} stage={stage} />
            ))}
          </ol>
          <p className="bo-autonomy">
            <span className="bo-ok-mark" aria-hidden="true" />
            Spacecraft remain in autonomous operation.
          </p>
        </div>
      )}

      <div className="bo-regions">
        <h3>
          REGIONAL IMPACT <span className="bo-region-scale">0–100</span>
        </h3>
        {regions.length === 0 ? (
          <p className="bo-region-none">NONE · NO DISPLACED DEMAND</p>
        ) : (
          <ul className="bo-region-rows">
            {regions.map((r) => {
              const band = impactBand(r.impact);
              const filled = Math.max(1, Math.round(r.impact * 10));
              return (
                <li key={r.region} className={`bo-region-row bo-band-${band}`}>
                  <span className="bo-region-name">{REGION_SHORT[r.region] ?? r.region}</span>
                  <span className="bo-region-bar" aria-hidden="true">
                    {Array.from({ length: 10 }, (_, i) => (
                      <i key={i} className={i < filled ? 'is-on' : ''} />
                    ))}
                  </span>
                  <span className="bo-mono bo-region-pct">
                    <Rolled value={r.impact} format={(v) => `${Math.round(v * 100)}`} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
