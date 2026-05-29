/**
 * Record-and-replay primitives — capture every action a player dispatches,
 * then deterministically re-apply the sequence later. Pure, JSON-serialisable,
 * zero-dep.
 *
 * Common uses:
 * - **Bug repro.** Ship a JSON recording with a bug report.
 * - **Regression tests.** Record gameplay once; assert state on every CI run.
 * - **Server-authoritative validation.** Replay a client's recording on the
 *   server to detect impossible inputs.
 * - **Time-travel debugging.** Scrub to event _N_ to inspect the state then.
 *
 * @packageDocumentation
 */

import { deepFreeze } from './freeze.js';

import type { ActionMap } from './actions.js';
import type { DeepReadonly } from './types.js';

/**
 * A single recorded action dispatch.
 *
 * @category Recorder
 */
export interface RecordedEvent {
  /** Name of the action that was dispatched (the key in the action map). */
  readonly name: string;
  /** Positional arguments passed to the action. Should be JSON-serialisable. */
  readonly args: readonly unknown[];
  /** Milliseconds elapsed since `recorder.start()`. */
  readonly t: number;
}

/**
 * A complete recording — the initial state plus every action dispatched while
 * the recorder was active. Re-derive any state moment with {@link replay}.
 *
 * The shape is plain data and JSON-safe (assuming `S` and the action args are
 * JSON-safe), so you can `JSON.stringify` it and persist it anywhere.
 *
 * @category Recorder
 */
export interface Recording<S> {
  /** State at the moment `recorder.start()` was called. */
  readonly initialState: S;
  /** Every action dispatched between `start()` and `stop()`, in order. */
  readonly events: readonly RecordedEvent[];
  /** Diagnostic metadata. Ignored by {@link replay} — safe to omit on re-import. */
  readonly meta: {
    /** Value of the recorder's clock when `start()` was called. */
    readonly startedAt: number;
    /** Value of the recorder's clock when `stop()` was called. */
    readonly endedAt: number;
    /** Recording format version. Bumped on any breaking shape change. */
    readonly version: number;
  };
}

/**
 * Hook that {@link Recorder} hands to `createGame` via its `tap` field.
 *
 * Fires synchronously *after* each action's `setState` succeeds, with the
 * action's name and the arguments it was called with. Actions that throw
 * never fire the tap — so a recording always replays cleanly.
 *
 * @category Recorder
 */
export type ActionTap = (name: string, args: readonly unknown[]) => void;

/**
 * Recorder handle returned by {@link createRecorder}. Pass `tap` to
 * `createGame({ tap })`, then drive with `start` / `stop`.
 *
 * @category Recorder
 */
export interface Recorder<S> {
  /** Hand this to `createGame({ tap })`. No-op while not recording. */
  readonly tap: ActionTap;
  /**
   * Begin a fresh recording, snapshotting `initialState`. Discards any
   * in-progress recording — call `stop()` first to keep it.
   */
  readonly start: (initialState: S) => void;
  /**
   * Stop the in-progress recording and return it. Subsequent calls return the
   * same value until `start()` is called again.
   *
   * @throws If `start()` was never called.
   */
  readonly stop: () => Recording<S>;
  /** Discard any in-progress or completed recording. */
  readonly clear: () => void;
  /** `true` between `start()` and `stop()`. */
  readonly isRecording: () => boolean;
}

/**
 * Options for {@link createRecorder}.
 *
 * @category Recorder
 */
export interface RecorderOptions {
  /**
   * Time source for event timestamps. Default: `Date.now`. Pass
   * `performance.now` for sub-ms precision, or a fake clock in tests.
   */
  readonly now?: () => number;
  /**
   * Predicate run for every dispatched action. Return `false` to drop the
   * event from the recording — useful for excluding high-frequency or
   * sensitive actions (PII, chat, idle pulses).
   */
  readonly filter?: (name: string, args: readonly unknown[]) => boolean;
}

/**
 * Current {@link Recording} format version. Stamped into `recording.meta.version`
 * by {@link createRecorder} — bumped on any breaking change to the shape.
 *
 * Compare against `recording.meta.version` to gate on schema compatibility
 * when loading recordings persisted by older library versions.
 *
 * @category Recorder
 */
export const RECORDING_VERSION = 1;

/** Internal recorder state machine — keeps TypeScript narrow without `!`. */
type RecorderState<S> =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'recording';
      readonly initialState: S;
      readonly startedAt: number;
      readonly events: RecordedEvent[];
    }
  | { readonly kind: 'stopped'; readonly recording: Recording<S> };

/**
 * Create a {@link Recorder}. Pass `recorder.tap` to `createGame({ tap })` so
 * the recorder sees every dispatched action; drive with `start` / `stop`.
 *
 * @category Recorder
 *
 * @example
 * ```ts
 * import { createGame, createRecorder, defineActions, replay } from 'gameplate';
 *
 * type State = { score: number };
 * const actions = defineActions<State>()({
 *   add: (s, n: number) => ({ score: s.score + n }),
 * });
 *
 * const recorder = createRecorder<State>();
 * const game = createGame({ state: { score: 0 }, actions, tap: recorder.tap });
 *
 * recorder.start(game.state());
 * game.actions.add(10);
 * game.actions.add(20);
 * const recording = recorder.stop();
 *
 * // Deterministic re-derivation — perfect for tests.
 * replay(recording, actions); // → { score: 30 }
 *
 * // Persist anywhere — recordings are plain JSON.
 * const blob = JSON.stringify(recording);
 * const restored: Recording<State> = JSON.parse(blob);
 * replay(restored, actions); // → { score: 30 }
 * ```
 */
