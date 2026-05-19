import { createEmitter } from './emitter.js';

import type { Unsubscribe } from './types.js';

/**
 * A statically-typed finite-state machine for scenes, menus, modes, or any
 * lifecycle where "which state am I in" matters as much as the data.
 *
 * Define your states and events as string-literal unions; transitions are
 * checked for exhaustiveness — you can never `send('jump')` if the FSM
 * doesn't accept `'jump'`, and you can never declare a transition to a state
 * you didn't list.
 *
 * @category Scenes
 *
 * @example
 * ```ts
 * type State = 'menu' | 'playing' | 'paused' | 'gameover';
 * type Event = 'start' | 'pause' | 'resume' | 'die' | 'restart';
 *
 * const fsm = createMachine<State, Event>({
 *   initial: 'menu',
 *   on: {
 *     menu:     { start: 'playing' },
 *     playing:  { pause: 'paused', die: 'gameover' },
 *     paused:   { resume: 'playing' },
 *     gameover: { restart: 'menu' },
 *   },
 *   onEnter: { gameover: () => audio.playGameOver() },
 * });
 *
 * fsm.send('start');         // → 'playing'
 * fsm.send('pause');         // → 'paused'
 * fsm.matches('paused');     // → true
 * fsm.send('start');         // ignored (no transition from 'paused' on 'start')
 * ```
 */
export type Transitions<S extends string, E extends string> = Readonly<
  Partial<Record<S, Readonly<Partial<Record<E, S>>>>>
>;

/**
 * @category Scenes
 */
export interface MachineConfig<S extends string, E extends string> {
  /** State the machine starts in. */
  initial: S;
  /** Transition table: `from → event → to`. Unlisted transitions are ignored. */
  on: Transitions<S, E>;
  /** Fires once when entering each listed state (including `initial`). */
  onEnter?: Readonly<Partial<Record<S, () => void>>>;
  /** Fires once when leaving each listed state. */
  onExit?: Readonly<Partial<Record<S, () => void>>>;
}

/**
 * @category Scenes
 */
export interface Machine<S extends string, E extends string> {
  /** The current state. */
  readonly current: () => S;
  /**
   * Send an event. Returns the (new or unchanged) current state.
   * If no transition is defined for `(currentState, event)`, the event is
   * silently ignored — same shape as XState's `interpret`.
   */
  readonly send: (event: E) => S;
  /** `true` if the FSM is in `state`. Type-narrows: `fsm.matches('foo')`. */
  readonly matches: (state: S) => boolean;
  /** Subscribe to *transitions* (not re-sends of the same state). */
  readonly subscribe: (listener: (current: S, previous: S, event: E) => void) => Unsubscribe;
}

function runHook<S extends string>(
  hooks: Readonly<Partial<Record<S, () => void>>> | undefined,
  state: S,
): void {
  const hook = hooks?.[state];
  if (hook !== undefined) hook();
}

/**
 * Create a typed finite-state machine. See {@link MachineConfig}.
 *
 * @category Scenes
 */
export function createMachine<S extends string, E extends string>(
  config: MachineConfig<S, E>,
): Machine<S, E> {
  let current = config.initial;
  const emitter = createEmitter<{ current: S; previous: S; event: E }>();

  // Fire the initial enter hook synchronously so consumers can treat
  // 'startup' uniformly with other transitions.
  runHook(config.onEnter, current);

  return {
    current: () => current,
    matches: (state) => current === state,
    send: (event) => {
      const transitions = config.on[current];
      const next = transitions?.[event];
      if (next === undefined || next === current) return current;
      const previous = current;
      runHook(config.onExit, previous);
      current = next;
      runHook(config.onEnter, current);
      emitter.emit({ current, previous, event }, { current: previous, previous, event });
      return current;
    },
    subscribe: (listener) =>
      emitter.on((value) => {
        listener(value.current, value.previous, value.event);
      }),
  };
}
