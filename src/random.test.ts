import { describe, expect, it } from 'vitest';

import { createRandom, type RandomState } from './random.js';

describe('createRandom — determinism', () => {
  it('the same seed produces the same sequence', () => {
    const a = createRandom('seed-1');
    const b = createRandom('seed-1');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = createRandom('seed-1');
    const b = createRandom('seed-2');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('numeric and string seeds are both supported and reproducible', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect(Array.from({ length: 10 }, () => a.int(0, 1000))).toEqual(
      Array.from({ length: 10 }, () => b.int(0, 1000)),
    );
  });

  it('exposes the resolved seed', () => {
    expect(createRandom('abc').seed).toBe('abc');
    expect(createRandom(7).seed).toBe(7);
  });

  it('auto-seeds when no seed is given, and the seed is recoverable', () => {
    const rng = createRandom();
    expect(typeof rng.seed).toBe('number');
    // Re-seeding from the recovered seed reproduces the stream.
    const replay = createRandom(rng.seed);
    expect(Array.from({ length: 5 }, () => rng.next())).toEqual(
      Array.from({ length: 5 }, () => replay.next()),
    );
  });

  it('two consecutive auto-seeded generators differ', () => {
    const a = createRandom();
    const b = createRandom();
    expect(a.seed).not.toBe(b.seed);
  });

  it('matches the canonical sfc32 golden vector (guards against transcription drift)', () => {
    // Pinned output of the canonical sfc32(xmur3) for these seeds. A change
    // here means the generator algorithm changed — which silently breaks every
    // persisted seed and recording, so it must be deliberate.
    const rng = createRandom('gameplate');
    expect(Array.from({ length: 5 }, () => rng.next())).toEqual([
      0.9550254193600267, 0.73826540610753, 0.18269781884737313, 0.6557910379488021,
      0.4326688311994076,
    ]);
    const rng2 = createRandom(12_345);
    expect(Array.from({ length: 3 }, () => Math.floor(rng2.next() * 1_000_000))).toEqual([
      399_961, 582_145, 947_590,
    ]);
  });
});

describe('createRandom — distributions', () => {
  it('next() is always in [0, 1)', () => {
    const rng = createRandom('range');
    for (let i = 0; i < 10_000; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('float(min, max) stays within [min, max)', () => {
    const rng = createRandom('floats');
    for (let i = 0; i < 10_000; i++) {
      const n = rng.float(-5, 5);
      expect(n).toBeGreaterThanOrEqual(-5);
      expect(n).toBeLessThan(5);
    }
  });

  it('float() with no args behaves like next()', () => {
    const a = createRandom('x');
    const b = createRandom('x');
    expect(a.float()).toBe(b.next());
  });

  it('int(min, max) is inclusive on both ends and covers them', () => {
    const rng = createRandom('ints');
    const seen = new Set<number>();
    for (let i = 0; i < 10_000; i++) {
      const n = rng.int(1, 6);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
      seen.add(n);
    }
    // All six faces should appear across 10k rolls.
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it('int(n, n) always returns n', () => {
    const rng = createRandom('single');
    for (let i = 0; i < 100; i++) expect(rng.int(3, 3)).toBe(3);
  });

  it('int covers a negative range inclusively', () => {
    const rng = createRandom('neg');
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const n = rng.int(-3, 3);
      expect(n).toBeGreaterThanOrEqual(-3);
      expect(n).toBeLessThanOrEqual(3);
      seen.add(n);
    }
    expect(seen).toEqual(new Set([-3, -2, -1, 0, 1, 2, 3]));
  });

  it('int stays within a very large range', () => {
    const rng = createRandom('large');
    for (let i = 0; i < 10_000; i++) {
      const n = rng.int(0, 1_000_000_000);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1_000_000_000);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('int with a reversed/empty range collapses to the lower bound (never out of range)', () => {
    const rng = createRandom('reversed');
    for (let i = 0; i < 100; i++) {
      expect(rng.int(6, 1)).toBe(6); // reversed → lo
      expect(rng.int(0.5, 0.6)).toBe(1); // no integer in range → ceil(min)
    }
  });

  it('bool(0) is always false, bool(1) always true', () => {
    const rng = createRandom('bools');
    for (let i = 0; i < 100; i++) {
      expect(rng.bool(0)).toBe(false);
      expect(rng.bool(1)).toBe(true);
    }
  });

  it('bool() default is roughly balanced', () => {
    const rng = createRandom('balance');
    let trues = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) if (rng.bool()) trues++;
    expect(trues / n).toBeGreaterThan(0.45);
    expect(trues / n).toBeLessThan(0.55);
  });

  it('sign() returns only -1 or 1', () => {
    const rng = createRandom('signs');
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(rng.sign());
    expect(seen).toEqual(new Set([-1, 1]));
  });
});

describe('createRandom — collections', () => {
  it('pick returns an element of the array', () => {
    const rng = createRandom('pick');
    const items = ['a', 'b', 'c', 'd'] as const;
    for (let i = 0; i < 100; i++) expect(items).toContain(rng.pick(items));
  });

  it('pick throws on an empty array', () => {
    const rng = createRandom('pick-empty');
    expect(() => rng.pick([])).toThrow(/empty array/);
  });

  it('pick is deterministic for a seed', () => {
    const a = createRandom('p');
    const b = createRandom('p');
    const items = [10, 20, 30, 40, 50];
    expect(Array.from({ length: 10 }, () => a.pick(items))).toEqual(
      Array.from({ length: 10 }, () => b.pick(items)),
    );
  });

  it('shuffle returns a permutation without mutating the input', () => {
    const rng = createRandom('shuffle');
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const frozen = [...input];
    const out = rng.shuffle(input);
    expect(input).toEqual(frozen); // input untouched
    expect(out).toHaveLength(input.length);
    expect(out.toSorted((x, y) => x - y)).toEqual(input); // same multiset
  });

  it('shuffle is deterministic for a seed', () => {
    const a = createRandom('s');
    const b = createRandom('s');
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(a.shuffle(items)).toEqual(b.shuffle(items));
  });

  it('shuffle of an empty or single array returns an equal array', () => {
    const rng = createRandom('edge');
    expect(rng.shuffle([])).toEqual([]);
    expect(rng.shuffle([42])).toEqual([42]);
  });
});

describe('createRandom — fork', () => {
  it('fork is deterministic given the parent state', () => {
    const a = createRandom('fork');
    const b = createRandom('fork');
    const childA = a.fork();
    const childB = b.fork();
    expect(Array.from({ length: 10 }, () => childA.next())).toEqual(
      Array.from({ length: 10 }, () => childB.next()),
    );
  });

  it('a fork does not produce the same stream as its parent', () => {
    const parent = createRandom('p');
    const child = parent.fork();
    const childSeq = Array.from({ length: 10 }, () => child.next());
    const parentSeq = Array.from({ length: 10 }, () => parent.next());
    expect(childSeq).not.toEqual(parentSeq);
  });

  it('forking advances the parent stream', () => {
    const a = createRandom('adv');
    const b = createRandom('adv');
    a.fork(); // consumes 4 draws from a
    b.next();
    b.next();
    b.next();
    b.next();
    expect(a.next()).toBe(b.next());
  });

  it('two forks from the same parent point are identical, then diverge from a third', () => {
    const parent = createRandom('multi');
    const snapshot = parent.state();
    const fork1 = parent.fork();
    parent.setState(snapshot);
    const fork2 = parent.fork();
    expect(Array.from({ length: 5 }, () => fork1.next())).toEqual(
      Array.from({ length: 5 }, () => fork2.next()),
    );
  });

  it('forks taken at different parent points produce different streams', () => {
    const parent = createRandom('diverge');
    const fork1 = parent.fork(); // advances parent
    const fork2 = parent.fork(); // taken at a later parent state
    expect(Array.from({ length: 10 }, () => fork1.next())).not.toEqual(
      Array.from({ length: 10 }, () => fork2.next()),
    );
  });
});

describe('createRandom — state serialization', () => {
  it('state() / setState() round-trips to resume the identical sequence', () => {
    const rng = createRandom('save');
    for (let i = 0; i < 17; i++) rng.next(); // advance a bit
    const snapshot = rng.state();
    const expected = Array.from({ length: 10 }, () => rng.next());
    rng.setState(snapshot);
    const resumed = Array.from({ length: 10 }, () => rng.next());
    expect(resumed).toEqual(expected);
  });

  it('state is JSON-safe and restores across instances', () => {
    const rng = createRandom('json');
    for (let i = 0; i < 5; i++) rng.next();
    const json = JSON.stringify(rng.state());
    const restored = JSON.parse(json) as RandomState;
    const fresh = createRandom('anything');
    fresh.setState(restored);
    expect(fresh.next()).toBe(rng.next());
  });

  it('state words are four uint32 integers', () => {
    const rng = createRandom('words');
    const { words } = rng.state();
    expect(words).toHaveLength(4);
    for (const w of words) {
      expect(Number.isInteger(w)).toBe(true);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(0xff_ff_ff_ff);
      expect(w >>> 0).toBe(w); // exact uint32
    }
  });
});
