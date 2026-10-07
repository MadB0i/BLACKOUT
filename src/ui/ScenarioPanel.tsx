// SCENARIO LIBRARY — mission-control entries, not documentation.
// Panel order is the interaction order: choose the telemetry domain (VIEW),
// enable infrastructure layers, then arm an incident. Each scenario row is an
// instrument control with a dedicated ARM action zone. Hover previews the
// affected routes on the globe; clicking arms the scenario at T+00:00 (it
// never starts the clock).

import { useMemo, useState } from 'react';
import { SCENARIOS } from '../data/scenarios';
import { EDGES } from '../data/topology';
import { useBlackout, type Layers, type View } from '../state/store';

const LAYER_LABEL: { key: keyof Layers; label: string }[] = [
  { key: 'submarine', label: 'SUBMARINE' },
  { key: 'terrestrial', label: 'TERRESTRIAL' },
  { key: 'cloud', label: 'CLOUD' },
  { key: 'dns', label: 'DNS' },
];

const VIEW_LABEL: { key: View; label: string; title: string }[] = [
  { key: 'network', label: 'NETWORK', title: 'Terrestrial infrastructure only' },
  { key: 'orbit', label: 'ORBIT', title: 'Synthetic orbital infrastructure and its ground dependencies' },
  { key: 'hybrid', label: 'HYBRID', title: 'Both dependency domains together' },
];

function SeverityMeter({ level, label }: { level: number; label: string }) {
  return (
    <span className="bo-sev" title={`Severity ${label} (${level} of 5)`}>
      <span className="bo-sr">
        Severity {label}, {level} of 5
      </span>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= level ? 'is-on' : ''} aria-hidden="true" />
      ))}
    </span>
  );
}

