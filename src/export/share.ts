// Share-link helpers bound to the live store state.

import { encodeShare } from '../core/serialize';
import { useBlackout } from '../state/store';

export function currentShareToken(): string {
  const s = useBlackout.getState();
  return encodeShare({
    v: 1,
    scenario: s.scenarioId,
    seed: s.seed,
    fails: s.failures,
    t: Math.floor(s.simT),
  });
}

export function currentShareUrl(): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?s=${currentShareToken()}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}
