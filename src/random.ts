/**
 * Seeded, deterministic pseudo-random number generator.
 *
 * The same seed always produces the same sequence — across machines, runs, and
 * Node/browser. That's what makes procedural generation reproducible, lets you
 * ship a seed in a bug report, and keeps a recorded session
 * ({@link createRecorder | recorder}) replayable when gameplay depends on
 * chance.
 *
 * Built on `sfc32` (a fast, well-distributed 128-bit generator) seeded through
 * `xmur3`. The full generator state is four 32-bit integers, so it
 * serialises to plain JSON via {@link Random.state} / {@link Random.setState}
 * — snapshot it into a save file, restore it later, resume the exact stream.
 *
 * @packageDocumentation
 */

/* eslint-disable unicorn/prefer-math-trunc, unicorn/prefer-code-point --
   `| 0` / `<< n` are intentional int32 wraparound in the PRNG core (Math.trunc
   would not wrap at 2³²), and charCodeAt is the canonical xmur3 hash input. */

/**
 * Serialisable snapshot of a {@link Random}'s internal state. Plain data —
 * `JSON.stringify` it, persist it, restore it with {@link Random.setState} to
 * resume the identical sequence.
 *
 * @category Random
 */
export interface RandomState {
  /** The four 32-bit `sfc32` state words. */
  readonly words: readonly [number, number, number, number];
}

/**
 * A seeded random generator. Every method advances the same internal stream,
 * so call order matters — that's the property that makes replay deterministic.
 *
 * @category Random
 */
export interface Random {
  /** The resolved seed this generator was created from. Capture it to reproduce a run. */
  readonly seed: number | string;
  /** Float in `[0, 1)`. The primitive every other method builds on. */
  readonly next: () => number;
  /** Float in `[min, max)`. Defaults to `[0, 1)`. */
  readonly float: (min?: number, max?: number) => number;
  /** Integer in `[min, max]` — **both ends inclusive**. */
  readonly int: (min: number, max: number) => number;
  /** `true` with probability `p` (default `0.5`). */
  readonly bool: (p?: number) => boolean;
  /** `-1` or `1`, each with probability `0.5`. */
  readonly sign: () => -1 | 1;
  /** A uniformly-random element of `items`. Throws on an empty array. */
  readonly pick: <T>(items: readonly T[]) => T;
  /** A new array with `items` shuffled (Fisher–Yates). Does not mutate the input. */
  readonly shuffle: <T>(items: readonly T[]) => T[];
  /**
   * Derive an independent child generator. Advances this generator by four
   * draws to seed the child, so the parent and child streams don't overlap —
   * give each subsystem (loot, terrain, AI) its own fork for stable,
   * order-independent randomness.
   */
  readonly fork: () => Random;
  /** Snapshot the current generator state (JSON-safe). */
  readonly state: () => RandomState;
  /** Restore a previously {@link Random.state | snapshotted} state. */
  readonly setState: (state: RandomState) => void;
}

/** Bias-free string→uint32 hash used to expand a seed into generator words. */
function xmur3(input: string): () => number {
  let h = 1_779_033_703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3_432_918_353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2_246_822_507);
    h = Math.imul(h ^ (h >>> 13), 3_266_489_909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** Module-level entropy fallback for unseeded generators — varies per call. */
let autoSeedCounter = 0;

function autoSeed(): number {
  autoSeedCounter = (autoSeedCounter + 1) | 0;
  // Date.now alone repeats within a millisecond; mix in a counter and a
  // coarse random draw so back-to-back `createRandom()` calls differ.
  const t = Date.now();
  const r = Math.floor(Math.random() * 0x1_00_00_00_00);
  return (t ^ (autoSeedCounter * 0x9e_37_79_b9) ^ r) >>> 0;
}

/**
 * Create a seeded {@link Random}. Pass a `number` or `string` seed for a
 * reproducible stream; omit it for an auto-seeded one (its resolved seed is
 * still readable via `random.seed`, so you can capture and reproduce it).
 *
 * @category Random
 *
 * @example Reproducible
 * ```ts
 * const rng = createRandom('level-1');
 * rng.int(1, 6);          // always the same first roll for this seed
 * rng.pick(['🍎', '🍊']); // deterministic
 * ```
 *
 * @example Capture an auto seed for a bug report
 * ```ts
 * const rng = createRandom();
 * console.log('seed:', rng.seed); // ship this to reproduce the run
 * ```
 *
 * @example Save / restore mid-stream
 * ```ts
 * const snapshot = rng.state();   // JSON-safe
 * // ...many draws later...
 * rng.setState(snapshot);         // resume the identical sequence
 * ```
 */
export function createRandom(seed: number | string = autoSeed()): Random {
  const stretch = xmur3(String(seed));
  let a = stretch();
  let b = stretch();
  let c = stretch();
  let d = stretch();

  // Canonical sfc32: `t` uses the current `d`, *then* `d` increments.
  const next = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 0x1_00_00_00_00;
  };

  const random: Random = {
    seed,
    next,
    float: (min = 0, max = 1) => min + next() * (max - min),
    int: (min, max) => {
      const lo = Math.ceil(min);
      const hi = Math.floor(max);
      // Empty/reversed range (no integer in [min, max], or min > max): there's
      // nothing valid to return, so draw once (to keep call-order determinism)
      // and collapse to `lo` instead of returning an out-of-range value.
      if (hi < lo) {
        next();
        return lo;
      }
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    bool: (p = 0.5) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('Random.pick(): cannot pick from an empty array.');
      const item = items[Math.floor(next() * items.length)];
      // length > 0 guarantees a defined element; assertion narrows the type.
      return item as T;
    },
    shuffle: <T>(items: readonly T[]): T[] => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i] as T;
        out[i] = out[j] as T;
        out[j] = tmp;
      }
      return out;
    },
    fork: () => {
      // Four fresh draws as a derived numeric seed — independent of the parent
      // stream going forward, deterministic given the parent's current state.
      const forkSeed =
        (Math.floor(next() * 0x1_00_00_00_00) ^
          (Math.floor(next() * 0x1_00_00_00_00) << 1) ^
          (Math.floor(next() * 0x1_00_00_00_00) >>> 1) ^
          Math.floor(next() * 0x1_00_00_00_00)) >>>
        0;
      return createRandom(forkSeed);
    },
    state: () => ({ words: [a >>> 0, b >>> 0, c >>> 0, d >>> 0] }),
    setState: (snapshot) => {
      [a, b, c, d] = snapshot.words;
    },
  };

  return random;
}
