/**
 * Normalized gamepad input. Wraps the browser Gamepad API into the same
 * polled-state shape as {@link Keyboard} and {@link Pointer}, plus per-frame
 * edge detection (`wasPressed` / `wasReleased`) and radial-deadzoned sticks.
 *
 * Driven by polling — call {@link Gamepad.poll} once per frame.
 * {@link createGame | createGame} wires this up automatically; if you build
 * your own loop, call `gamepad.poll()` at the top of each tick.
 *
 * Headless-safe: when no platform `getGamepads` is reachable (or `gamepad:
 * false` was passed to `createGame`), every reader returns `false` / `0` /
 * empty arrays. An exception thrown by `getGamepads()` is treated the same
 * way — the game loop never dies from a flaky platform API.
 *
 * @category Input
 */

import type { Unsubscribe } from '../types.js';

/**
 * Standard-mapping button names (W3C "Standard Gamepad", Xbox naming).
 *
 * | Name    | Index | | Name  | Index |
 * | :------ | :---: | :- | :---- | :---: |
 * | `A`     |   0   | | `LS`  |  10   |
 * | `B`     |   1   | | `RS`  |  11   |
 * | `X`     |   2   | | `Up`  |  12   |
 * | `Y`     |   3   | | `Down`|  13   |
 * | `LB`    |   4   | | `Left`|  14   |
 * | `RB`    |   5   | | `Right`| 15  |
 * | `LT`    |   6   | | `Home`|  16   |
 * | `RT`    |   7   |
 * | `Back`  |   8   |
 * | `Start` |   9   |
 *
 * PlayStation/other layouts map by position, not glyph — `'A'` is the
 * bottom face button (PS cross), `'B'` is the right face button (PS circle).
 *
 * @category Input
 */
export type StandardButton =
  | 'A'
  | 'B'
  | 'X'
  | 'Y'
  | 'LB'
  | 'RB'
  | 'LT'
  | 'RT'
  | 'Back'
  | 'Start'
  | 'LS'
  | 'RS'
  | 'Up'
  | 'Down'
  | 'Left'
  | 'Right'
  | 'Home';

/**
 * Standard-mapping axis names. Axis values are −1 to 1 in screen
 * coordinates: **Y is positive downward**, so a forward stick push reads
 * negative on `LeftY` / `RightY`.
 *
 * @category Input
 */
export type StandardAxis = 'LeftX' | 'LeftY' | 'RightX' | 'RightY';

/**
 * Frame snapshot of a single gamepad slot. Read-only by contract.
 *
 * @category Input
 */
export interface GamepadState {
  /** Slot index (0..N). Matches `navigator.getGamepads()[i]`. */
  readonly index: number;
  /** Platform-reported id (e.g. `"Xbox Wireless Controller (STANDARD GAMEPAD)"`). */
  readonly id: string;
  /** `true` when a real gamepad is reporting on this slot. */
  readonly connected: boolean;
  /** Button states: `pressed` is the boolean read; `value` is the analog 0..1 read. */
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
  /** Raw axis values, −1..1, in slot order. Deadzone is **not** applied here. */
  readonly axes: readonly number[];
}

/**
 * Minimal shape gameplate consumes from a platform gamepad. Structurally
 * compatible with the DOM `Gamepad` interface — you can pass
 * `() => navigator.getGamepads()` for `getGamepads` without casts.
 *
 * @category Input
 */
export interface NativeGamepad {
  readonly id: string;
  readonly index: number;
  readonly connected: boolean;
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
  readonly axes: readonly number[];
}

/**
 * Normalized gamepad reader.
 *
 * @category Input
 */
