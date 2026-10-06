import { describe, expect, it } from 'vitest';
import { hashSeed, mulberry32, rngFor } from '../../src/core/rng';
import { encodeShare, decodeShare } from '../../src/core/serialize';
import { buildChaosPlan } from '../../src/data/chaos';
import { SCENARIOS } from '../../src/data/scenarios';
import { EDGE_IDS, NODE_IDS } from '../../src/data/topology';

describe('determinism', () => {
  it('hashes seeds stably', () => {
    expect(hashSeed('blackout')).toBe(hashSeed('blackout'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });

  it('reproduces rng streams', () => {
    const a = rngFor('s', 'p');
    const b = rngFor('s', 'p');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('scopes rng by purpose', () => {
    expect(rngFor('s', 'p1')()).not.toBe(rngFor('s', 'p2')());
  });

  it('mulberry32 stays in [0,1)', () => {
    const r = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('chaos plans differ across seeds but stay valid', () => {
    const a = buildChaosPlan('one');
    const b = buildChaosPlan('two');
    expect(a.steps).not.toEqual(b.steps);
    for (const plan of [a, b]) {
      expect(plan.steps.length).toBe(8);
      for (let i = 1; i < plan.steps.length; i++) {
        expect(plan.steps[i].at).toBeGreaterThanOrEqual(plan.steps[i - 1].at);
      }
    }
  });
});

describe('scenarios + topology integrity', () => {
  it('every scenario step references a real id', () => {
    for (const sc of SCENARIOS) {
      const steps = sc.id === 'chaos' ? buildChaosPlan(sc.seed).steps : sc.steps;
      for (const st of steps) {
        if (st.kind === 'node' || st.kind === 'recover-node') expect(NODE_IDS.has(st.id), `${sc.id}:${st.id}`).toBe(true);
        else expect(EDGE_IDS.has(st.id), `${sc.id}:${st.id}`).toBe(true);
      }
    }
  });

  it('ships exactly the specified scenario set', () => {
    expect(SCENARIOS.map((s) => s.id).sort()).toEqual(
      ['bgp-leak', 'cascade', 'chaos', 'cloud-region', 'dns', 'dual-cable', 'gateway', 'isolation', 'recovery', 'single-cable'].sort(),
    );
  });
});

describe('share serialisation', () => {
  it('round-trips state', () => {
    const token = encodeShare({
      v: 1,
      scenario: 'dual-cable',
      seed: 'abc',
      fails: [{ kind: 'edge', id: 'e-tat-n1', at: 3, cause: 'x' }],
      t: 7,
    });
    expect(token).not.toContain('+');
    expect(token).not.toContain('/');
    const back = decodeShare(token)!;
    expect(back.scenario).toBe('dual-cable');
    expect(back.fails).toHaveLength(1);
    expect(back.t).toBe(7);
  });

  it('rejects garbage safely', () => {
    expect(decodeShare('!!!not-base64!!!')).toBeNull();
    expect(decodeShare('')).toBeNull();
    const evil = encodeShare({
      v: 1,
      scenario: null,
      seed: 'x',
      fails: [
        { kind: 'edge', id: '../../etc', at: 99999, cause: 'x'.repeat(500) },
        { kind: 'nonsense' as never, id: 'e-tat-n1', at: 0, cause: '' },
      ],
      t: -5,
    });
    const back = decodeShare(evil)!;
    expect(back.fails).toHaveLength(0);
    expect(back.t).toBe(0);
  });
});
