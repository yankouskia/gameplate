---
id: particles
title: Particle field (fixed step)
sidebar_position: 2
---

# Particle field — fixed step with interpolation ✨

Spawn 5,000 particles, integrate physics deterministically, render with interpolation.

```ts
import { createGame, defineActions } from 'gameplate';

type P = { x: number; y: number; vx: number; vy: number };
type State = { ps: P[]; prev: P[] };

const N = 5000;

const initial: State = {
  ps: Array.from({ length: N }, () => ({ x: 320, y: 180, vx: rand(-80, 80), vy: rand(-80, 80) })),
  prev: [],
};
initial.prev = initial.ps;

const actions = defineActions<State>()({
  physicsStep: (s, dt: number) => {
    const next = s.ps.map((p) => ({
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vx: p.vx * 0.99,
      vy: p.vy * 0.99 + 30 * dt,
    }));
    return { prev: s.ps, ps: next };
  },
});

const game = createGame({
  state: initial,
  actions,
  fixedStep: 1 / 60,
  fixedUpdate: (s, dt, actions) => actions.physicsStep(dt),
  render: (s, alpha) => {
    ctx.clearRect(0, 0, 640, 360);
    ctx.fillStyle = '#a78bfa';
    for (let i = 0; i < s.ps.length; i++) {
      // interpolate between previous and current physics state for buttery smoothness
      const a = s.prev[i],
        b = s.ps[i];
      const x = a.x + (b.x - a.x) * alpha;
      const y = a.y + (b.y - a.y) * alpha;
      ctx.fillRect(x, y, 2, 2);
    }
  },
});

game.start();
```

## Why interpolate?

A fixed step runs 60 times per second, but your monitor might draw 144 fps. Without
interpolation, each draw would jump straight to the latest physics frame — jittery. With
`alpha`, you draw a position **between** the previous and current physics frames, smooth at
any refresh rate.

`alpha` is provided by `gameplate` automatically — `0` right after a tick, approaching `1`
as the next tick draws near. Lerp accordingly.