export interface Gamepad {
  /** `true` while `button` is currently held on `padIndex` (default 0). */
  readonly isDown: (button: number | StandardButton, padIndex?: number) => boolean;
  /** Pressed *this poll* (false-to-true edge since the previous poll). */
  readonly wasPressed: (button: number | StandardButton, padIndex?: number) => boolean;
  /** Released *this poll* (true-to-false edge since the previous poll). */
  readonly wasReleased: (button: number | StandardButton, padIndex?: number) => boolean;
  /** Analog value `0..1` for a button (triggers, mostly). Digital buttons read `0` or `1`. */
  readonly value: (button: number | StandardButton, padIndex?: number) => number;
  /** Per-axis read, with the configured deadzone applied — values within ±deadzone read as `0`. */
  readonly axis: (axis: number | StandardAxis, padIndex?: number) => number;
  /** Stick as a `{x, y}` vector with **radial** deadzone (vector length is what's gated). */
  readonly stick: (which: 'left' | 'right', padIndex?: number) => { x: number; y: number };
  /** Count of slots with `connected: true`. */
  readonly count: () => number;
  /** `true` when at least one pad is connected. */
  readonly connected: () => boolean;
  /** Snapshot of every pad slot. Empty slots show as `connected: false` stubs. */
  readonly pads: () => readonly GamepadState[];
  /**
   * Sample the platform and advance the edge-detection bookkeeping.
   * Call once per frame. {@link createGame} does this for you. No-op after
   * {@link Gamepad.destroy | destroy}.
   */
  readonly poll: () => void;
  /**
   * Fires the first time a slot transitions disconnected → connected. On
   * the very first poll, any already-connected pad fires immediately — so
   * 'Press A to begin' works without a separate enumeration pass.
   */
  readonly onConnect: (handler: (pad: GamepadState) => void) => Unsubscribe;
  /** Fires when a slot transitions connected → disconnected. */
  readonly onDisconnect: (handler: (pad: GamepadState) => void) => Unsubscribe;
  /** Detach handlers and stop polling. Idempotent. */
  readonly destroy: () => void;
}

/**
 * Options for {@link createGamepad}.
 *
 * @category Input
 */
export interface GamepadOptions {
  /**
   * Deadzone applied by `axis` (per-axis) and `stick` (radial). Default `0.1`.
   * Pass `0` to read raw values.
   */
  readonly deadzone?: number;
  /**
   * Snapshot getter. Defaults to `navigator.getGamepads`. Override for tests,
   * for non-browser runtimes, or to swap in a recorded input stream.
   */
  readonly getGamepads?: () => readonly (NativeGamepad | null)[];
}

/**
 * Standard-mapping button → numeric-index lookup. Frozen and exported so you
 * can iterate (debug overlay, remap UI) or reverse-lookup a name from a
 * number without hand-rolling the table.
 *
 * @category Input
 */
export const STANDARD_BUTTONS: Readonly<Record<StandardButton, number>> = Object.freeze({
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  Back: 8,
  Start: 9,
  LS: 10,
  RS: 11,
  Up: 12,
  Down: 13,
  Left: 14,
  Right: 15,
  Home: 16,
});

/**
 * Standard-mapping axis → numeric-index lookup.
 *
 * @category Input
 */
export const STANDARD_AXES: Readonly<Record<StandardAxis, number>> = Object.freeze({
  LeftX: 0,
  LeftY: 1,
  RightX: 2,
  RightY: 3,
});

function resolveButton(button: number | StandardButton): number {
  return typeof button === 'number' ? button : STANDARD_BUTTONS[button];
}

function resolveAxis(axis: number | StandardAxis): number {
  return typeof axis === 'number' ? axis : STANDARD_AXES[axis];
}

function applyAxisDeadzone(value: number, deadzone: number): number {
  return Math.abs(value) < deadzone ? 0 : value;
}

function snapshotPad(pad: NativeGamepad | null, slotIndex: number): GamepadState {
  if (pad === null) {
    return { index: slotIndex, id: '', connected: false, buttons: [], axes: [] };
  }
  return {
    index: pad.index,
    id: pad.id,
    connected: pad.connected,
    buttons: pad.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
    axes: [...pad.axes],
  };
}

function defaultGetGamepads(): readonly (NativeGamepad | null)[] {
  if (typeof globalThis === 'undefined') return [];
  const nav = (
    globalThis as { navigator?: { getGamepads?: () => readonly (NativeGamepad | null)[] } }
  ).navigator;
  return nav?.getGamepads?.() ?? [];
}

/**
 * Create a {@link Gamepad} reader. Pass the result through `createGame`
 * (it's installed at `game.gamepad` and polled for you), or call `poll()`
 * yourself once per frame.
 *
 * @category Input
 *
 * @example
 * ```ts
 * const game = createGame({
 *   state: { x: 0 },
 *   actions,
 *   update: (s, dt, actions) => {
 *     const { x, y } = game.gamepad.stick('left');
 *     actions.moveBy(x * 200 * dt, y * 200 * dt);
 *     if (game.gamepad.wasPressed('A')) actions.jump();
 *   },
 * });
 * game.start();
 * ```
 */
