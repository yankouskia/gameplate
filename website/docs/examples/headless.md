---
id: headless
title: Headless multiplayer sim
sidebar_position: 4
---

# Headless multiplayer simulation 🛰️

Run the authoritative simulation on Node; broadcast state on every tick.

```ts title="server.ts"
import { createGame, defineActions, nodeScheduler } from 'gameplate';
import { WebSocketServer } from 'ws';

type State = {
  tick: number;
  players: Record<string, { x: number; y: number; vx: number; vy: number }>;
};

const actions = defineActions<State>()({
  joinPlayer: (s, id: string) => ({
    ...s,
    players: { ...s.players, [id]: { x: 0, y: 0, vx: 0, vy: 0 } },
  }),
  setIntent: (s, id: string, vx: number, vy: number) => ({
    ...s,
    players: { ...s.players, [id]: { ...s.players[id], vx, vy } },
  }),
  physicsStep: (s, dt: number) => ({
    ...s,
    tick: s.tick + 1,
    players: Object.fromEntries(
      Object.entries(s.players).map(([id, p]) => [
        id,
        { ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt },
      ]),
    ),
  }),
});

const game = createGame({
  state: { tick: 0, players: {} },
  actions,
  fixedStep: 1 / 30, // 30 Hz simulation
  fixedUpdate: (s, dt, actions) => actions.physicsStep(dt),
  scheduler: nodeScheduler(60),
  keyboard: false,
  pointer: false,
});

const wss = new WebSocketServer({ port: 8080 });
const sockets = new Map<string, WebSocket>();

wss.on('connection', (socket, req) => {
  const id = req.headers['sec-websocket-key']!;
  sockets.set(id, socket);
  game.actions.joinPlayer(id);

  socket.on('message', (data) => {
    const { vx, vy } = JSON.parse(data.toString());
    game.actions.setIntent(id, vx, vy);
  });
});

// Broadcast state every tick:
game.subscribe((next) => {
  const payload = JSON.stringify(next);
  for (const s of sockets.values()) s.send(payload);
});

game.start();
```

## Determinism

Because the **same** `actions` module would run on the client if you imported it, the client
can run prediction. The server is authoritative; the client's local snapshot reconciles when
the next server tick arrives.

## Why this works in Node

- ✅ `createGame` doesn't touch `document` / `window`.
- ✅ `keyboard: false, pointer: false` ensures the noop input stubs are installed.
- ✅ `nodeScheduler(60)` uses `setTimeout` instead of `requestAnimationFrame`.

Same code, same types, same bugs, same fixes. That's the whole pitch.
