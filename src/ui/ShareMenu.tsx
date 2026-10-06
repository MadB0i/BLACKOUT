import { useState } from 'react';
import { copyText, currentShareUrl } from '../export/share';
import { exportScreenshot } from '../export/screenshot';
import { recordClip } from '../export/replayCapture';
import { useBlackout } from '../state/store';
import { fmtTime } from './format';

export function ShareMenu({ onClose }: { onClose: () => void }) {
  const scenarioId = useBlackout((s) => s.scenarioId);
  const seed = useBlackout((s) => s.seed);
  const metrics = useBlackout((s) => s.snapshot.metrics);
  const simT = useBlackout((s) => s.simT);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const say = (m: string) => setStatus(m);

  return (
    <div className="bo-share" role="dialog" aria-label="Share and export">
      <div className="bo-share-head">
        <h2>SHARE THIS BLACKOUT</h2>
        <button type="button" onClick={onClose} aria-label="Close share panel">✕</button>
      </div>
      <p className="bo-note">Links encode scenario + seed + failures, and reopen exactly.</p>
      <div className="bo-share-grid">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const ok = await copyText(currentShareUrl());
            say(ok ? 'Share link copied to clipboard.' : 'Copy failed — select the URL manually.');
          }}
        >
          COPY SHARE LINK
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const ok = await copyText(seed);
            say(ok ? `Seed copied: ${seed}` : 'Copy failed.');
          }}
        >
          COPY SEED
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await exportScreenshot({
              scenario: scenarioId,
              connectivityPct: `${(metrics.connectivity * 100).toFixed(1)}%`,
              resilience: metrics.resilience,
              simT: fmtTime(simT),
            });
            say(r.message);
            setBusy(false);
          }}
        >
          EXPORT PNG
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            say('Recording 10s replay — keep this tab visible…');
            const r = await recordClip(10);
            say(r.message);
            setBusy(false);
          }}
        >
          RECORD 10S CLIP
        </button>
      </div>
      <p className="bo-mono bo-seed-line" title="Deterministic replay seed">SEED · {seed}</p>
      {status && (
        <p className="bo-status" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
