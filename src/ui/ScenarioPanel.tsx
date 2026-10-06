import { useMemo, useState } from 'react';
import { SCENARIOS } from '../data/scenarios';
import { EDGES } from '../data/topology';
import { useBlackout, type Layers } from '../state/store';

const LAYER_LABEL: { key: keyof Layers; label: string }[] = [
  { key: 'submarine', label: 'SUBMARINE' },
  { key: 'terrestrial', label: 'TERRESTRIAL' },
  { key: 'cloud', label: 'CLOUD' },
  { key: 'dns', label: 'DNS' },
];

export function ScenarioPanel() {
  const scenarioId = useBlackout((s) => s.scenarioId);
  const loadScenario = useBlackout((s) => s.loadScenario);
  const startChaos = useBlackout((s) => s.startChaos);
  const layers = useBlackout((s) => s.layers);
  const toggleLayer = useBlackout((s) => s.toggleLayer);
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
      <section aria-labelledby="bo-scen-h">
        <h2 id="bo-scen-h">SCENARIO LIBRARY</h2>
        <ol className="bo-scen-list">
          {SCENARIOS.map((sc) => (
            <li key={sc.id}>
              <button
                type="button"
                className={scenarioId === sc.id ? 'is-active' : ''}
                onClick={() => loadScenario(sc.id)}
                aria-pressed={scenarioId === sc.id}
              >
                <span className="bo-scen-title">{sc.title}</span>
                <span className="bo-intensity" aria-label={`intensity ${sc.intensity} of 5`}>
                  {'●'.repeat(sc.intensity)}
                  {'○'.repeat(5 - sc.intensity)}
                </span>
                <span className="bo-scen-premise">{sc.premise}</span>
              </button>
            </li>
          ))}
        </ol>
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

      <section aria-labelledby="bo-layers-h">
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
