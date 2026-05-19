---
id: state-and-actions
title: State & Actions
sidebar_position: 1
---

# State & Actions 🗂️

`gameplate`'s state model is intentionally boring: **immutable state + pure action functions**.
No proxies, no decorators, no `useState` ceremony. Just two functions and a TypeScript trick.

## The shape

```ts
import { createGame, defineActions } from 'gameplate';

// 1. Define your state type.
type State = {
  player: { x: number; y: number; hp: number };
  enemies: { id: string; x: number; y: number }[];
  score: number;
};

// 2. Define actions as pure (state, ...args) => newState functions.
const actions = defineActions<State>()({
  move: (s, dx: number, dy: number) => ({
    ...s,
    player: { ...s.player, x: s.player.x + dx, y: s.player.y + dy },
  }),
  hurt: (s, dmg: number) => ({
    ...s,
    player: { ...s.player, hp: Math.max(0, s.player.hp - dmg) },
  }),
  addScore: (s, points: number) => ({ ...s, score: s.score + points }),
});

// 3. Wire it up.
const game = createGame({
  state: { player: { x: 0, y: 0, hp: 100 }, enemies: [], score: 0 },
  actions,
});

// 4. Dispatch.
game.actions.move(10, 0); // ✅
game.actions.hurt(25); // ✅
game.actions.addScore(100); // ✅
game.actions.hurt('a lot'); // ❌ TS error
```

## Why `defineActions<S>()(...)` — the double call?

To get the best of both worlds:

1. **You fix `S` once** (the first call: `defineActions<State>()`).
2. **TypeScript infers each action's argument tuple** from the action map you pass to the
   second call.

Without the split, you'd either have to retype `S` in front of every action…

```ts
// 👎 with single-call: state type needs to be repeated:
const actions = {
  move: (s: State, dx: number, dy: number) => ({ ... }),
  hurt: (s: State, dmg: number)             => ({ ... }),
};
```

…or accept a widened `unknown` state in your action bodies. The two-call form keeps the call
site clean while preserving inference.

## State is `DeepReadonly`

The `state` argument inside each action is typed as `DeepReadonly<S>`. This means:

```ts
const actions = defineActions<State>()({
  move: (s, dx: number) => {
    s.player.x = dx; // ❌ Cannot assign to 'x' because it is a read-only property.
    return s;
  },
});
```

Compile-time protection against accidental mutation. The compiler nudges you toward producing
**new objects**:

```ts
const actions = defineActions<State>()({
  move: (s, dx: number) => ({
    ...s,
    player: { ...s.player, x: s.player.x + dx }, // ✅ new objects, all the way down
  }),
});
```

### Runtime freeze (opt-in)

For development, pass `dev: true` to also `Object.freeze` every state value at runtime, so
_indirect_ mutation through some other module fails loud:

```ts
const game = createGame({ state, actions, dev: true });
```

Don't enable in production — `Object.freeze` is cheap but not free.

## Dispatching returns `void`

The dispatched form **strips the state argument** and returns `void`:

```ts
type DispatchOf<typeof actions> = {
  move:     (dx: number, dy: number) => void;
  hurt:     (dmg: number) => void;
  addScore: (points: number) => void;
};

game.actions.move(10, 0);  // returns void — state was updated as a side effect.
```

You read the **new** state via `game.state()`:

```ts
game.actions.addScore(100);
console.log(game.state().score);
```

## Subscribing to changes

`game.subscribe()` fires on every state change, with `(current, previous)`:

```ts
const unsubscribe = game.subscribe((current, previous) => {
  if (current.score !== previous.score) {
    ui.updateScore(current.score);
  }
});

// Later:
unsubscribe();
```

For performance-sensitive comparisons, prefer **[selectors](./selectors.md)** which short-circuit
on reference equality.

## Working with libraries (Immer, Mutative, etc.)

You can use any immutability library — actions just need to return a _new_ reference:

```ts
import { produce } from 'immer';

const actions = defineActions<State>()({
  hurt: (s, dmg: number) =>
    produce(s, (draft) => {
      draft.player.hp = Math.max(0, draft.player.hp - dmg);
    }),
});
```

`gameplate` itself stays dependency-free; you bring Immer if you want it.

## Without `createGame` — just the store

`createStore` is also exported. Use it for non-game UIs, server-side simulations, or anywhere
you want the store without the loop:

```ts
import { createStore } from 'gameplate';

const store = createStore({ n: 0 });
store.subscribe((next, prev) => console.log(prev.n, '→', next.n));
store.setState((s) => ({ ...s, n: s.n + 1 }));
```