export function createGamepad(options: GamepadOptions = {}): Gamepad {
  const deadzone = options.deadzone ?? 0.1;
  const getGamepads = options.getGamepads ?? defaultGetGamepads;

  let current: readonly GamepadState[] = [];
  let previous: readonly GamepadState[] = [];
  let destroyed = false;
  const connectHandlers = new Set<(pad: GamepadState) => void>();
  const disconnectHandlers = new Set<(pad: GamepadState) => void>();

  const buttonState = (
    button: number | StandardButton,
    padIndex: number,
    source: readonly GamepadState[],
  ): { pressed: boolean; value: number } => {
    const pad = source[padIndex];
    const idx = resolveButton(button);
    return pad?.buttons[idx] ?? { pressed: false, value: 0 };
  };

  const fireConnectionDiff = (): void => {
    if (connectHandlers.size === 0 && disconnectHandlers.size === 0) return;
    const slots = Math.max(current.length, previous.length);
    for (let i = 0; i < slots; i++) {
      const wasConnected = previous[i]?.connected ?? false;
      const nowConnected = current[i]?.connected ?? false;
      if (!wasConnected && nowConnected) {
        const pad = current[i];
        if (pad !== undefined) for (const h of connectHandlers) h(pad);
      } else if (wasConnected && !nowConnected) {
        const pad = previous[i];
        if (pad !== undefined) for (const h of disconnectHandlers) h(pad);
      }
    }
  };

  return {
    isDown: (button, padIndex = 0) => buttonState(button, padIndex, current).pressed,
    wasPressed: (button, padIndex = 0) =>
      buttonState(button, padIndex, current).pressed &&
      !buttonState(button, padIndex, previous).pressed,
    wasReleased: (button, padIndex = 0) =>
      !buttonState(button, padIndex, current).pressed &&
      buttonState(button, padIndex, previous).pressed,
    value: (button, padIndex = 0) => buttonState(button, padIndex, current).value,
    axis: (axis, padIndex = 0) => {
      const raw = current[padIndex]?.axes[resolveAxis(axis)] ?? 0;
      return applyAxisDeadzone(raw, deadzone);
    },
    stick: (which, padIndex = 0) => {
      const xIdx = which === 'left' ? 0 : 2;
      const yIdx = which === 'left' ? 1 : 3;
      const x = current[padIndex]?.axes[xIdx] ?? 0;
      const y = current[padIndex]?.axes[yIdx] ?? 0;
      const magnitude = Math.hypot(x, y);
      // `<=` covers the deadzone-zero NaN case (would divide by 0 below)
      // and the natural inside-deadzone case in one branch.
      if (magnitude <= deadzone) return { x: 0, y: 0 };
      // Standard Gamepad axes are independently in [-1, 1], so a diagonal
      // can push magnitude up to √2. Clamp to the unit circle, then rescale
      // `[deadzone, 1] → [0, 1]` along the original vector so the direction
      // is preserved and the magnitude saturates cleanly at 1.
      const clamped = Math.min(1, magnitude);
      const scale = (clamped - deadzone) / (1 - deadzone) / magnitude;
      return { x: x * scale, y: y * scale };
    },
    count: () => current.reduce((n, pad) => (pad.connected ? n + 1 : n), 0),
    connected: () => current.some((pad) => pad.connected),
    pads: () => current,
    poll: () => {
      if (destroyed) return;
      previous = current;
      // `getGamepads()` can throw (insecure context, denied permission, some
      // Firefox privacy modes). Degrade to empty so a flaky platform API
      // never permanently kills the game loop.
      let native: readonly (NativeGamepad | null)[];
      try {
        native = getGamepads();
      } catch {
        native = [];
      }
      current = native.map((pad, slotIndex) => snapshotPad(pad, slotIndex));
      fireConnectionDiff();
    },
    onConnect: (handler) => {
      connectHandlers.add(handler);
      return () => {
        connectHandlers.delete(handler);
      };
    },
    onDisconnect: (handler) => {
      disconnectHandlers.add(handler);
      return () => {
        disconnectHandlers.delete(handler);
      };
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      connectHandlers.clear();
      disconnectHandlers.clear();
      current = [];
      previous = [];
    },
  };
}
