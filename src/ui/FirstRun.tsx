import { useEffect, useState } from 'react';
import { useBlackout } from '../state/store';

const KEY = 'blackout:hint-seen';

/** First-run prompt. No tour modal — one line, then it never returns. */
export function FirstRun() {
  const failures = useBlackout((s) => s.failures);
  const selection = useBlackout((s) => s.selection);
  const [seen, setSeen] = useState(() => {
    try {
      return window.localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if ((selection || failures.length > 0) && !seen) {
      try {
        window.localStorage.setItem(KEY, '1');
      } catch {
        /* private mode: session-only */
      }
      setSeen(true);
    }
  }, [selection, failures.length, seen]);

  if (seen) return null;
  return (
    <div className="bo-firstrun" role="status">
      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.setItem(KEY, '1');
          } catch {
            /* ignore */
          }
          setSeen(true);
        }}
      >
        SELECT SOMETHING THE INTERNET DEPENDS ON <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
