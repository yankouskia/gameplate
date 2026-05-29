---
id: input
title: Input
sidebar_position: 3
---

# Input 🎮

`gameplate` normalizes keyboard, pointer, and gamepad input. The API is small on purpose —
anything beyond "is this held" or "did this just go down" you can build on top.

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

## Gamepad

The browser exposes gamepads via polling (no events), so `createGame` polls
yours once per frame, right before `update` runs. Read state in your update
hook just like keyboard:

```ts
const game = createGame({
  state,
  actions,
  update: (_state, dt, dispatch) => {
    if (game.gamepad.wasPressed('A')) dispatch.jump();

    // Radial-deadzoned analog stick — magnitude clamps cleanly at 1.
    const { x, y } = game.gamepad.stick('left');
    dispatch.moveBy(x * 200 * dt, y * 200 * dt);

    // Triggers expose an analog value 0..1.
    if (game.gamepad.value('RT') > 0.5) dispatch.fire();
  },
});
```

The button names map to the W3C [Standard Gamepad](https://w3c.github.io/gamepad/#remapping)
layout — Xbox naming here for muscle memory, with PlayStation glyphs mapping
by **position** (`A` = bottom face / PS cross, `B` = right face / PS circle):

| Name    | Index | | Name   | Index |
| :------ | :---: | :-: | :----- | :---: |
| `A`     |   0   |     | `LS`   |  10   |
| `B`     |   1   |     | `RS`   |  11   |
| `X`     |   2   |     | `Up`   |  12   |
| `Y`     |   3   |     | `Down` |  13   |
| `LB`    |   4   |     | `Left` |  14   |
| `RB`    |   5   |     | `Right`|  15   |
| `LT`    |   6   |     | `Home` |  16   |
| `RT`    |   7   |
| `Back`  |   8   |
| `Start` |   9   |

Axes use the same scheme — `'LeftX' | 'LeftY' | 'RightX' | 'RightY'`. **Y is
positive downward** (browser convention) — negate it if your "forward" is
up. You can also pass raw indices (`game.gamepad.isDown(0)`, `game.gamepad.axis(1)`)
for non-standard controllers.

### Multiple controllers

Every reader takes an optional `padIndex` (default `0`). Iterate
`game.gamepad.pads()` to enumerate connected controllers:

```ts
for (const pad of game.gamepad.pads()) {
  if (!pad.connected) continue;
  if (game.gamepad.wasPressed('Start', pad.index)) joinGame(pad.index);
}
```

### "Press A to begin" — connect / disconnect

Polling-derived events fire on the first poll that sees a new pad — perfect
for a join screen, no separate enumeration pass:

```ts
const off = game.gamepad.onConnect((pad) => {
  banner.show(`Player ${pad.index + 1} ready — press A`);
});

game.gamepad.onDisconnect((pad) => {
  banner.show(`Player ${pad.index + 1} disconnected`);
});
```

The handlers fire from inside `poll()`, so you'll see them during the
auto-poll at the top of your `update` hook.

### Tuning the deadzone

The default deadzone is `0.1`. Override globally via the option, or read
raw values by setting it to `0`:

```ts
const game = createGame({ ..., gamepad: { deadzone: 0.18 } });
```

`axis(n)` uses a per-axis deadzone; `stick('left')` uses a **radial**
deadzone (the vector's length is what's gated, then rescaled so analog feel
is smooth at the deadzone edge).

### Headless gamepad

For tests or a Node simulation, inject a `getGamepads` callback — useful
for replaying recorded input streams against a headless game:

```ts
const game = createGame({
  ...,
  gamepad: { getGamepads: () => recordedFrame.pads },
  scheduler: nodeScheduler(),
});
```

### Sharp edges

A few things every gamepad consumer trips over once — none are gameplate
bugs, but the browser API is fussy:

- **Secure context only.** Chrome and Edge only return non-`null` pads on
  HTTPS or `localhost`. On `http://` other than localhost `getGamepads()`
  returns all-`null` entries.
- **User-gesture gating.** Browsers hide gamepads until the user has
  pressed a button on the controller at least once on this page — both as a
  fingerprinting defence and to avoid presenting ghost devices. `onConnect`
  fires on that first interaction, not on page load.
- **Permissions-Policy in iframes.** Embedded iframes need
  `permissions-policy: gamepad=*` from the embedder to read input. Without
  it, `getGamepads()` returns empty.
- **Y is positive downward** — `stick.y < 0` is "forward". Negate it for an
  up-is-forward 3D camera.
- **Trigger thresholds.** `wasPressed('RT')` uses the browser's own
  `pressed` flag (usually `value > 0.5`). For a custom threshold, edge-detect
  yourself off `value()` between frames.
- **Recording caveat.** `createGamepad` reads are pull-style — they don't
  go through `tap` and so do **not** show up in a `createRecorder`
  recording. Anything you dispatch as a result (`if (wasPressed('A'))
  dispatch.jump()`) does. Replay deterministically by recording the
  *actions*, not the raw pad reads — exactly the contract `replay` enforces.
- **Vibration / haptics** aren't wrapped — reach `navigator.getGamepads()[i]?.vibrationActuator`
  directly if you need rumble.

### Loop integration

`createGame` polls the gamepad at the top of `update`, **not**
`fixedUpdate`. Read in `update` (the canonical place for input), and pass
the result into `fixedUpdate` via state if your physics need it.

## Disabling input

Set the option to `false` if you don't want listeners installed at all:

```ts
const game = createGame({
  state,
  actions,
  keyboard: false,
  pointer: false,
  gamepad: false,
});
```

You still get `game.keyboard`, `game.pointer`, and `game.gamepad` — they're just no-op
stubs. Calling `game.keyboard.isDown('a')` always returns `false`; subscribers never
fire. This makes input fully optional without sprinkling `?.` everywhere.

## Cleanup

`game.destroy()` removes every listener that `gameplate` attached:

```ts
window.addEventListener('beforeunload', () => game.destroy());
```

Idempotent — safe to call multiple times.

## Headless / Node

In a non-browser environment, `createKeyboard()`, `createPointer()`, and
`createGamepad()` all return **no-op stubs** automatically. Same API, no exceptions.
This is what lets the same `game.ts` file run in tests and on a server.

```ts
// Works in Node without any guards:
import { createGame, defineActions } from 'gameplate';
const game = createGame({ state, actions });
game.keyboard.isDown('ArrowRight'); // → false
```

## Building on top: arrow-key "axis"

`gameplate` deliberately doesn't ship a "movement vector" helper across input
devices — everyone wants their own (WASD vs arrows, mixed sources, diagonal
normalization). Five lines:

```ts
function readAxis(game) {
  const stick = game.gamepad.stick('left');
  return {
    x:
      (game.keyboard.isDown('ArrowRight') ? 1 : 0) -
      (game.keyboard.isDown('ArrowLeft') ? 1 : 0) +
      stick.x,
    y:
      (game.keyboard.isDown('ArrowDown') ? 1 : 0) -
      (game.keyboard.isDown('ArrowUp') ? 1 : 0) +
      stick.y,
  };
}
```
