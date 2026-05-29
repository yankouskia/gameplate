import {
  createGamepad,
  type Gamepad,
  type GamepadOptions,
  type NativeGamepad,
} from './input/gamepad.js';
import { createKeyboard, type Keyboard } from './input/keyboard.js';
import { createPointer, type Pointer } from './input/pointer.js';
import { createLoop, type Loop, type LoopConfig, type Scheduler } from './loop.js';
import { createStore, type Store } from './store.js';

import type { ActionMap, Dispatch } from './actions.js';
import type { ActionTap } from './recorder.js';
import type { DeepReadonly, Listener, Unsubscribe } from './types.js';

/**
 * Configuration for {@link createGame}. See the property docs for a full
 * tour; the only required fields are `state` and `actions`.
 *
 * @category Game
 */
export interface GameConfig<S, A extends ActionMap<S>> {
  /** Initial state. */
  state: S;
  /** Action map. Use {@link defineActions} for the best inference. */
  actions: A;
  /**
   * Per-frame update hook. Receives current state, frame `dt` (seconds), and
   * the dispatcher so you can call actions from here.
   */
  update?: (state: DeepReadonly<S>, dt: number, actions: Dispatch<A>) => void;
  /**
   * Per-frame render hook. Receives state and `alpha` (interpolation factor
   * if `fixedStep` is set, else `0`).
   */
  render?: (state: DeepReadonly<S>, alpha: number) => void;
  /** Seconds per fixed tick (e.g. `1/60`). Omit for a variable-step loop. */
  fixedStep?: number;
  /** Fixed-step physics hook. Use when `fixedStep` is set. */
  fixedUpdate?: (state: DeepReadonly<S>, dt: number, actions: Dispatch<A>) => void;
  /** Cap on `dt` per frame (seconds). Default `0.25`. */
  maxDelta?: number;
  /** Whether to instantiate a {@link Keyboard}. Defaults `true` in browsers. */
  keyboard?: boolean | { target?: EventTarget; preventDefault?: boolean };
  /** Whether to instantiate a {@link Pointer}. Defaults `true` in browsers. */
  pointer?: boolean | { target?: EventTarget };
  /**
   * Whether to instantiate a {@link Gamepad}. Defaults `true` in browsers.
   * When enabled, the gamepad is polled automatically at the start of every
   * `update` tick — `game.gamepad.isDown('A')` inside your update hook reads
   * fresh state from the platform.
   */
  gamepad?: boolean | GamepadOptions;
  /** When `true`, every state value is `Object.freeze`d. Use in dev only. */
  dev?: boolean;
  /** Custom scheduler (tests, headless Node loop, etc.). */
  scheduler?: Scheduler;
  /**
   * Fires synchronously after every dispatched action's `setState` succeeds,
   * with the action name and its arguments. Hook a
   * {@link createRecorder | recorder}, logger, or analytics sink here.
   *
   * Firing *after* setState (rather than before) is deliberate: it keeps the
   * recorded event order identical to the apply order even when the tap
   * itself dispatches further actions, and skips events for actions that
   * threw — so recordings remain deterministically replayable.
   */
  tap?: ActionTap;
}

/**
 * The thing {@link createGame} returns. Everything you need to play.
 *
 * @category Game
 */
export interface Game<S, A extends ActionMap<S>> {
  /** Current state. Reference-equal until something changes it. */
  readonly state: () => DeepReadonly<S>;
  /** Dispatchers — call these to mutate state. */
  readonly actions: Dispatch<A>;
  /** Subscribe to state changes. */
  readonly subscribe: (listener: Listener<DeepReadonly<S>>) => Unsubscribe;
  /** Begin the game loop. No-op if already running. */
  readonly start: () => void;
  /** Pause the game loop. No-op if already stopped. */
  readonly stop: () => void;
  /** `true` while the loop is running. */
  readonly isRunning: () => boolean;
  /** The {@link Keyboard}, if enabled. Always defined; no-op in non-browsers. */
  readonly keyboard: Keyboard;
  /** The {@link Pointer}, if enabled. Always defined; no-op in non-browsers. */
  readonly pointer: Pointer;
  /** The {@link Gamepad}, if enabled. Always defined; no-op in non-browsers. */
  readonly gamepad: Gamepad;
  /** Underlying {@link Store} — for advanced composition. */
  readonly store: Store<S>;
  /** Underlying {@link Loop} — for advanced composition. */
  readonly loop: Loop;
  /** Stop the loop and detach all input listeners. Call before disposing. */
  readonly destroy: () => void;
}

