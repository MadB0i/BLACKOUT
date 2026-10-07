// Instrument-gauge number roll. Interpolates toward the target over ~380ms by
// writing textContent through a ref — zero React re-renders. Ends exactly on
// target (deterministic display, same formatter throughout).
// Reduced motion: instant values, no loop.

import { useEffect, useRef } from 'react';
import { useBlackout } from '../state/store';

const ROLL_MS = 380;

export function Rolled({
  value,
  format,
  className,
  testId,
}: {
  value: number;
  format: (v: number) => string;
  className?: string;
  testId?: string;
}) {
  const reducedMotion = useBlackout((s) => s.reducedMotion);
  const node = useRef<HTMLSpanElement>(null);
  const from = useRef(value);

  useEffect(() => {
    const el = node.current;
    const start = from.current;
    if (!el || reducedMotion || start === value) {
      if (el) el.textContent = format(value);
      from.current = value;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ROLL_MS);
      const eased = 1 - Math.pow(1 - k, 3);
      if (node.current) node.current.textContent = format(start + (value - start) * eased);
      if (k < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        from.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, format, reducedMotion]);

  return (
    <span ref={node} className={className} data-testid={testId}>
      {format(value)}
    </span>
  );
}