// RESILIENCE / CONNECTIVITY CORE — a technical system readout.
//
// A sparse 5%-step scale with annotated quarter divisions, one dominant
// percentage, and a caption line carrying the LIVE vs PROJECTED distinction
// plus the composite resilience index. No box chrome, no speedometer sweep:
// the number leads, the scale supports it. Motion is limited to the rolling
// number and a single settle flash when the value changes.

import { useMemo } from 'react';
import { Rolled } from './Rolled';
import { fmtPct01, fmtResilience, impactBand } from './format';

/** A linear 5% calibration scale, separate from the reading zone below. */
const TICKS = 21;
/** Quarter divisions carry scale numerals. */
const MAJOR_EVERY = 5;

export function CoreInstrument({
  value,
  resilience,
  projected,
  label,
}: {
  /** 0..1 connectivity retained */
  value: number;
  /** 0..1 composite resilience index, shown as a quiet caption */
  resilience: number;
  projected: boolean;
  label: string;
}) {
  const band = impactBand(1 - value);
  const ticks = useMemo(
    () =>
      Array.from({ length: TICKS }, (_, i) => {
        const t = i / (TICKS - 1);
        const lit = t <= value + 1e-9;
        const major = i % MAJOR_EVERY === 0;
        const x = 12 + t * 240;
        return { key: i, x, lit, major, num: Math.round(t * 100) };
      }),
    [value],
  );

  return (
    <div className={`bo-core bo-core-${band}`} data-testid="core-instrument">
      <svg viewBox="0 0 264 40" className="bo-core-dial" role="img" aria-hidden="true">
        {ticks.map((t) => (
          <line
            key={t.key}
            x1={t.x}
            y1={t.major ? 22 : 27}
            x2={t.x}
            y2={36}
            className={`bo-tick${t.major ? ' is-major' : ''}${t.lit ? ' is-lit' : ''}`}
          />
        ))}
        {ticks
          .filter((t) => t.major)
          .map((t) => (
            <text
              key={`n-${t.key}`}
              x={t.x}
              y={9}
              textAnchor="middle"
              dominantBaseline="central"
              className="bo-tick-num"
            >
              {t.num}
            </text>
          ))}
      </svg>
      <div className="bo-core-face">
        {/* keyed so the settle flash replays exactly once per value change */}
        <p className="bo-core-value bo-mono" data-testid="core-value" key={`v-${Math.round(value * 400)}`}>
          <Rolled value={value} format={fmtPct01} />
        </p>
        <p className="bo-core-label">{label}</p>
      </div>
      <p className="bo-core-foot bo-mono">
        <span className="bo-live-mark" aria-hidden="true">
          {projected ? '◇' : '●'}
        </span>
        {projected ? 'PROJECTED' : 'LIVE'} · RESILIENCE{' '}
        <Rolled value={resilience} format={fmtResilience} testId="metric-resilience-score" />
      </p>
    </div>
  );
}
