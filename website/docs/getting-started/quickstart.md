---
id: quickstart
title: Quickstart — your first game
sidebar_position: 2
---

# Quickstart ⚡

A complete, runnable game in 30 lines. Drop it into any Vite / Next.js / plain HTML project.

## 1. Install

```bash
npm install gameplate
# or  pnpm add gameplate
# or  yarn add gameplate
# or  bun  add gameplate
```

## 2. Two files

```html title="index.html"
<!doctype html>
<canvas id="stage" width="640" height="360"></canvas>
<script type="module" src="./game.ts"></script>
```

```ts title="game.ts"
import { createGame, defineActions } from 'gameplate';

const actions = defineActions<{ x: number; y: number }>()({
  moveBy: (s, dx: number, dy: number) => ({ x: s.x + dx, y: s.y + dy }),
});

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const ctx = canvas.getContext('2d')!;

const game = createGame({
  state: { x: 100, y: 100 },
  actions,
  update: (state, dt, actions) => {
    if (game.keyboard.isDown('ArrowRight')) actions.moveBy(200 * dt, 0);
    if (game.keyboard.isDown('ArrowLeft')) actions.moveBy(-200 * dt, 0);
    if (game.keyboard.isDown('ArrowUp')) actions.moveBy(0, -200 * dt);
    if (game.keyboard.isDown('ArrowDown')) actions.moveBy(0, 200 * dt);
  },
  render: (state) => {
    ctx.fillStyle = '#0b0a14';
    ctx.fillRect(0, 0, 640, 360);
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(state.x, state.y, 24, 24);
  },
});

game.start();
game.keyboard.onDown('Escape', () => game.stop());
```

## 3. Done

Press the arrow keys. The box moves.

You just used **every** gameplate primitive without realising it.

:::tip What you got for free

- **Frame-rate independent** movement (`dt` is seconds since the last frame)
- **Spiral-of-death protection** (`dt` is capped at 250 ms — Alt-Tab safe)
- **Full type inference** (`actions.moveBy(200, 0)` knows it needs `(number, number)`)
- **Headless safety** — this exact file imports cleanly in Node, no `window` crashes
- **Auto-cleanup** — `game.destroy()` removes every listener `gameplate` attached
  :::

## Where to next

| If you want to…                                    | Read this                                                         |
| :------------------------------------------------- | :---------------------------------------------------------------- |
| Understand the typing trick behind `defineActions` | [State & Actions](../guides/state-and-actions.md)                 |
| Make physics deterministic                         | [Game Loop — fixed step](../guides/loop.md#fixed-timestep-opt-in) |
| Add menus / pause / game-over screens              | [Scenes (FSM)](../guides/scenes.md)                               |
| Plug in PIXI / Three.js / raw WebGL                | [WebGL & GPU stack](../guides/webgl.md)                           |
| Run the same game on a Node server                 | [Headless / Node](../guides/headless.md)                          |
