---
id: why-gameplate
title: Why gameplate?
sidebar_position: 3
---

# Why `gameplate`?

You probably _don't_ need yet another game engine. You probably _do_ need:

- A **typed state container** that doesn't pull in 30 KB of Redux ceremony.
- A **game loop** that handles the spiral-of-death and fixed-timestep math for you.
- A **renderer hook** so your existing Canvas / WebGL / PIXI code drops straight in.
- A **headless mode** so the same code runs in CI, on a server, or in a Web Worker.

`gameplate` is exactly that, and nothing more.

## Comparison

### vs. PIXI / Three / Phaser

Those are **renderers** (or full engines, in Phaser's case). They tell you how to draw things.

`gameplate` is the **glue** between your game _logic_ and any of them. You bring whichever
renderer you love — `gameplate` keeps your state, loop, input, and scenes in shape.

You can absolutely use them together:

```ts
import { createGame } from 'gameplate';
import * as PIXI from 'pixi.js';

const app = new PIXI.Application();
await app.init({ width: 640, height: 360 });

const game = createGame({
  state,
  actions,
  render: (state) => {
    // update PIXI sprites from state, then let PIXI's own ticker draw.
    sprite.x = state.x;
    sprite.y = state.y;
  },
});
game.start();
```

### vs. XState

XState is great for arbitrary statecharts: hierarchical states, parallel regions, history,
guards, the works. It is also ~30 KB minified and has its own steep learning curve.

`gameplate`'s `createMachine` is ~150 LOC, ships with the framework, and is purpose-built for
the "menu → playing → paused → gameover" shape that 95 % of games use. If you need true
statecharts, reach for XState — they compose just fine.

### vs. rolling your own

Everyone does it. Everyone hits the same gotchas:

- `requestAnimationFrame` callbacks lose their `dt` parameter the first time the tab pauses.
- Mutating state in-place breaks React-style renderers but compiles fine.
- Headless tests need a fake `window` … unless you abstract over the global.
- Memoization of derived state is more annoying than it has any right to be.

`gameplate` is what your fifth from-scratch loop wants to become — already typed, already
tested, already headless-ready.

## When `gameplate` is **not** the right tool

Be honest with yourself:

- **You're writing a 3D game.** You probably want Three.js + Cannon-es directly. `gameplate`
  can still help with scenes and input, but the meat of the work is the renderer.
- **You're writing a multi-developer commercial game.** Look at Phaser, Defold, Godot, Unity.
- **You want a level editor / asset pipeline / particle GUI.** That's not what this is.

`gameplate` is a **library**, not an engine. It assumes you write code.

## Design tenets

The "no" list is more informative than the "yes" list:

- ❌ **No runtime dependencies.** Forever. Anything we'd inline (an emitter, a memoizer) is short
  enough to live in this package.
- ❌ **No DOM in core.** Browser globals are optional. The Node build runs the same code.
- ❌ **No magic.** No proxies, no decorators, no `Object.defineProperty` traps. Read any file
  top-to-bottom and you'll understand it.
- ❌ **No "framework lock-in" for rendering.** You can swap PIXI for Three between commits.
- ❌ **No `any`.** Every public signature is fully typed.

## Roadmap

`gameplate` is feature-complete for v2. Future-considered:

- **`@gameplate/network`** — deterministic state-sync helpers for multiplayer.
- **`@gameplate/audio`** — a tiny WebAudio wrapper with the same "headless no-ops" pattern.
- **`@gameplate/devtools`** — a Chrome extension to inspect state, action history, FSM state.

Want one of these? [Open an issue](https://github.com/yankouskia/gameplate/issues) — your votes
help us prioritize.
