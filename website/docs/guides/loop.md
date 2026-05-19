---
id: loop
title: The Game Loop
sidebar_position: 2
---

# The Game Loop ⏱️

`gameplate` ships a deterministic, abstract game loop. Two modes — pick the one your game
actually needs.

## Variable timestep (default)

Calls `update(dt)` and `render(0)` every frame, where `dt` is "seconds since the previous frame":

```ts
const game = createGame({
  state,
  actions,
  update: (state, dt, actions) => {
    actions.move(state.vx * dt, state.vy * dt);
  },
  render: (state) => draw(state),
});
```

✅ Simple, intuitive.
✅ Smooth at any framerate.
❌ Physics integration is frame-rate dependent — collisions and accumulation drift over time.

**Use for:** turn-based games, casual arcade games, UI prototypes, menus, anything where
"close enough" timing is fine.

## Fixed timestep (opt-in)

Calls `fixedUpdate(dt)` _N_ times per frame with a constant `dt`, then `render(alpha)` once with
an interpolation factor:

```ts
const game = createGame({
  state,
  actions,
  fixedStep: 1 / 60, // 16.666 ms per physics tick
  fixedUpdate: (state, dt, actions) => {
    physics.step(dt); // dt is *always* 1/60
  },
  render: (state, alpha) => {
    // alpha ∈ [0, 1) — interpolate between previous and current physics state
    renderer.draw(lerp(prev, state, alpha));
  },
});
```

✅ **Deterministic** — given the same inputs, the same simulation runs identically every time.
✅ **Reproducible** — record/replay, network sync, headless test fixtures all just work.
❌ Slightly more code in the renderer to interpolate.

**Use for:** anything with physics, multiplayer games, anything that needs to be reproducible.

### Why both?

Both `update` and `fixedUpdate` are called when `fixedStep` is set — `update` once per frame,
`fixedUpdate` 0..N times per frame. Use the right one for the right job:

```ts
update:      (s, dt, actions) => actions.pollInput(),    // every frame
fixedUpdate: (s, dt, actions) => actions.physicsStep(),  // every 1/60s, no matter the framerate
render:      (s, alpha)       => draw(s, alpha),         // every frame
```

## Spiral-of-death protection

If your tab pauses (Alt-Tab, debugger break, slow tick), `dt` could spike to several seconds.
With fixed-step physics that means "do 200 ticks to catch up", which can lock the page.

`gameplate` caps `dt` at `maxDelta` (default **0.25 seconds**):

```ts
const game = createGame({
  state,
  actions,
  maxDelta: 0.05, // never run more than 50ms-equivalent of catch-up per frame
});
```

## Lower-level: `createLoop`

When you don't want the state/input layers, `createLoop` is the bare game loop:

```ts
import { createLoop } from 'gameplate';

const loop = createLoop({
  update: (dt) => console.log('frame, dt =', dt),
  render: (alpha) => console.log('render'),
});

loop.start();
loop.stop();
loop.isRunning();
```

## Schedulers

The loop is decoupled from the time source. Three schedulers are bundled:

| Scheduler            | When             | Time source                                 |
| :------------------- | :--------------- | :------------------------------------------ |
| `browserScheduler()` | Browser, default | `performance.now` + `requestAnimationFrame` |
| `nodeScheduler(hz?)` | Node, default    | `performance.now` + `setTimeout(1000/hz)`   |
| `defaultScheduler()` | Auto-pick        | the right one for the runtime               |

You can write your own — useful for tests, deterministic record/replay, or custom runtimes:

```ts
import { createGame, type Scheduler } from 'gameplate';

let now = 0;
let cb: ((t: number) => void) | undefined;
const fakeScheduler: Scheduler = {
  now: () => now,
  schedule: (callback) => {
    cb = callback;
    return () => {
      cb = undefined;
    };
  },
};

const game = createGame({ state, actions, scheduler: fakeScheduler });
game.start();

// Drive the loop manually:
now += 16;
cb?.(now);
now += 16;
cb?.(now);
```

This is exactly how `gameplate`'s own tests achieve millisecond-precise loop coverage without
ever touching real time.

## Choosing in practice

```text
              ┌───────────────────────────────────┐
              │ Do you have physics / determinism │
              │ requirements?                     │
              └─────────────┬─────────────────────┘
                            │
              ┌──── no ─────┴───── yes ────┐
              ▼                            ▼
       variable timestep              fixed timestep
   (update + render only)         (fixedUpdate + render)
```

If you're unsure, **start with variable**. You can opt into fixed-step later by setting one
config field — no API changes elsewhere.
