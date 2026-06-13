---
id: timers
title: Timers
sidebar_position: 7
---

# Game-time Timers ⏲️

"Spawn a boss in 3 seconds." "Fire every 0.5 seconds." "Flash the screen, then
stop." These are everywhere in games — and `setTimeout` gets every one of them
wrong:

- it keeps counting **while the game is paused**,
- it ignores **slow-motion** and **fast-forward**,
- it drifts away from your render loop.

`createTimers` schedules callbacks in **seconds of game time** and advances
them with the same `dt` your simulation uses. Pause the loop and every timer
pauses with it. Slow time to 0.5× and they slow down too.

```ts
import { createTimers } from 'gameplate';

const timers = createTimers();

timers.after(3, () => spawnBoss()); // once, in 3s of game time
const wave = timers.every(0.5, () => spawnEnemy()); // repeating

// Drive it from your loop (createGame does this for you):
timers.advance(dt);

wave.cancel(); // stop the repeating spawn
```

## Inside a game

`createGame` creates `game.timers` and advances it for you at the top of every
`update` tick — so it automatically respects a stopped loop:

```ts
const game = createGame({
  state,
  actions,
  update: (state, dt, dispatch) => {
    if (game.gamepad.wasPressed('A')) {
      dispatch.startDash();
      game.timers.after(0.2, () => dispatch.endDash());
    }
  },
});

game.stop(); // every game.timers callback is paused too
```

Opt out of the per-tick advance with `timers: false` (the pool is still
created, so `game.timers` is always defined — advance it yourself).

:::note Variable `dt`, not fixed-step
`createGame` advances `game.timers` inside `update`, using the **variable**
frame `dt` — not the `fixedStep` tick. Timers obey pause and time-scaling, but
a timer fires after a number of *real* frames, which can differ run-to-run. If
you need timers locked to the fixed simulation clock, advance a standalone
`createTimers()` yourself from inside `fixedUpdate` with `timers: false`.
:::

## `after` vs `every`

```ts
timers.after(seconds, callback); // fires once
timers.every(seconds, callback); // fires every `seconds`, forever (until cancelled)
```

- `after(0, fn)` fires on the **next** `advance`.
- `every` requires a positive interval (it throws otherwise).
- If one `advance(dt)` spans several intervals (a long frame, a lag spike),
  `every` **catches up** — it fires once per elapsed interval and carries the
  sub-interval remainder forward, so a 60 Hz spawner stays on cadence even
  through a stutter.

## The handle

Both return a `TimerHandle`:

```ts
const h = timers.every(1, tick);

h.active(); // true until fired (one-shot) or cancelled
h.remaining(); // seconds of game time until the next fire
h.cancel(); // stop it — idempotent, safe from inside its own callback
```

A repeating timer can stop itself:

```ts
let count = 0;
const h = timers.every(1, () => {
  if (++count === 3) h.cancel(); // fire exactly three times
});
```

## Advance semantics

- **Snapshot per advance.** Timers scheduled *by a callback during* an
  `advance` wait for the next one — no infinite cascades within a frame.
- **Cancellation is honoured mid-advance.** If an earlier callback cancels a
  later (still-due) timer, the later one won't fire.
- **`advance(0)`, negative, and `NaN` `dt` are no-ops** — a paused or
  glitched frame changes nothing (rather than poisoning every timer).
- **`advance` is not re-entrant.** Calling `timers.advance()` from inside a
  timer callback throws — advancing is inherently sequential.

## Slow-motion & fast-forward

There's no `timeScale` option — and you don't need one. Time-scaling *is* the
`dt` you pass to `advance`:

```ts
timers.advance(dt * 0.5); // half-speed: timers (and your sim) slow together
timers.advance(dt * 2); // double-speed
```

With `createGame`, scale the `dt` in your own `update` math the same way, or
drive a standalone pool for full control.

## Pool controls

```ts
timers.count(); // number of active timers
timers.cancelAll(); // clear everything (game.destroy() calls this for you)
```

## Why not `setTimeout` / `setInterval`?

| | `setTimeout` | `createTimers` |
| :-- | :-- | :-- |
| Clock | wall-clock | your game's `dt` |
| Pauses with the game | ❌ | ✅ |
| Respects slow-mo / fast-forward | ❌ | ✅ (scale the `dt` you pass) |
| Deterministic given a fixed `dt` | ❌ | ✅ |
| Survives tab-throttling sanely | ❌ (clamped to 1 s) | ✅ (driven by your loop) |

If you genuinely want wall-clock time, `setTimeout` is still right. For
*gameplay* time, reach for timers.
