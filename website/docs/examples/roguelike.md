---
id: roguelike
title: Turn-based roguelike (scene FSM)
sidebar_position: 3
---

# Turn-based roguelike — scene FSM 🏰

Showcases `createMachine` driving a turn-based loop: input only matters in certain scenes;
otherwise the world is paused.

```ts
import { createGame, createMachine, defineActions } from 'gameplate';

type Scene = 'menu' | 'player_turn' | 'enemy_turn' | 'gameover';
type Event = 'start' | 'player_acted' | 'enemy_done' | 'die' | 'restart';

const fsm = createMachine<Scene, Event>({
  initial: 'menu',
  on: {
    menu: { start: 'player_turn' },
    player_turn: { player_acted: 'enemy_turn', die: 'gameover' },
    enemy_turn: { enemy_done: 'player_turn', die: 'gameover' },
    gameover: { restart: 'menu' },
  },
});

type State = { player: { x: number; y: number; hp: number }; enemies: { x: number; y: number }[] };

const actions = defineActions<State>()({
  movePlayer: (s, dx: number, dy: number) => ({
    ...s,
    player: { ...s.player, x: s.player.x + dx, y: s.player.y + dy },
  }),
  enemyTurn: (s) => ({
    ...s,
    enemies: s.enemies.map((e) => ({ x: e.x + Math.sign(s.player.x - e.x), y: e.y })),
  }),
});

const game = createGame({
  state: { player: { x: 0, y: 0, hp: 10 }, enemies: [{ x: 5, y: 0 }] },
  actions,
});

game.keyboard.onDown('Enter', () => {
  if (fsm.matches('menu')) fsm.send('start');
  if (fsm.matches('gameover')) fsm.send('restart');
});

game.keyboard.onAny((event, type) => {
  if (type !== 'down' || !fsm.matches('player_turn')) return;
  if (event.key === 'ArrowRight') game.actions.movePlayer(1, 0);
  if (event.key === 'ArrowLeft') game.actions.movePlayer(-1, 0);
  if (event.key === 'ArrowUp') game.actions.movePlayer(0, -1);
  if (event.key === 'ArrowDown') game.actions.movePlayer(0, 1);
  fsm.send('player_acted');
});

fsm.subscribe((current) => {
  if (current === 'enemy_turn') {
    game.actions.enemyTurn();
    fsm.send('enemy_done');
  }
});

game.start();
```

## The key idea

The **loop is always running** but it doesn't do anything turn-based on its own — the FSM
governs _when_ actions are allowed. Pressing arrows during `enemy_turn` is silently ignored;
no extra guards needed in `update`.

## Same code, server-authoritative

Because `gameplate` is headless-friendly, this exact `actions.movePlayer` /
`actions.enemyTurn` can run on a Node server, with clients sending intent events. See the
[**headless guide**](../guides/headless.md) for the splitting pattern.
