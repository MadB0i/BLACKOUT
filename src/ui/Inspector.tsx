// Contextual inspector: what the selected thing is, and the big red button.

import { alternatePaths } from '../core/graph';
import { EDGES, NODES, edgeById, nodeById } from '../data/topology';
import { useBlackout } from '../state/store';
import { REGION_LABEL } from '../core/types';

export function Inspector() {
  const selection = useBlackout((s) => s.selection);
  const snapshot = useBlackout((s) => s.snapshot);
  const failures = useBlackout((s) => s.failures);
  const takeOffline = useBlackout((s) => s.takeOffline);
  const recover = useBlackout((s) => s.recover);
  const surge = useBlackout((s) => s.surge);
  const requestFocus = useBlackout((s) => s.requestFocus);
  const dismissHint = useBlackout((s) => s.dismissHint);

  if (!selection) {
    return (
      <section aria-labelledby="bo-insp-h" className="bo-inspector bo-empty">
        <h2 id="bo-insp-h">INSPECTOR</h2>
        <p>Select a route or a node — on the globe or in the route list — to inspect it.</p>
        <dl>
          <div><dt>ROUTES MODELLED</dt><dd className="bo-mono">{EDGES.length}</dd></div>
          <div><dt>NODES MODELLED</dt><dd className="bo-mono">{NODES.length}</dd></div>
          <div><dt>ACTIVE FAILURES</dt><dd className="bo-mono">{failures.length}</dd></div>
        </dl>
      </section>
    );
  }

  const selectEdge = (id: string) => useBlackout.getState().select({ kind: 'edge', id });

  if (selection.kind === 'edge') {
    const e = edgeById(selection.id);
    if (!e) return null;
    const rt = snapshot.edges[e.id];
    const a = nodeById(e.from)!;
    const b = nodeById(e.to)!;
    const failedSet = new Set(
      failures.filter((f) => f.kind === 'edge').map((f) => f.id),
    );
    const nodeFail = new Set(failures.filter((f) => f.kind === 'node').map((f) => f.id));
    const alts = alternatePaths(EDGES, NODES, e.from, e.to, failedSet, nodeFail);
    const isDown = rt?.status === 'failed';
    return (
      <section aria-labelledby="bo-insp-h" className="bo-inspector">
        <h2 id="bo-insp-h">INSPECTOR · ROUTE</h2>
        <p className="bo-inspect-title">{e.label}</p>
        <dl>
          <div><dt>TYPE</dt><dd>{e.kind.toUpperCase()} · {e.corridor.toUpperCase()}</dd></div>
          <div><dt>REGIONS</dt><dd>{REGION_LABEL[a.region]} ↔ {REGION_LABEL[b.region]}</dd></div>
          <div><dt>SIM CAPACITY</dt><dd className="bo-mono">{e.capacity}u · CLASS {e.capacity >= 90 ? 'TRUNK' : e.capacity >= 50 ? 'MAJOR' : 'FEEDER'}</dd></div>
          <div><dt>BASELINE LOAD</dt><dd className="bo-mono">{e.demand}u ({Math.round((e.demand / e.capacity) * 100)}%)</dd></div>
          <div><dt>LOAD NOW</dt><dd className="bo-mono">{isDown ? '— DOWN' : `${(rt?.load ?? 0).toFixed(0)}u (${Math.round((rt?.util ?? 0) * 100)}%)`}</dd></div>
          <div><dt>STATUS</dt><dd className={`bo-${rt?.status}`}>{(rt?.status ?? 'healthy').toUpperCase()}</dd></div>
          <div><dt>ALTERNATES</dt><dd className="bo-mono">{alts.length === 0 ? 'NONE — demand would drop' : `${alts.length} diverse path(s)`}</dd></div>
          <div><dt>SIM NOTE</dt><dd className="bo-note">{e.note}</dd></div>
        </dl>
        <div className="bo-actions">
          {!isDown ? (
            <button
              type="button"
              className="bo-danger"
              onClick={() => {
                takeOffline('edge', e.id);
                dismissHint();
                requestFocus((a.lon + b.lon) / 2, (a.lat + b.lat) / 2);
              }}
            >
              TAKE OFFLINE
            </button>
          ) : (
            <button type="button" className="bo-recover" onClick={() => recover('edge', e.id)}>
              RESTORE ROUTE
            </button>
          )}
          <button type="button" onClick={() => surge(e.id, 20)} title="Inject +20u of misdirected demand">
            SURGE +20
          </button>
          <button type="button" onClick={() => requestFocus((a.lon + b.lon) / 2, (a.lat + b.lat) / 2)}>
            FOCUS
          </button>
        </div>
        {alts.length > 0 && (
          <div className="bo-alts">
            <h3>DEPENDENCIES / ALTERNATES</h3>
            <ul>
              {alts.map((p, i) => (
                <li key={i} className="bo-mono">
                  PATH {i + 1} · {p.edgeIds.length} HOPS ·{' '}
                  {p.edgeIds.map((id) => (
                    <button key={id} type="button" className="bo-link" onClick={() => selectEdge(id)}>
                      {edgeById(id)?.label.split('·')[0].trim()}
                    </button>
                  )).reduce<React.ReactNode[]>((acc, el, j) => (j === 0 ? [el] : [...acc, ' → ', el]), [])}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  const n = nodeById(selection.id);
  if (!n) return null;
  const st = snapshot.nodes[n.id];
  const incident = EDGES.filter((e) => e.from === n.id || e.to === n.id);
  const isDown = st === 'failed' || st === 'isolated';
  return (
    <section aria-labelledby="bo-insp-h" className="bo-inspector">
      <h2 id="bo-insp-h">INSPECTOR · {n.kind.toUpperCase()}</h2>
      <p className="bo-inspect-title">{n.label}</p>
      <dl>
        <div><dt>REGION</dt><dd>{REGION_LABEL[n.region]}</dd></div>
        <div><dt>STATUS</dt><dd className={`bo-${st}`}>{(st ?? 'healthy').toUpperCase()}</dd></div>
        <div><dt>INCIDENT ROUTES</dt><dd className="bo-mono">{incident.length}</dd></div>
        <div><dt>SIM NOTE</dt><dd className="bo-note">{n.note}</dd></div>
      </dl>
      <ul className="bo-incident">
        {incident.map((e) => (
          <li key={e.id}>
            <button type="button" className="bo-link" onClick={() => selectEdge(e.id)}>
              {e.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="bo-actions">
        {!isDown ? (
          <button
            type="button"
            className="bo-danger"
            onClick={() => {
              takeOffline('node', n.id);
              dismissHint();
              requestFocus(n.lon, n.lat);
            }}
          >
            TAKE OFFLINE
          </button>
        ) : (
          <button type="button" className="bo-recover" onClick={() => recover('node', n.id)}>
            RESTORE NODE
          </button>
        )}
        <button type="button" onClick={() => requestFocus(n.lon, n.lat)}>FOCUS</button>
      </div>
    </section>
  );
}
