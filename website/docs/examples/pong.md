---
id: pong
title: Pong (Canvas 2D)
sidebar_position: 1
---

# Pong (Canvas 2D) 🏓

A complete Pong clone in ~80 lines. Demonstrates: state, actions, keyboard, variable timestep,
Canvas rendering.

```ts title="pong.ts"
import { createGame, defineActions } from 'gameplate';

type State = {
  ball: { x: number; y: number; vx: number; vy: number };
  left: { y: number };
  right: { y: number };
  score: { left: number; right: number };
};

const W = 640,
  H = 360,
  PAD_H = 60,
  BALL = 8,
  SPEED = 220;

const initial: State = {
  ball: { x: W / 2, y: H / 2, vx: SPEED, vy: SPEED * 0.4 },
  left: { y: (H - PAD_H) / 2 },
  right: { y: (H - PAD_H) / 2 },
  score: { left: 0, right: 0 },
};

const actions = defineActions<State>()({
  movePaddle: (s, side: 'left' | 'right', dy: number) => ({
    ...s,
    [side]: { y: Math.max(0, Math.min(H - PAD_H, s[side].y + dy)) },
  }),
  stepBall: (s, dt: number) => {
    let { x, y, vx, vy } = s.ball;
    x += vx * dt;
    y += vy * dt;
    if (y < 0 || y > H - BALL) vy = -vy;
    // very rough paddle collision:
    if (x < 10 && y > s.left.y && y < s.left.y + PAD_H) vx = Math.abs(vx);
    if (x > W - 10 && y > s.right.y && y < s.right.y + PAD_H) vx = -Math.abs(vx);
    return { ...s, ball: { x, y, vx, vy } };
  },
  scorePoint: (s, side: 'left' | 'right') => ({
    ...s,
    ball: { x: W / 2, y: H / 2, vx: side === 'left' ? -SPEED : SPEED, vy: SPEED * 0.4 },
    score: { ...s.score, [side]: s.score[side] + 1 },
  }),
});

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const ctx = canvas.getContext('2d')!;

const game = createGame({
  state: initial,
  actions,
  update: (state, dt, actions) => {
    if (game.keyboard.isDown('w')) actions.movePaddle('left', -260 * dt);
    if (game.keyboard.isDown('s')) actions.movePaddle('left', 260 * dt);
    if (game.keyboard.isDown('ArrowUp')) actions.movePaddle('right', -260 * dt);
    if (game.keyboard.isDown('ArrowDown')) actions.movePaddle('right', 260 * dt);

    actions.stepBall(dt);

    if (state.ball.x < 0) actions.scorePoint('right');
    if (state.ball.x > W) actions.scorePoint('left');
  },
  render: (state) => {
    ctx.fillStyle = '#0b0a14';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(4, state.left.y, 10, PAD_H);
    ctx.fillRect(W - 14, state.right.y, 10, PAD_H);
    ctx.fillRect(state.ball.x, state.ball.y, BALL, BALL);
    ctx.font = '24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${state.score.left}    ${state.score.right}`, W / 2, 30);
  },
});

game.start();
```

## What's interesting here

- `movePaddle` takes the **side** as an argument — one action, two paddles.
- `stepBall` is **pure**: it doesn't read `Date.now()`, only the `dt` we pass.
- Everything pong-related lives in `actions`; the loop is just routing input + calling them.
- Want it deterministic? Set `fixedStep: 1/60` and move `actions.stepBall` to `fixedUpdate`.
