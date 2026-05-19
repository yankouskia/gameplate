/**
 * Memoized state selectors. Cheap, dependency-free, typed.
 *
 * `createSelector` returns a function that computes a derived value from
 * state. The combiner re-runs *only* when one of its declared inputs returns
 * a new reference (compared by `Object.is`). Reading the same state twice
 * never re-computes.
 *
 * @category Selectors
 *
 * @example A simple computed value
 * ```ts
 * const visibleEnemies = createSelector(
 *   (s: State) => s.enemies,
 *   (enemies) => enemies.filter((e) => e.visible),
 * );
 *
 * visibleEnemies(state);  // computes
 * visibleEnemies(state);  // memoized
 * ```
 *
 * @example Combining inputs (Reselect-style)
 * ```ts
 * const playerInRange = createSelector(
 *   [(s: State) => s.player, (s: State) => s.enemies] as const,
 *   (player, enemies) =>
 *     enemies.filter((e) => Math.hypot(e.x - player.x, e.y - player.y) < 100),
 * );
 * ```
 */
export type Selector<S, R> = (state: S) => R;

/**
 * A selector signature where state is contravariantly "any". Used only as a
 * structural constraint that survives generic inference.
 *
 * @internal
 */
type AnyStateSelector = (state: never) => unknown;

type StateOf<F> = F extends (state: infer S) => unknown ? S : never;
type ResultOf<F> = F extends (state: never) => infer R ? R : never;

type TupleResults<T extends readonly AnyStateSelector[]> = {
  [K in keyof T]: ResultOf<T[K]>;
};

/**
 * Overload 1: a single input selector.
 *
 * The combiner receives the selector's return value and produces a derived
 * result. Memoized: while the input's return value is `Object.is`-equal to
 * the previous one, the combiner is not re-run.
 */
export function createSelector<F extends AnyStateSelector, R>(
  input: F,
  combiner: (value: ResultOf<F>) => R,
): Selector<StateOf<F>, R>;
/**
 * Overload 2: an array of input selectors.
 *
 * The combiner receives each input's return value as positional args. The
 * combiner is re-run when *any* input's reference changes.
 */
export function createSelector<T extends readonly AnyStateSelector[], R>(
  inputs: T,
  combiner: (...values: TupleResults<T>) => R,
): Selector<StateOf<T[number]>, R>;
export function createSelector(
  inputs: AnyStateSelector | readonly AnyStateSelector[],
  combiner: (...values: readonly unknown[]) => unknown,
): Selector<unknown, unknown> {
  const inputArray: readonly AnyStateSelector[] = Array.isArray(inputs) ? inputs : [inputs];
  let lastInputs: readonly unknown[] | undefined;
  let lastResult: unknown;
  let hasResult = false;

  return (state: unknown): unknown => {
    const current = inputArray.map((sel) => (sel as (s: unknown) => unknown)(state));
    if (
      hasResult &&
      lastInputs?.length === current.length &&
      lastInputs.every((value, i) => Object.is(value, current[i]))
    ) {
      return lastResult;
    }
    lastInputs = current;
    lastResult = combiner(...current);
    hasResult = true;
    return lastResult;
  };
}
