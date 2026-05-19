/**
 * Recursively make every property of `T` `readonly`.
 *
 * Used to make state passed into actions/selectors uneditable at compile time,
 * so `s.player.x = 10` is a TypeScript error and consumers are nudged toward
 * immutable updates.
 *
 * Functions, arrays, maps, sets, and primitives are handled.
 *
 * @category Utilities
 * @example
 * ```ts
 * type State = { player: { x: number; y: number } };
 * type Readonly = DeepReadonly<State>;
 * // ^? { readonly player: { readonly x: number; readonly y: number } }
 * ```
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends ReadonlySet<infer U>
        ? ReadonlySet<DeepReadonly<U>>
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;

/**
 * A cleanup function returned by any `subscribe` / `on*` method.
 *
 * Calling it removes the listener. Idempotent — calling twice is a no-op.
 *
 * @category Utilities
 */
export type Unsubscribe = () => void;

/**
 * Listener fired when state changes. Receives the new and previous values.
 *
 * @category State & Actions
 */
export type Listener<T> = (current: T, previous: T) => void;
