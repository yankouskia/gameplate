---
id: input
title: Input
sidebar_position: 3
---

# Input 🎮

`gameplate` normalizes keyboard and pointer events. The API is small on purpose — anything
beyond "is this held" or "did this just go down" you can build on top.

## Keyboard

```ts
const game = createGame({
  /* ... */
});

// Poll: is a key held right now?
if (game.keyboard.isDown('ArrowRight')) {
  player.moveRight();
}

// Snapshot of every pressed key
console.log(game.keyboard.pressed()); // ['ArrowRight', ' ', 'a']

// Event-driven: fires once per real keydown (not repeats).
game.keyboard.onDown('Space', () => player.jump());
game.keyboard.onUp('Space', () => player.releaseJump());

// Catch-all
game.keyboard.onAny((event, type) => {
  console.log(event.key, 'was', type);
});
```

Key names follow [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key):
`'ArrowUp'`, `'Enter'`, `'Escape'`, `' '` (space), `'a'`, `'A'` (Shift-a), `'Control'`, etc.

### Disabling default browser behavior

Some keys (Space, Arrow keys) scroll the page by default. Pass `preventDefault`:

```ts
const game = createGame({
  state,
  actions,
  keyboard: { preventDefault: true },
});
```

Or target a specific element:

```ts
const game = createGame({
  state,
  actions,
  keyboard: { target: gameContainer, preventDefault: true },
});
```

## Pointer

`PointerEvent` is the modern unified API for mouse, touch, and pen. `gameplate` exposes a
normalized, **target-relative** state:

```ts
const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const game = createGame({
  state,
  actions,
  pointer: { target: canvas }, // coordinates relative to the canvas
});

game.pointer.onDown(({ x, y }) => game.actions.spawn(x, y));

game.pointer.onMove(({ x, y, dx, dy, isDown }) => {
  if (isDown) game.actions.drag(x, y);
});

game.pointer.onUp(({ x, y }) => game.actions.commit(x, y));

// Poll:
const cursorX = game.pointer.x();
const cursorY = game.pointer.y();
```

`dx` / `dy` are deltas since the previous pointer event (handy for drag/look-around).

## Disabling input

Set the option to `false` if you don't want listeners installed at all:

```ts
const game = createGame({ state, actions, keyboard: false, pointer: false });
```

You still get `game.keyboard` and `game.pointer` — they're just no-op stubs. Calling
`game.keyboard.isDown('a')` always returns `false`; subscribers never fire. This makes input
fully optional without sprinkling `?.` everywhere.

## Cleanup

`game.destroy()` removes every listener that `gameplate` attached:

```ts
window.addEventListener('beforeunload', () => game.destroy());
```

Idempotent — safe to call multiple times.

## Headless / Node

In a non-browser environment, both `createKeyboard()` and `createPointer()` return **no-op
stubs** automatically. Same API, no exceptions. This is what lets the same `game.ts` file run
in tests and on a server.

```ts
// Works in Node without any guards:
import { createGame, defineActions } from 'gameplate';
const game = createGame({ state, actions });
game.keyboard.isDown('ArrowRight'); // → false
```

## Building on top: arrow-key "axis"

`gameplate` deliberately doesn't ship a "movement vector" helper, because everyone wants their
own — WASD vs arrows vs gamepad, diagonal normalization, deadzones, etc. Five lines:

```ts
function readAxis(kb) {
  return {
    x: (kb.isDown('ArrowRight') ? 1 : 0) - (kb.isDown('ArrowLeft') ? 1 : 0),
    y: (kb.isDown('ArrowDown') ? 1 : 0) - (kb.isDown('ArrowUp') ? 1 : 0),
  };
}
```

Want gamepad? Read [`navigator.getGamepads()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads)
inside `update` — five more lines.