export function ScenarioPanel() {
  const scenarioId = useBlackout((s) => s.scenarioId);
  const lifecycle = useBlackout((s) =>
    !s.scenarioId ? 'idle' : s.armed ? 'armed' : s.simT >= s.horizon ? 'complete' : s.playing ? 'live' : 'paused',
  );
  const lifecycleLabel = { idle: 'ARM', armed: 'ARMED', live: 'LIVE', paused: 'PAUSED', complete: 'DONE' }[lifecycle];
  const hoverScenarioId = useBlackout((s) => s.hoverScenarioId);
  const loadScenario = useBlackout((s) => s.loadScenario);
  const hoverScenario = useBlackout((s) => s.hoverScenario);
  const startChaos = useBlackout((s) => s.startChaos);
  const layers = useBlackout((s) => s.layers);
  const toggleLayer = useBlackout((s) => s.toggleLayer);
  const view = useBlackout((s) => s.view);
  const setView = useBlackout((s) => s.setView);
  const select = useBlackout((s) => s.select);
  const selection = useBlackout((s) => s.selection);
  const snapshot = useBlackout((s) => s.snapshot);
  const [filter, setFilter] = useState('');
  const [chaosSeed, setChaosSeed] = useState('blackout-chaos-prime');

  const routes = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return EDGES.filter((e) => !f || e.label.toLowerCase().includes(f) || e.corridor.toLowerCase().includes(f));
  }, [filter]);

  return (
    <aside className="bo-left" aria-label="Scenarios and infrastructure">
      <div className="bo-viewbar">
        <section aria-labelledby="bo-view-h" className="bo-view-sec">
          <h2 id="bo-view-h">VIEW</h2>
          <div className="bo-seg" role="group" aria-label="Dependency domain">
            {VIEW_LABEL.map(({ key, label, title }) => (
              <button
                key={key}
                type="button"
                className={view === key ? 'is-on' : ''}
                aria-pressed={view === key}
                title={title}
                onClick={() => setView(key)}
                data-testid={`view-${key}`}
              >
                {label}
              </button>
            ))}
          </div>
          {view !== 'network' && (
            <p
              className="bo-note bo-orbit-note"
              role="note"
              title="Orbit layer is a synthetic educational model: generic classes, invented stations and altitudes. Spacecraft keep flying; only ground-dependent services degrade."
            >
              SYNTHETIC EDUCATIONAL MODEL · S/C AUTONOMOUS
            </p>
          )}
        </section>

        <section aria-labelledby="bo-layers-h" className="bo-layers-sec">
          <h2 id="bo-layers-h">LAYERS</h2>
          <div className="bo-layers" role="group" aria-label="Infrastructure layers">
            {LAYER_LABEL.map(({ key, label }) => (
              <label key={key} className="bo-check">
                <input type="checkbox" checked={layers[key]} onChange={() => toggleLayer(key)} />
                {label}
              </label>
            ))}
          </div>
        </section>
      </div>

      <section aria-labelledby="bo-scen-h" className="bo-scenarios">
        <h2 id="bo-scen-h">
          SCENARIO LIBRARY <span className="bo-hint">SELECT TO ARM</span>
        </h2>
        <ol className="bo-scen-list">
          {SCENARIOS.map((sc) => {
            const active = scenarioId === sc.id;
            const previewed = hoverScenarioId === sc.id;
            const severity = sc.intensity >= 5 ? 'SEVERE' : sc.intensity >= 4 ? 'HIGH' : sc.intensity >= 3 ? 'MODERATE' : 'LOW';
            return (
              <li key={sc.id} className="bo-scen">
                <button
                  type="button"
                  className={`bo-scen-btn${active ? ` is-${lifecycle}` : ''}${previewed && !active ? ' is-preview' : ''}`}
                  data-state={active ? lifecycle : 'idle'}
                  data-testid={`scenario-${sc.id}`}
                  onClick={() => loadScenario(sc.id)}
                  onPointerEnter={() => hoverScenario(sc.id)}
                  onPointerLeave={() => hoverScenario(null)}
                  onFocus={() => hoverScenario(sc.id)}
                  onBlur={() => hoverScenario(null)}
                  aria-pressed={active}
                >
                  <span className="bo-scen-rail" aria-hidden="true" />
                  <span className="bo-scen-code bo-mono">{sc.code}</span>
                  <span className="bo-scen-main">
                    <span className="bo-scen-title">{sc.title}</span>
                    <span className="bo-scen-premise">{sc.premise}</span>
                    <span className="bo-scen-meta">
                      <span className="bo-scen-domain">{sc.domain.toUpperCase()}</span>
                      <SeverityMeter level={sc.intensity} label={severity} />
                    </span>
                    <span className="bo-sr">
                      {sc.dependency} {active ? `${lifecycle === 'complete' ? 'Run complete' : lifecycleLabel}.` : 'Select to arm this scenario.'}
                    </span>
                  </span>
                  <span className="bo-scen-go" aria-hidden="true">
                    <span className="bo-scen-go-t">{active ? lifecycleLabel : 'ARM'}</span>
                    <span className="bo-scen-go-a">{!active ? '→' : lifecycle === 'complete' ? '✓' : lifecycle === 'paused' ? 'Ⅱ' : '●'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="bo-scen-help bo-note">
          {{
            idle: 'ARM loads the plan at T+00:00 · PLAY executes.',
            armed: 'Armed · press PLAY to execute.',
            live: 'Simulation active · run in progress.',
            paused: 'Simulation paused · PLAY to resume.',
            complete: 'Run complete · REPLAY or RESET.',
          }[lifecycle]}
        </p>
        <form
          className="bo-chaos-seed"
          onSubmit={(e) => {
            e.preventDefault();
            startChaos(chaosSeed.trim() || undefined);
          }}
        >
          <label htmlFor="chaos-seed">CHAOS SEED</label>
          <div className="bo-row">
            <input
              id="chaos-seed"
              className="bo-mono"
              value={chaosSeed}
              onChange={(e) => setChaosSeed(e.target.value)}
              spellCheck={false}
              maxLength={40}
            />
            <button type="submit">START</button>
          </div>
        </form>
      </section>

      <section aria-labelledby="bo-routes-h" className="bo-routes">
        <h2 id="bo-routes-h">ROUTES · {routes.length}</h2>
        <input
          type="search"
          placeholder="Filter routes…"
          aria-label="Filter routes"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <ul>
          {routes.length === 0 && (
            <li className="bo-route-empty">No routes match this filter.</li>
          )}
          {routes.map((e) => {
            const rt = snapshot.edges[e.id];
            const st = rt?.status ?? 'healthy';
            const active = selection?.kind === 'edge' && selection.id === e.id;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  className={`bo-route bo-${st}${active ? ' is-active' : ''}`}
                  onClick={() => select({ kind: 'edge', id: e.id })}
                >
                  <span className="bo-dot" aria-hidden="true" />
                  <span className="bo-route-label">{e.label}</span>
                  <span className="bo-mono bo-route-util">
                    {st === 'failed' ? 'DOWN' : `${Math.round((rt?.util ?? 0) * 100)}%`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
