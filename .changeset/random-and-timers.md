---
'gameplate': minor
---

Add two simulation primitives, both wired into `createGame`:

**`createRandom` — seeded deterministic PRNG.** `int` / `float` / `bool` /
`sign` / `pick` / `shuffle`, plus `fork()` for independent sub-streams and
`state()` / `setState()` for JSON-serialisable save & resume. Built on
`sfc32` seeded through `xmur3`: the same seed reproduces the same sequence on
every machine and run — reproducible procedural generation, daily challenges,
and bug reports you can replay. `createGame({ seed })` exposes it at
`game.random` (auto-seeded if no seed; read `game.random.seed` to recover it).

**`createTimers` — game-time scheduling.** `after(seconds, fn)` and
`every(seconds, fn)` driven by `advance(dt)`, so timers respect pause,
slow-motion, and fixed-step — unlike `setTimeout`. Repeating timers catch up
across long frames and preserve the sub-interval remainder. `createGame`
creates `game.timers` and auto-advances it each `update` tick (opt out with
`timers: false`).

Both are tree-shakeable and add no runtime dependencies. The full-barrel ESM
bundle is ~4 KB brotli; the size-limit budget is raised to 5 KB ESM / 6 KB CJS
to reflect the library's growing surface (you still pay only for what you
import).
