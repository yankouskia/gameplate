---
id: headless
title: Headless / Node
sidebar_position: 7
---

# Headless games 🖥️

Run your game without a DOM. The same code, same API — just no window, no canvas, no
keyboard. Perfect for:

- **Server-authoritative multiplayer.** Run the simulation on Node, ship state to clients.
- **CI tests.** Drive 5,000 ticks of the game in a Vitest run; assert outcomes.
- **Web Workers.** Move heavy simulation off the main thread.
- **Replay systems.** Re-run a recorded input stream with a deterministic
  loop — see [Recording & Replay](./recording.md) for the built-in primitives.

## How `gameplate` stays headless-safe

Three design choices make it work:

1. **Input is no-op on the server.** `createKeyboard()` and `createPointer()` return stubs in
   any environment without `addEventListener` — same API, false/0/never-fires.
2. **The loop is environment-aware.** `defaultScheduler()` picks
   `requestAnimationFrame` in browsers and `setTimeout`-based scheduling in Node.
3. **State + actions don't touch the DOM.** That's just on you to keep that way.

## A minimal headless game

```ts title="server-game.ts"
import { createGame, defineActions, nodeScheduler } from 'gameplate';

type State = { tick: number; players: { id: string; x: number; y: number }[] };

const actions = defineActions<State>()({
  step: (s) => ({ ...s, tick: s.tick + 1 }),
  move: (s, id: string, dx: number, dy: number) => ({
    ...s,
    players: s.players.map((p) => (p.id === id ? { ...p, x: p.x + dx, y: p.y + dy } : p)),
  }),
});

const game = createGame({
  state: { tick: 0, players: [] },
  actions,
  scheduler: nodeScheduler(60), // 60 Hz, no rAF needed
  update: (state, dt, actions) => actions.step(),
});

game.start();

// Push to clients on every tick:
game.subscribe((next) => broadcast(next));
```

That's it — runs on Node, never touches `window`.

## Driving the loop manually (for tests / replay)

Inject a custom scheduler to step the loop yourself:

```ts
import { createGame, type Scheduler } from 'gameplate';

let now = 0;
let pending: ((t: number) => void) | undefined;

const manualScheduler: Scheduler = {
  now: () => now,
  schedule: (cb) => {
    pending = cb;
    return () => {
      pending = undefined;
    };
  },
};

const game = createGame({ state, actions, scheduler: manualScheduler });
game.start();

function tickOnce(deltaMs = 16) {
  now += deltaMs;
  pending?.(now);
}

// Run 600 frames (~10 seconds at 60 Hz):
for (let i = 0; i < 600; i++) tickOnce();

assertEqual(game.state().tick, 600);
```

This is exactly how `gameplate`'s own tests run thousands of frames in milliseconds without
any real time passing.

## Web Workers

Same trick — pick the right scheduler. `requestAnimationFrame` is available in Workers via
`globalThis.requestAnimationFrame` in modern runtimes, but if it isn't, fall back:

```ts
import { createGame, browserScheduler, nodeScheduler } from 'gameplate';

const scheduler =
  typeof requestAnimationFrame === 'function' ? browserScheduler() : nodeScheduler();

const game = createGame({ state, actions, scheduler });
```

## Determinism caveats

A loop that _starts_ deterministic doesn't _stay_ that way if you sprinkle non-determinism
inside your actions. To run reproducible simulations:

- ✅ Don't read `Math.random()` directly — accept a seeded PRNG in your state, e.g. via
  [`pure-rand`](https://github.com/dubzzz/pure-rand).
- ✅ Don't read `Date.now()` — pass time through `dt`.
- ✅ Don't iterate `Map`/`Set` by insertion order if you ever merge state from elsewhere.

Stick to those rules and you can record a stream of `(tick, event)` tuples and replay them
to bit-identical state. That's the whole foundation of rollback netcode.

## Sharing code between client and server

Put state types and action definitions in a shared module:

```ts title="shared/game.ts"
import { defineActions } from 'gameplate';

export type State = {
  /* ... */
};

export const actions = defineActions<State>()({
  /* ... */
});
```

Then both `client.ts` (with renderer + input) and `server.ts` (headless) import it. Same
guarantees, same bugs, same fixes.