/**
 * The simplest way to create a fully-wired game: typed store + game loop +
 * keyboard + pointer, all hooked together. Returns a {@link Game}.
 *
 * @category Game
 *
 * @example
 * ```ts
 * import { createGame, defineActions } from 'gameplate';
 *
 * type State = { x: number; y: number; score: number };
 *
 * const actions = defineActions<State>()({
 *   moveBy: (s, dx: number, dy: number) => ({ ...s, x: s.x + dx, y: s.y + dy }),
 *   addScore: (s, points: number) => ({ ...s, score: s.score + points }),
 * });
 *
 * const game = createGame({
 *   state: { x: 0, y: 0, score: 0 },
 *   actions,
 *   update: (state, dt, actions) => {
 *     if (game.keyboard.isDown('ArrowRight')) actions.moveBy(200 * dt, 0);
 *     if (game.keyboard.isDown('ArrowLeft'))  actions.moveBy(-200 * dt, 0);
 *   },
 *   render: (state) => {
 *     // your renderer here
 *   },
 * });
 *
 * game.start();
 * ```
 */
export function createGame<S, A extends ActionMap<S>>(config: GameConfig<S, A>): Game<S, A> {
  const store = createStore(config.state, { dev: config.dev ?? false });

  // Build dispatchers eagerly so identities are stable.
  const dispatch = Object.create(null) as Dispatch<A>;
  const tap = config.tap;
  for (const key of Object.keys(config.actions)) {
    const action = config.actions[key];
    if (action === undefined) continue;
    Object.defineProperty(dispatch, key, {
      enumerable: true,
      value: (...args: readonly never[]): void => {
        store.setState((current) => action(current, ...args));
        tap?.(key, args);
      },
    });
  }

  // Input: instantiate by default in browser-like envs; consumers can disable.
  const keyboard = (() => {
    if (config.keyboard === false) return createKeyboard({ target: emptyTarget() });
    if (typeof config.keyboard === 'object') return createKeyboard(config.keyboard);
    return createKeyboard();
  })();
  const pointer = (() => {
    if (config.pointer === false) return createPointer({ target: emptyTarget() });
    if (typeof config.pointer === 'object') return createPointer(config.pointer);
    return createPointer();
  })();
  const gamepad = (() => {
    if (config.gamepad === false) return createGamepad({ getGamepads: emptyGetGamepads });
    if (typeof config.gamepad === 'object') return createGamepad(config.gamepad);
    return createGamepad();
  })();

  const loopConfig: LoopConfig = {
    update: (dt) => {
      gamepad.poll();
      config.update?.(store.getState(), dt, dispatch);
    },
    render: (alpha) => config.render?.(store.getState(), alpha),
  };
  if (config.fixedStep !== undefined) loopConfig.fixedStep = config.fixedStep;
  if (config.maxDelta !== undefined) loopConfig.maxDelta = config.maxDelta;
  if (config.scheduler !== undefined) loopConfig.scheduler = config.scheduler;
  if (config.fixedUpdate !== undefined) {
    const fixedUpdate = config.fixedUpdate;
    loopConfig.fixedUpdate = (dt) => {
      fixedUpdate(store.getState(), dt, dispatch);
    };
  }
  const loop = createLoop(loopConfig);

  let destroyed = false;

  return {
    state: store.getState,
    actions: dispatch,
    subscribe: store.subscribe,
    start: loop.start,
    stop: loop.stop,
    isRunning: loop.isRunning,
    keyboard,
    pointer,
    gamepad,
    store,
    loop,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      loop.stop();
      keyboard.destroy();
      pointer.destroy();
      gamepad.destroy();
    },
  };
}

/** Tiny in-memory event-target stub so input no-ops cleanly when disabled. */
function emptyTarget(): EventTarget {
  return new EventTarget();
}

/** Empty-gamepad source for the `gamepad: false` branch — pure headless no-op. */
function emptyGetGamepads(): readonly (NativeGamepad | null)[] {
  return [];
}
