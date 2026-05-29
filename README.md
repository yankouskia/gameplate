<div align="center">

<img src="https://raw.githubusercontent.com/yankouskia/gameplate/master/website/static/img/logo.svg" width="84" height="84" alt="gameplate">

# `gameplate`

### **The 3 KB TypeScript game framework. Zero deps. Any renderer.**

State. Loop. Input. Scenes. Selectors. Ship a game today.

[![npm](https://img.shields.io/npm/v/gameplate?color=%23a78bfa&label=npm&style=for-the-badge)](https://www.npmjs.com/package/gameplate)
[![CI](https://img.shields.io/github/actions/workflow/status/yankouskia/gameplate/ci.yml?branch=master&label=CI&color=%232ea043&style=for-the-badge)](https://github.com/yankouskia/gameplate/actions/workflows/ci.yml)
[![gzip](https://img.shields.io/bundlephobia/minzip/gameplate?label=gzip&color=%23ff5277&style=for-the-badge)](https://bundlephobia.com/package/gameplate)
[![types](https://img.shields.io/npm/types/gameplate?color=%233178c6&style=for-the-badge)](https://yankouskia.github.io/gameplate/)
[![license](https://img.shields.io/npm/l/gameplate?color=%23f8b400&style=for-the-badge)](./LICENSE)

### 👉 **[Docs](https://yankouskia.github.io/gameplate/)** · **[Live demo](https://yankouskia.github.io/gameplate/#live-demo)** · **[API](https://yankouskia.github.io/gameplate/api/)**

</div>

```sh
npm install gameplate
```

```ts
import { createGame, defineActions } from 'gameplate';

const actions = defineActions<{ x: number }>()({
  moveBy: (s, dx: number) => ({ x: s.x + dx }),
});

const game = createGame({
  state: { x: 0 },
  actions,
  update: (state, dt, actions) => {
    if (game.keyboard.isDown('ArrowRight')) actions.moveBy(200 * dt);
  },
  render: (state) => draw(state), // 👈 your renderer, any tech
});

game.start();
```

**That's the whole API surface.** Read it, write it, ship it.

---

## Why you'll like it

- 🪶 **3 KB gzipped.** Smaller than a single sprite sheet. Zero runtime deps. Forever.
- 🦺 **TypeScript-first.** `strict: true` + every `noUnchecked*` flag. Inference does the work — no `as any`, ever.
- 🎯 **Renderer-agnostic.** Canvas · WebGL · WebGPU · PIXI · Three.js · DOM · terminal. Pick one. Switch tomorrow.
- ⏱️ **Deterministic loop.** Variable timestep by default; opt into fixed-step + interpolation when physics need to be reproducible.
- 🎮 **Input, normalized.** Keyboard + pointer + **gamepad** (with radial-deadzoned sticks and edge detection). Headless no-ops cleanly — same API on Node.
- 🎬 **Typed scene FSM.** `menu → start → playing` with compile-time checks. Send a wrong event? TypeScript stops you.
- 🧠 **Memoized selectors.** Reselect-style derived state, ~30 LOC, exact same shape.
- 🎞️ **Record & replay.** Capture every dispatched action; replay it deterministically. Bug repro, regression tests, server-authoritative validation — all in JSON.
- 🖥️ **Browser & Node.** Headless simulation, server-authoritative play, CI snapshot tests — same code, two runtimes.
- 📦 **Dual ESM + CJS.** `publint` clean. Provenance signed. Tree-shakeable.

---

## In 30 seconds

```ts
type State = { player: { x: number; y: number }; score: number };

const actions = defineActions<State>()({
  move: (s, dx: number, dy: number) => ({
    ...s,
    player: { x: s.player.x + dx, y: s.player.y + dy },
  }),
  score: (s, pts: number) => ({ ...s, score: s.score + pts }),
});

const game = createGame({ state: { player: { x: 0, y: 0 }, score: 0 }, actions });

game.actions.move(10, 0); // ✅ typed
game.actions.move('lol', 0); // ❌ TS error — caught at compile time
```

That's state + actions. Add `update` for input handling, `render` for drawing, and you have a game.

---

## What's in the box

|                                                                  |                                                                                                        |
| :--------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| **`createGame`**                                                 | One-call setup — state + loop + input wired together.                                                  |
| **`createStore`**                                                | The underlying typed store (subscribe, getState, setState).                                            |
| **`defineActions`**                                              | Curried generic that gives perfect IntelliSense without retyping `S`.                                  |
| **`createLoop`**                                                 | Bare loop — variable or fixed-step with interpolation `alpha`.                                         |
| **`createKeyboard`** / **`createPointer`** / **`createGamepad`** | Normalized input — keys, pointer, and Standard Gamepad with edge detection. No-op stubs on the server. |
| **`createMachine`**                                              | Compile-time-checked finite state machine for scenes/menus.                                            |
| **`createSelector`**                                             | Reselect-style memoization, ~30 LOC.                                                                   |
| **`createRecorder`** / **`replay`**                              | Deterministic record + replay of every action. JSON-serialisable.                                      |

[**→ Full API reference**](https://yankouskia.github.io/gameplate/api/)

---

## Built for every stack

`gameplate` doesn't ship a renderer — it ships the **glue**. Drop into:

[![three.js](https://img.shields.io/badge/three.js-049ef4?style=flat-square&logo=three.js&logoColor=white)](https://yankouskia.github.io/gameplate/docs/guides/webgl#threejs)
[![PIXI v8](https://img.shields.io/badge/PIXI%20v8%20%C2%B7%20WebGPU-e0228d?style=flat-square)](https://yankouskia.github.io/gameplate/docs/guides/webgl#pixijs)
[![regl](https://img.shields.io/badge/regl-16a34a?style=flat-square)](https://yankouskia.github.io/gameplate/docs/guides/webgl#regl)
[![WebGPU](https://img.shields.io/badge/WebGPU-a78bfa?style=flat-square)](https://yankouskia.github.io/gameplate/docs/guides/webgl#webgpu)
[![Canvas 2D](https://img.shields.io/badge/Canvas%202D-ff5277?style=flat-square)](https://yankouskia.github.io/gameplate/docs/guides/webgl#canvas-2d)

Switch renderers without changing one line of game logic. [Patterns for each →](https://yankouskia.github.io/gameplate/docs/guides/webgl)

---

## How it fits together

```
   ⌨ keyboard ─┐
   🖱 pointer ─┼──▶ actions ──▶ store ──▶ selectors ──▶ render ──▶ 🎨 your renderer
   🛰 network ─┘                  │                       ▲
                                  ▼                       │
                              scene FSM ──────────────────┘

         loop (dt, alpha) ──▶ update ──▶ actions
```

A handful of composable functions. Pick the ones you need. Ignore the rest.

---

## Quality bar

- ✅ 141/141 tests, ≥ 90 % line coverage
- ✅ CI matrix: Node 20 / 22 / 24 × Ubuntu / macOS / Windows
- ✅ `publint` + `@arethetypeswrong/cli` clean on every PR
- ✅ Size limit: < 4 KB gzipped ESM, enforced in CI
- ✅ CodeQL security analysis on every PR
- ✅ npm provenance on every release (OIDC trusted publishing)

---

## Contributing

PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md). Architecture decisions are recorded in [DECISIONS.md](./DECISIONS.md).

```sh
git clone https://github.com/yankouskia/gameplate
cd gameplate
pnpm install
pnpm test:watch
```

---

## License

[MIT](./LICENSE) © [Alex Yankouski](https://github.com/yankouskia) · [Sponsor →](https://github.com/sponsors/yankouskia)

<div align="center">

**If `gameplate` saved you a weekend, [⭐ star it](https://github.com/yankouskia/gameplate) — it's the easiest way to say thanks.**

</div>
