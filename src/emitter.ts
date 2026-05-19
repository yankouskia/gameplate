import type { Listener, Unsubscribe } from './types.js';

/**
 * Internal — a tiny typed event emitter built on a `Set` of listeners.
 *
 * Listeners are invoked in insertion order. Throwing inside a listener does
 * not stop other listeners; the first error is re-thrown after the emit
 * completes (others are dropped — deliberate, to match DOM semantics).
 *
 * @internal
 */
export interface Emitter<T> {
  readonly emit: (current: T, previous: T) => void;
  readonly on: (listener: Listener<T>) => Unsubscribe;
  readonly size: () => number;
  readonly clear: () => void;
}

export function createEmitter<T>(): Emitter<T> {
  const listeners = new Set<Listener<T>>();

  return {
    emit: (current, previous) => {
      let firstError: unknown;
      let hasError = false;
      // Snapshot so listeners added/removed mid-emit don't perturb this round.
      // eslint-disable-next-line unicorn/prefer-spread -- explicit snapshot for safety
      const snapshot = Array.from(listeners);
      for (const fn of snapshot) {
        try {
          fn(current, previous);
        } catch (error) {
          if (!hasError) {
            firstError = error;
            hasError = true;
          }
        }
      }
      if (hasError) {
        throw firstError as Error;
      }
    },
    on: (listener) => {
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },
    size: () => listeners.size,
    clear: () => {
      listeners.clear();
    },
  };
}
