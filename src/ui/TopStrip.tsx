// Top strip: identity, system state, the three dependency domains and controls.

import { useState } from 'react';
import { useBlackout } from '../state/store';
import { fmtTime, systemState } from './format';
import { ShareMenu } from './ShareMenu';

function DomainReadout({
  label,
  value,
  testId,
  title,
}: {
  label: string;
  value: number;
  testId: string;
  title: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const band = pct >= 99 ? 'ok' : pct >= 60 ? 'warn' : 'bad';
  return (
    <div className={`bo-domain is-${band}`} title={title}>
      <span className="bo-kicker">{label}</span>
      <strong className="bo-mono" data-testid={testId}>
        {pct}%
      </strong>
    </div>
  );
}

export function TopStrip() {
  const simT = useBlackout((s) => s.simT);
  const metrics = useBlackout((s) => s.snapshot.metrics);
  const orbit = useBlackout((s) => s.orbit);
  const failures = useBlackout((s) => s.failures);
  const scenarioId = useBlackout((s) => s.scenarioId);
  const armed = useBlackout((s) => s.armed);
  const reducedMotion = useBlackout((s) => s.reducedMotion);
  const quality = useBlackout((s) => s.quality);
  const setReducedMotion = useBlackout((s) => s.setReducedMotion);
  const setQuality = useBlackout((s) => s.setQuality);
  const reset = useBlackout((s) => s.reset);
  const [shareOpen, setShareOpen] = useState(false);

  // The banner always reports live reality: an armed scenario has not happened
  // yet, so it must not paint the global mesh as strained.
  const state = systemState(metrics, armed ? 0 : failures.length);
  const domainMetrics = armed?.metrics ?? metrics;
  const domainOrbit = armed?.orbit ?? orbit;

  return (
    <header className="bo-top" role="banner">
      <div className="bo-brand">
        <span className="bo-mark" aria-hidden="true">
          <span className="bo-mark-cut" />
        </span>
        <div className="bo-brand-text">
          <h1 translate="no">BLACKOUT</h1>
          <p>BREAK THE INTERNET · WATCH WHAT SURVIVES</p>
        </div>
      </div>

      <div className="bo-sysstat" aria-live="polite">
        <span className="bo-kicker">SIM T+{fmtTime(simT)}</span>
        <span
          key={state}
          className={`bo-state bo-state-hit bo-state-${state.toLowerCase()}`}
          data-testid="system-state"
        >
          {state}
        </span>
        {scenarioId && <span className="bo-scenario-tag">{scenarioId.toUpperCase()}</span>}
        {armed && (
          <span className="bo-armed-tag" data-testid="armed-tag">
            ARMED · PRESS PLAY
          </span>
        )}
      </div>

      <div className="bo-top-right">
        <div className={`bo-domains${armed ? ' is-projected' : ''}`} role="group" aria-label={armed ? 'Projected dependency domains' : 'Dependency domains'}>
          {armed && <span className="bo-domains-mode">◇ PROJECTED</span>}
          <DomainReadout
            label="MESH"
            value={domainMetrics.connectivity}
            testId="connectivity"
            title="Simulated global connectivity retained"
          />
          <DomainReadout
            label="ORBIT"
            value={domainOrbit.orbitHealth}
            testId="domain-orbit"
            title="Ground-dependent orbital services reachable (synthetic model)"
          />
          <DomainReadout
            label="CONTROL"
            value={domainOrbit.controlHealth}
            testId="domain-control"
            title="Mission-control / ground-segment reachability"
          />
        </div>
        <nav className="bo-top-actions" aria-label="Simulation controls">
          <button type="button" onClick={() => setShareOpen((v) => !v)} aria-expanded={shareOpen}>
            SHARE
          </button>
          <button
            type="button"
            onClick={() => setReducedMotion(!reducedMotion)}
            aria-pressed={reducedMotion}
            title="Toggle reduced motion"
          >
            {reducedMotion ? 'MOTION: MIN' : 'MOTION: FULL'}
          </button>
          <button
            type="button"
            onClick={() => setQuality(quality === 'auto' ? 'high' : quality === 'high' ? 'low' : 'auto')}
            title="Render quality tier"
          >
            Q:{quality.toUpperCase()}
          </button>
          <button type="button" onClick={reset} title="Reset simulation (R)">
            RESET
          </button>
        </nav>
      </div>
      {shareOpen && <ShareMenu onClose={() => setShareOpen(false)} />}
    </header>
  );
}
