import { useEffect, useRef } from 'react';
import { GlobeView } from './scene/Globe';
import { advanceClock, useBlackout } from './state/store';
import { BlastRadius } from './ui/BlastRadius';
import { FirstRun } from './ui/FirstRun';
import { Inspector } from './ui/Inspector';
import { ScenarioPanel } from './ui/ScenarioPanel';
import { Timeline } from './ui/Timeline';
import { TopStrip } from './ui/TopStrip';

export default function App() {
  const reducedMotion = useBlackout((s) => s.reducedMotion);
  const seed = useBlackout((s) => s.seed);
  const quality = useBlackout((s) => s.quality);
  const notice = useBlackout((s) => s.notice);

  // Deep-link: ?s=<share token> recreates the scenario.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('s');
    if (!raw) return;
    const ok = useBlackout.getState().applyShare(raw);
    useBlackout.getState().notify(ok ? 'Shared blackout loaded — press PLAY to replay.' : 'Share link was invalid; starting clean.');
    window.history.replaceState(null, '', window.location.pathname);
    if (!ok) return;
  }, []);

  // Single simulation clock: throttle store writes to 10Hz; pulses stay 60fps in-scene.
  const acc = useRef(0);
  const last = useRef(0);
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const dt = last.current ? (now - last.current) / 1000 : 0;
      last.current = now;
      acc.current += dt;
      if (acc.current >= 0.1) {
        advanceClock(acc.current);
        acc.current = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard: full control without a mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      const s = useBlackout.getState();
      if (e.code === 'Space') {
        e.preventDefault();
        s.setPlaying(!s.playing);
      } else if (e.key === 'ArrowRight') {
        s.setPlaying(false);
        s.setSimT(s.simT + 2);
      } else if (e.key === 'ArrowLeft') {
        s.setPlaying(false);
        s.setSimT(s.simT - 2);
      } else if (e.key === 'r' || e.key === 'R') {
        s.reset();
      } else if (e.key === 'Escape') {
        s.select(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`bo-app${reducedMotion ? ' bo-reduced' : ''}`}>
      <a href="#bo-main" className="bo-skip">
        Skip to globe
      </a>
      <TopStrip />
      <ScenarioPanel />
      <main id="bo-main" className="bo-center" tabIndex={-1} aria-label="Simulation viewport">
        <GlobeView />
        <FirstRun />
        <p className="bo-model-note" role="note">
          SIMPLIFIED EDUCATIONAL MODEL — NOT LIVE DATA · SEED <span className="bo-mono">{seed}</span> · Q:
          {quality.toUpperCase()} <span className="bo-keys">· KEYS <span className="bo-mono">SPACE ⏯ ←/→ ±2s R reset ESC clear</span></span>
        </p>
        {notice && (
          <p className="bo-notice" role="status">
            {notice}
          </p>
        )}
      </main>
      <div className="bo-right">
        <Inspector />
        <BlastRadius />
      </div>
      <Timeline />
    </div>
  );
}
