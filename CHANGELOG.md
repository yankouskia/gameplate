# gameplate

## 2.3.0

### Minor Changes

- 005e6ac: Add two simulation primitives, both wired into `createGame`:

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

## 2.2.0

### Minor Changes

- 81d38b5: Add `createGamepad` — the third pillar of the input layer (keyboard ✓,
  pointer ✓, **gamepad ✓**). Polls the platform Gamepad API on the same shape
  as `createKeyboard` / `createPointer`, with built-in goodies:
  - Per-frame edge detection: `wasPressed('A')`, `wasReleased('B')`.
  - Analog button reads (triggers): `value('LT')` returns `0..1`.
  - W3C **Standard Gamepad** name lookups (Xbox-naming, position-mapped):
    `isDown('A')`, `axis('LeftX')`, `stick('left')`.
  - **Radial** deadzone for sticks (magnitude is gated and rescaled) plus a
    per-axis deadzone for triggers. Configurable; default `0.1`.
  - Multi-pad support via optional `padIndex` on every reader.

  `createGame({ gamepad })` accepts a `boolean` or a `GamepadOptions` object and
  **auto-polls** gamepad at the top of every `update` tick — `game.gamepad.isDown('A')`
  inside your update hook reads fresh state, no boilerplate. Headless-safe (every
  reader returns `false` / `0` / `[]` when no platform `getGamepads` is reachable),
  and trivially mockable in tests via the `getGamepads` option.

  Zero new dependencies; bundle still under the 4 KB cap.

## 2.1.0

### Minor Changes

- 5680959: Add `createRecorder` + `replay` — deterministic record-and-replay of action
  sequences. Combined with a new `tap` field on `createGame`, you can capture
  every dispatched action into a JSON-serialisable `Recording` and re-derive
  any state moment with a pure `replay(recording, actions)` call.

  Unlocks bug repro (ship the JSON, replay in a test), regression tests
  (record gameplay once, assert state on every CI run), server-authoritative
  validation (replay the client's recording on Node to detect impossible
  inputs), and time-travel debugging (`replay(recording, actions, { until: N })`
  scrubs to event _N_).

  Zero new dependencies, ~0.4 KB brotli. The library still ships under 4 KB.

## 2.0.1

### Patch Changes

- Slim the published package and harden type-resolution validation.
  - **Drop source maps from `dist/`.** The original `src/` is not part of the
    published package, so the `.js.map` / `.cjs.map` files could never resolve
    to real sources anyway. Removing them cuts the published tarball from
    ~50 KB to ~24 KB (and the unpacked size by more than half).
  - **Fix "Are the Types Wrong?" validation.** The `attw` CLI crashes on any
    package whose tarball exceeds ~32 KB (an upstream `fflate` streaming bug).
    Package validation now runs through a small wrapper around
    `@arethetypeswrong/core`, so dual ESM/CJS type resolution is verified on
    every supported Node version — no behavioural change to the library itself.

## 2.0.0

### Major Changes

- Initial published release. A complete rewrite as a tiny, zero-dependency,
  fully-typed TypeScript framework for browser & headless games.

  Public API: `createGame`, `defineActions`, `createStore`, `createLoop`,
  `createMachine`, `createSelector`, `createKeyboard`, `createPointer` —
  plus the `browserScheduler` / `nodeScheduler` / `defaultScheduler` loop
  primitives.

  v1 (2019) was an unpublished webpack + PixiJS + Redux boilerplate and had
  no importable API, so there is no upgrade path — v2 is a fresh start under
  the same name.
