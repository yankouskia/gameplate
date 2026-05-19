---
id: scenes
title: Scenes (FSM)
sidebar_position: 4
---

# Scenes 🎬

Every game has phases: menu → playing → paused → gameover → menu. `gameplate` ships a
compile-time-checked finite state machine for exactly that.

## The basics

```ts
import { createMachine } from 'gameplate';

type Scene = 'menu' | 'playing' | 'paused' | 'gameover';
type Event = 'start' | 'pause' | 'resume' | 'die' | 'restart';

const scene = createMachine<Scene, Event>({
  initial: 'menu',
  on: {
    menu: { start: 'playing' },
    playing: { pause: 'paused', die: 'gameover' },
    paused: { resume: 'playing' },
    gameover: { restart: 'menu' },
  },
});

scene.current(); // → 'menu'
scene.send('start'); // → 'playing'
scene.send('jump'); // ❌ TS error: 'jump' is not in Event
scene.send('start'); // ignored — there's no transition from 'playing' on 'start'
scene.send('pause'); // → 'paused'
scene.matches('paused'); // → true (and narrows the type)
```

## Hooks: `onEnter` / `onExit`

Run side effects when a state is entered or exited:

```ts
const scene = createMachine<Scene, Event>({
  initial: 'menu',
  on: {
    /* ... */
  },
  onEnter: {
    menu: () => music.play('menu'),
    playing: () => music.play('battle'),
    gameover: () => audio.playGameOver(),
  },
  onExit: {
    menu: () => music.stop(),
  },
});
```

The `initial` state's `onEnter` fires synchronously when the machine is constructed.

## Subscribing to transitions

```ts
scene.subscribe((current, previous, event) => {
  console.log(`${previous} --(${event})--> ${current}`);
  analytics.track('scene_transition', { from: previous, to: current, via: event });
});
```

Only fires on _actual_ transitions (not on ignored sends).

## Wiring scenes into the game loop

A common pattern: branch your update logic per scene.

```ts
const scene = createMachine<Scene, Event>({
  /* ... */
});

const game = createGame({
  state,
  actions,
  update: (state, dt, actions) => {
    switch (scene.current()) {
      case 'menu':
        return updateMenu(state, dt);
      case 'playing':
        return updatePlay(state, dt, actions);
      case 'paused':
        return; // freeze
      case 'gameover':
        return updateGameOver(state, dt);
    }
  },
});

game.keyboard.onDown('Escape', () => {
  if (scene.matches('playing')) scene.send('pause');
  else if (scene.matches('paused')) scene.send('resume');
});
```

## Exhaustiveness, for real

The TypeScript types are tight enough that the compiler will catch:

- ✅ Sending an event that isn't in `Event`.
- ✅ A transition table value pointing at a state that isn't in `Scene`.
- ✅ An `onEnter` / `onExit` hook for a state that isn't in `Scene`.

You **cannot** typo a scene name or event without TS yelling at you. This is the whole point.

## Why not just an enum + `switch`?

You could. Many games do. The downsides:

- No central place to _read_ the transition table — it's scattered across switch cases.
- No `onEnter` / `onExit` discipline — side effects pile up inside transition handlers.
- No `subscribe` for cross-cutting concerns (analytics, debug overlay, etc.).
- No exhaustiveness checking unless you set it up by hand.

`createMachine` is the smallest abstraction that gives you all of those.

## Compose with state

The FSM and the state store are separate concerns. Keep "is the player jumping" in state; keep
"is the game in the menu" in the FSM. The split tends to be:

| Lives in…       | Things like…                                                               |
| :-------------- | :------------------------------------------------------------------------- |
| **State store** | Player position, HP, score, enemy list, world snapshot                     |
| **FSM / scene** | menu vs playing vs paused, level-loading vs level-done, dialog open/closed |

A rule of thumb: if the value is **discrete** and triggers **mode changes**, it's a scene.
If it's continuous data the renderer reads every frame, it's state.

## When to reach for XState instead

`gameplate`'s machine has no hierarchical states, no parallel regions, no history, no guards.
If you need those, [XState](https://xstate.js.org/) composes cleanly — just hand its
`interpret` value to `gameplate`'s `update` loop.
