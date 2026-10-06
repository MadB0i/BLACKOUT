import { useState } from 'react';
import { useBlackout } from '../state/store';
import { fmtTime, systemState } from './format';
import { ShareMenu } from './ShareMenu';

export function TopStrip() {
  const simT = useBlackout((s) => s.simT);
  const metrics = useBlackout((s) => s.snapshot.metrics);
  const failures = useBlackout((s) => s.failures);
  const scenarioId = useBlackout((s) => s.scenarioId);
  const reducedMotion = useBlackout((s) => s.reducedMotion);
  const quality = useBlackout((s) => s.quality);
  const setReducedMotion = useBlackout((s) => s.setReducedMotion);
  const setQuality = useBlackout((s) => s.setQuality);
  const reset = useBlackout((s) => s.reset);
  const [shareOpen, setShareOpen] = useState(false);

  const state = systemState(metrics, failures.length);

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
        <span className={`bo-state bo-state-${state.toLowerCase()}`} data-testid="system-state">
          {state}
        </span>
        {scenarioId && <span className="bo-scenario-tag">{scenarioId.toUpperCase()}</span>}
      </div>

      <div className="bo-top-right">
        <div className="bo-conn" title="Simulated global connectivity retained">
          <span className="bo-kicker">CONNECTIVITY</span>
          <strong data-testid="connectivity">{(metrics.connectivity * 100).toFixed(1)}%</strong>
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