export function createRecorder<S>(options: RecorderOptions = {}): Recorder<S> {
  const now = options.now ?? defaultNow;
  const filter = options.filter;
  let state: RecorderState<S> = { kind: 'idle' };

  return {
    tap: (name, args) => {
      if (state.kind !== 'recording') return;
      if (filter !== undefined && !filter(name, args)) return;
      state.events.push({ name, args: [...args], t: now() - state.startedAt });
    },
    start: (initialState) => {
      state = { kind: 'recording', initialState, startedAt: now(), events: [] };
    },
    stop: () => {
      if (state.kind === 'stopped') return state.recording;
      if (state.kind !== 'recording') {
        throw new Error('Recorder.stop(): start() was never called.');
      }
      // Freeze the events array so the `readonly` in `Recording.events`
      // matches the runtime — `(rec.events as RecordedEvent[]).push(...)`
      // (or accidental shared-reference mutation) now throws in strict mode.
      const events = Object.freeze(state.events);
      const recording: Recording<S> = {
        initialState: state.initialState,
        events,
        meta: {
          startedAt: state.startedAt,
          endedAt: now(),
          version: RECORDING_VERSION,
        },
      };
      state = { kind: 'stopped', recording };
      return recording;
    },
    clear: () => {
      state = { kind: 'idle' };
    },
    isRecording: () => state.kind === 'recording',
  };
}

/**
 * Compose several taps into one. Pass the result to `createGame({ tap })` when
 * you want the recorder *and* a logger *and* an analytics sink to see every
 * dispatch.
 *
 * Calls run in argument order; one tap throwing aborts the rest for that
 * dispatch (same shape as DOM event listeners — caller catches if they care).
 *
 * @category Recorder
 *
 * @example
 * ```ts
 * const game = createGame({
 *   ...,
 *   tap: composeTaps(recorder.tap, (n, a) => console.debug(n, a)),
 * });
 * ```
 */
export function composeTaps(...taps: readonly ActionTap[]): ActionTap {
  return (name, args) => {
    for (const tap of taps) tap(name, args);
  };
}

/**
 * Return a shorter recording that keeps the first `until` events (clamped to
 * `[0, events.length]`). Use to shrink a recording to its minimal reproducer
 * once `replay(..., { until: N })` has located the failing event.
 *
 * The result is a fresh recording; the input is not modified.
 *
 * @category Recorder
 */
export function truncateRecording<S>(recording: Recording<S>, until: number): Recording<S> {
  const max = recording.events.length;
  const limit = Math.max(0, Math.min(until, max));
  const events = Object.freeze(recording.events.slice(0, limit));
  const last = events.at(-1);
  return {
    initialState: recording.initialState,
    events,
    meta: {
      startedAt: recording.meta.startedAt,
      endedAt: last === undefined ? recording.meta.startedAt : recording.meta.startedAt + last.t,
      version: recording.meta.version,
    },
  };
}

function defaultNow(): number {
  return Date.now();
}

/**
 * Options for {@link replay}.
 *
 * @category Recorder
 */
export interface ReplayOptions<S> {
  /**
   * Apply at most this many events from the recording (clamped to
   * `[0, events.length]`). Use to scrub to a specific point.
   */
  readonly until?: number;
  /** Called after each applied event with the resulting state. */
  readonly onTick?: (state: DeepReadonly<S>, event: RecordedEvent, index: number) => void;
  /**
   * When `true`, every intermediate state is deep-frozen — surfaces accidental
   * action mutations as `TypeError`s. Slower; use in tests, not production.
   *
   * The recording's `initialState` is structured-cloned before freezing, so
   * the caller's reference is never mutated.
   */
  readonly dev?: boolean;
}

/**
 * Deterministically re-apply a {@link Recording} against the given action map.
 *
 * Pure: the result depends only on `recording` and `actions`. Throws if the
 * recording references an action that's not in `actions` (a version mismatch).
 *
 * @category Recorder
 *
 * @example Final state
 * ```ts
 * const final = replay(recording, actions);
 * ```
 *
 * @example Time-travel scrub to event N
 * ```ts
 * const stateAt5 = replay(recording, actions, { until: 5 });
 * ```
 *
 * @example Build a state history
 * ```ts
 * const history: State[] = [recording.initialState];
 * replay(recording, actions, { onTick: (s) => history.push(s) });
 * ```
 */
export function replay<S>(
  recording: Recording<S>,
  actions: ActionMap<S>,
  options: ReplayOptions<S> = {},
): DeepReadonly<S> {
  const total = recording.events.length;
  const requested = options.until ?? total;
  const limit = Math.max(0, Math.min(requested, total));
  const freeze = options.dev === true;

  // In dev mode we structured-clone the initial state before freezing so the
  // freeze doesn't escape into the caller's recording (a debug-only flag
  // permanently freezing user data would be a footgun).
  let state: S = freeze
    ? deepFreeze(structuredClone(recording.initialState))
    : recording.initialState;
  for (let index = 0; index < limit; index++) {
    const event = recording.events[index];
    if (event === undefined) break;
    const action = actions[event.name];
    if (action === undefined) {
      throw new Error(
        `replay: action "${event.name}" is not in the provided action map (event ${index.toString()}).`,
      );
    }
    // The action's arg tuple is erased at this generic boundary; we trust the
    // recording (and surface mismatches when the action itself runs).
    state = (action as unknown as LooseAction<S>)(state, ...event.args);
    if (freeze) state = deepFreeze(state);
    options.onTick?.(state as DeepReadonly<S>, event, index);
  }
  return state as DeepReadonly<S>;
}

type LooseAction<S> = (state: S, ...args: readonly unknown[]) => S;
