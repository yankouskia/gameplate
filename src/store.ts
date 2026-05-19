import { createEmitter } from './emitter.js';
import { deepFreeze } from './freeze.js';

import type { DeepReadonly, Listener, Unsubscribe } from './types.js';

/**
 * The internal store backing every {@link Game}. You'll rarely instantiate
 * this directly — `createGame` wraps it — but it's exported so you can use it
 * as a building block (e.g., for non-game UIs or for tests).
 *
 * All methods are bound, so destructuring is safe:
 *
 * ```ts
 * const { getState, subscribe } = createStore({ n: 0 });
 * ```
 *
 * @category State & Actions
 */
export interface Store<S> {
  /** Read the current state. Always returns the *same reference* until it changes. */
  readonly getState: () => DeepReadonly<S>;
  /**
   * Apply an updater. If the updater returns a new reference, listeners are
   * notified; if it returns the same reference, nothing fires (cheap no-op).
   */
  readonly setState: (updater: (current: DeepReadonly<S>) => S) => void;
  /** Subscribe to state changes. Returns an unsubscribe function. */
  readonly subscribe: (listener: Listener<DeepReadonly<S>>) => Unsubscribe;
  /** Number of active subscribers — useful for leak tests. */
  readonly listenerCount: () => number;
}

/**
 * Create a new {@link Store}.
 *
 * @param initial - Initial state value.
 * @param options - `dev: true` runs `Object.freeze` on every state, which
 *   surfaces accidental mutations as runtime errors. Skip it in production.
 *
 * @category State & Actions
 *
 * @example Minimal usage
 * ```ts
 * const store = createStore({ count: 0 });
 * store.subscribe((next, prev) => console.log(prev.count, '→', next.count));
 * store.setState((s) => ({ ...s, count: s.count + 1 }));
 * ```
 */
export function createStore<S>(initial: S, options: { dev?: boolean } = {}): Store<S> {
  const dev = options.dev ?? false;
  let state = (dev ? deepFreeze(initial) : initial) as DeepReadonly<S>;
  const emitter = createEmitter<DeepReadonly<S>>();

  return {
    getState: () => state,
    setState: (updater) => {
      const previous = state;
      const next = updater(state) as DeepReadonly<S>;
      if (Object.is(next, previous)) return;
      state = dev ? deepFreeze(next) : next;
      emitter.emit(state, previous);
    },
    subscribe: (listener) => emitter.on(listener),
    listenerCount: () => emitter.size(),
  };
}
