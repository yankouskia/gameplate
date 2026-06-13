---
id: random
title: Random
sidebar_position: 6
---

# Seeded Random 🎲

`Math.random()` can't be reproduced, can't be saved, and can't be replayed.
A **seeded** generator can do all three — which is exactly what games need for
procedural levels, fair daily challenges, deterministic netcode, and bug
reports you can actually reproduce.

```ts
import { createRandom } from 'gameplate';

const rng = createRandom('level-1');

rng.int(1, 6); // a dice roll — always the same first roll for 'level-1'
rng.float(0, 360); // a spawn angle
rng.pick(['🍎', '🍊', '🍋']); // a random drop
rng.shuffle(deck); // a shuffled copy (input untouched)
```

The same seed produces the same sequence — on every machine, every run, in
the browser and in Node.

## Why seeded?

- **Reproducible bugs.** Log `rng.seed`, ship it in the report, replay the
  exact run.
- **Daily challenges.** Seed with the date — every player gets the same level.
- **Procedural generation.** A seed *is* your whole world; store 4 bytes, not
  a megabyte of terrain.
- **Deterministic replay.** Combined with the
  [recorder](./recording.md), a seeded run replays bit-for-bit.
- **Save & resume.** Snapshot the generator state into a save file; restore it
  and the stream continues exactly where it left off.

## The API

```ts
createRandom(seed?: number | string): Random
```

Omit the seed for an auto-seeded generator — its resolved seed is still
readable via `rng.seed`, so you can capture and reproduce it after the fact.

| Method                  | Returns                                              |
| :---------------------- | :--------------------------------------------------- |
| `next()`                | float in `[0, 1)` — the primitive everything builds on |
| `float(min?, max?)`     | float in `[min, max)` (default `[0, 1)`)             |
| `int(min, max)`         | integer in `[min, max]` — **both ends inclusive**    |
| `bool(p?)`              | `true` with probability `p` (default `0.5`)          |
| `sign()`                | `-1` or `1`                                          |
| `pick(items)`           | a uniformly-random element (throws if empty)         |
| `shuffle(items)`        | a new shuffled array (Fisher–Yates; input untouched) |
| `fork()`                | an independent child generator                       |
| `state()` / `setState()`| snapshot / restore the stream (JSON-safe)            |
| `seed`                  | the resolved seed                                    |

Every drawing method advances the **same** internal stream, so call order
matters — that's the property that makes a run reproducible.

## Independent streams with `fork()`

If loot, terrain, and enemy AI all draw from one generator, adding a single
loot roll shifts every later terrain tile. Give each subsystem its own
**fork** and they stay independent:

```ts
const world = createRandom(seed);
const loot = world.fork();
const terrain = world.fork();
const ai = world.fork();

// Adding a loot.int(...) no longer perturbs terrain or ai.
```

`fork()` advances the parent by four draws to derive the child seed, so forks
are deterministic given the parent's state but don't overlap each other's
streams.

## Save & restore

The full generator state is four 32-bit integers — plain JSON:

```ts
const save = { rng: rng.state(), score, level };
localStorage.setItem('save', JSON.stringify(save));

// Later…
const loaded = JSON.parse(localStorage.getItem('save')!);
rng.setState(loaded.rng); // the stream resumes exactly where it stopped
```

## Inside a game

`createGame` builds a generator for you at `game.random`. Pass `seed` to make
your whole game reproducible; omit it and read `game.random.seed` to recover
the auto seed for a bug report.

```ts
const game = createGame({
  state,
  actions,
  seed: 'daily-2026-06-13',
  update: (state, dt, dispatch) => {
    if (shouldSpawn) {
      const angle = game.random.float(0, Math.PI * 2);
      dispatch.spawn(Math.cos(angle), Math.sin(angle));
    }
  },
});
```

## Determinism & replay

The generator is deterministic; randomness only breaks replay if it's
**unseeded** or drawn in a different order. Keep draws inside `update`
(where order is stable) and pass concrete results into actions — the
[recorder](./recording.md) then captures those results in the action args, so
a recording replays identically without re-running the RNG.

## Algorithm

`sfc32` — a fast, well-distributed 128-bit generator — seeded through `xmur3`.
Not cryptographically secure (don't use it for tokens or shuffling real money),
but excellent for games: uniform, long-period, and tiny.
