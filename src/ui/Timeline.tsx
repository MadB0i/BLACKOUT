// Timeline + replay transport. Visual state derives from simT, so scrubbing,
// stepping and replay are exact by construction.

import { useEffect, useRef } from 'react';
import { useBlackout } from '../state/store';
import { fmtTime } from './format';

export function Timeline() {
  const simT = useBlackout((s) => s.simT);
  const horizon = useBlackout((s) => s.horizon);
  const playing = useBlackout((s) => s.playing);
  const projected = useBlackout((s) => s.armed !== null);
  const speed = useBlackout((s) => s.speed);
  const events = useBlackout((s) => s.snapshot.events);
  const reducedMotion = useBlackout((s) => s.reducedMotion);
  const setSimT = useBlackout((s) => s.setSimT);
  const setPlaying = useBlackout((s) => s.setPlaying);
  const setSpeed = useBlackout((s) => s.setSpeed);
  const stripRef = useRef<HTMLOListElement>(null);
  const seenCount = useRef(0);

  const step = (d: number) => {
    setPlaying(false);
    setSimT(simT + d);
  };
  const restart = () => {
    setSimT(0);
    setPlaying(true);
  };

  // Follow the newest event — but never yank the strip while the user reads history.
  useEffect(() => {
    const el = stripRef.current;
    if (!el || reducedMotion) {
      seenCount.current = events.length;
      return;
    }
    if (events.length > seenCount.current) {
      const nearEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 48;
      if (nearEnd) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }
    seenCount.current = events.length;
  }, [events, events.length, reducedMotion]);

  return (
    <footer className={`bo-timeline${projected ? ' is-projected' : ''}`} aria-label="Event timeline and replay transport">
      <div className="bo-transport" role="group" aria-label="Replay transport">
        <button type="button" onClick={() => setPlaying(!playing)} aria-pressed={playing} data-testid="play-pause">
          {playing ? '❚❚ PAUSE' : '▶ PLAY'}
        </button>
        <button type="button" onClick={() => step(-2)} aria-label="Step back 2 seconds">−2s</button>
        <button type="button" onClick={() => step(2)} aria-label="Step forward 2 seconds">+2s</button>
        <button type="button" onClick={restart}>↺ REPLAY</button>
        <label className="bo-speed">
          SPEED
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Playback speed">
            {[1, 2, 4].map((v) => (
              <option key={v} value={v}>{v}×</option>
            ))}
          </select>
        </label>
        <span className="bo-mono bo-clock" aria-live="off">
          {projected && <span className="bo-timeline-mode">PROJECTED EVENTS · </span>}
          T+{fmtTime(simT)} / {fmtTime(horizon)}
        </span>
      </div>
      <input
        type="range"
        className="bo-scrub"
        min={0}
        max={Math.max(1, Math.floor(horizon))}
        step={1}
        value={Math.floor(simT)}
        onChange={(e) => setSimT(Number(e.target.value))}
        aria-label="Scrub simulation time"
      />
      <ol ref={stripRef} className="bo-events" aria-label="Simulation event log" aria-live="polite">
        {events.length === 0 && <li className="bo-event bo-info">Mesh nominal. Break something.</li>}
        {events.map((e, i) => (
          <li key={`${e.t}-${e.type}-${i}`}>
            <button
              type="button"
              className={`bo-event bo-${e.severity}${projected || e.t > simT ? ' bo-event-projected' : ''}${i === events.length - 1 ? ' bo-event-latest' : ''}`}
              onClick={() => {
                setPlaying(false);
                setSimT(e.t);
              }}
              title={`${projected || e.t > simT ? 'Projected event · ' : ''}Jump to T+${fmtTime(e.t)}`}
            >
              <span className="bo-mono">{fmtTime(e.t)}</span>
              <span className="bo-event-body">
                {(projected || e.t > simT) && <span className="bo-sr">Projected: </span>}
                <strong>{e.type}</strong>
                <span>{e.message}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </footer>
  );
}
