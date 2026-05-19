---
id: selectors
title: Selectors
sidebar_position: 5
---

# Selectors 🧠

`createSelector` is `gameplate`'s memoized derived-state helper. It's the same shape Reselect
made famous, minus all the bytes.

## Basic selector — single input

```ts
import { createSelector } from 'gameplate';

const visibleEnemies = createSelector(
  (s: State) => s.enemies,
  (enemies) => enemies.filter((e) => e.visible),
);

visibleEnemies(state); // computes
visibleEnemies(state); // memoized — returns the same reference
```

The combiner re-runs only when the **input** returns a new reference (`Object.is` comparison).

## Combining inputs — Reselect-style

```ts
const targetedEnemies = createSelector(
  [(s: State) => s.player, (s: State) => s.enemies] as const,
  (player, enemies) => enemies.filter((e) => Math.hypot(e.x - player.x, e.y - player.y) < 100),
);
```

The combiner re-runs when _any_ input's reference changes.

:::tip Use `as const` for input arrays.
That gives TypeScript the precise tuple type, so each combiner parameter is inferred correctly
instead of widening to `unknown`.
:::

## When memoization helps (and when it doesn't)

A selector saves the combiner's work; it does **not** save the input getter's work. The inputs
are read every call. So:

- ✅ **Expensive combiner, cheap inputs:** big win.
  Filtering 1,000 enemies happens once per state change instead of once per frame.

- ⚠️ **Cheap combiner, expensive inputs:** no win. The inputs run every time anyway.

- ❌ **Inputs return _new references_ every call** (e.g. `(s) => ({ ...s.player })`): worst case.
  The combiner re-runs every time _and_ it has to allocate the same object every time. Don't do
  this — return existing references straight from state.

## Selectors compose

```ts
const visibleEnemies = createSelector(
  (s: State) => s.enemies,
  (enemies) => enemies.filter((e) => e.visible),
);

const visibleEnemiesNearPlayer = createSelector(
  [(s: State) => s.player, visibleEnemies] as const,
  (player, enemies) => enemies.filter((e) => closeTo(player, e)),
);
```

Composition is just function composition — no special API needed.

## Useful with React

If you're rendering the game's UI / HUD with React, a `useSyncExternalStore` selector reduces
re-renders:

```ts
import { useSyncExternalStore } from 'react';

function useGameSelector<R>(game: Game<State, any>, select: Selector<State, R>): R {
  return useSyncExternalStore(
    game.subscribe,
    () => select(game.state()),
    () => select(game.state()),
  );
}

// Later:
const score = useGameSelector(game, (s) => s.score);
// or
const enemyCount = useGameSelector(
  game,
  createSelector(
    (s: State) => s.enemies,
    (e) => e.length,
  ),
);
```

This is a 5-line user-land helper, not part of `gameplate` — because we're renderer-agnostic.

## Tiny by design

`createSelector` is **~30 lines** of source. There is no shallow comparison toggle, no input
selectors with their own memoization, no resultEqualityCheck. If you want any of that, [the
source](https://github.com/yankouskia/gameplate/blob/master/src/selectors.ts) is short enough
to fork.
