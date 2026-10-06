// Share-state serialisation: compact, versioned, sanitised.
// Format: base64url(JSON {v, scenario, seed, fails, t})

import type { Failure, FailureKind } from './types';

export interface ShareState {
  v: 1;
  scenario: string | null;
  seed: string;
  fails: Failure[];
  t: number;
}

const KINDS: FailureKind[] = ['edge', 'node', 'surge', 'recover-edge', 'recover-node'];
const ID_RE = /^[a-z0-9-]{1,40}$/;

function sanitiseFailures(input: unknown): Failure[] {
  if (!Array.isArray(input)) return [];
  const out: Failure[] = [];
  for (const f of input.slice(0, 64)) {
    if (typeof f !== 'object' || f === null) continue;
    const r = f as Record<string, unknown>;
    if (!KINDS.includes(r.kind as FailureKind)) continue;
    if (typeof r.id !== 'string' || !ID_RE.test(r.id)) continue;
    const at = typeof r.at === 'number' && Number.isFinite(r.at) ? Math.max(0, Math.min(3600, Math.floor(r.at))) : 0;
    const cause = typeof r.cause === 'string' ? r.cause.slice(0, 120) : 'shared replay';
    const amount =
      typeof r.amount === 'number' && Number.isFinite(r.amount) ? Math.max(0, Math.min(1000, r.amount)) : undefined;
    out.push({ kind: r.kind as FailureKind, id: r.id, at, cause, amount });
  }
  out.sort((a, b) => a.at - b.at);
  return out;
}

export function encodeShare(state: ShareState): string {
  const compact: ShareState = {
    v: 1,
    scenario: typeof state.scenario === 'string' ? state.scenario.slice(0, 40) : null,
    seed: state.seed.slice(0, 40),
    fails: sanitiseFailures(state.fails),
    t: Math.max(0, Math.min(3600, Math.floor(state.t))),
  };
  const json = JSON.stringify(compact);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShare(raw: string): ShareState | null {
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (parsed.v !== 1) return null;
    return {
      v: 1,
      scenario: typeof parsed.scenario === 'string' ? parsed.scenario.slice(0, 40) : null,
      seed: typeof parsed.seed === 'string' ? parsed.seed.slice(0, 40) : 'shared',
      fails: sanitiseFailures(parsed.fails),
      t: typeof parsed.t === 'number' && Number.isFinite(parsed.t) ? Math.max(0, Math.min(3600, parsed.t)) : 0,
    };
  } catch {
    return null;
  }
}

export function shareUrlFor(state: ShareState, base: string): string {
  return `${base}?s=${encodeShare(state)}`;
}
