import type { DeepReadonly } from './types.js';

/**
 * An action is a pure function: `(state, ...args) => newState`.
 *
 * The state argument is `DeepReadonly<S>` so the compiler stops you from
 * mutating in place. Return a *new* object — spread, structured-clone,
 * Immer, whatever you prefer.
 *
 * @category State & Actions
 *
 * @example
 * ```ts
 * const moveBy: Action<{ x: number; y: number }, [dx: number, dy: number]> =
 *   (s, dx, dy) => ({ x: s.x + dx, y: s.y + dy });
 * ```
 */
export type Action<S, Args extends readonly unknown[] = readonly unknown[]> = (
  state: DeepReadonly<S>,
  ...args: Args
) => S;

/**
 * An untyped action shape used only as a generic constraint. The `never[]`
 * params type leverages contravariance so it accepts any action signature
 * while preventing direct calls.
 *
 * @internal
 */
export type AnyAction<S> = (state: DeepReadonly<S>, ...args: never[]) => S;

/**
 * A record of actions keyed by their dispatcher name.
 *
 * @category State & Actions
 */
export type ActionMap<S> = Record<string, AnyAction<S>>;

/**
 * Turn an {@link ActionMap} into a dispatch object: each entry becomes a
 * function with the *state argument stripped*. Calling it applies the action
 * and returns `void`.
 *
 * This is the type magic behind `game.actions.move(5, 0)` working with full
 * IntelliSense even though the underlying handler was
 * `(state, dx, dy) => newState`.
 *
 * @category State & Actions
 */
export type Dispatch<A> = {
  [K in keyof A]: A[K] extends (state: never, ...args: infer P) => unknown
    ? (...args: P) => void
    : never;
};

/**
 * Define a typed action map for a known state type `S`.
 *
 * **Why is it called twice?** `defineActions<State>()(actions)` is a curried
 * call. The first call fixes `S`; the second infers each action's argument
 * tuple. Without the split, TS would have to either widen state to `unknown`
 * or force you to retype `S` in every action — either is worse.
 *
 * @category State & Actions
 *
 * @example
 * ```ts
 * type State = { player: { x: number; y: number }; score: number };
 *
 * const actions = defineActions<State>()({
 *   move: (s, dx: number, dy: number) => ({
 *     ...s,
 *     player: { x: s.player.x + dx, y: s.player.y + dy },
 *   }),
 *   addScore: (s, points: number) => ({ ...s, score: s.score + points }),
 * });
 *
 * // Later:
 * const game = createGame({ state: initial, actions });
 * game.actions.move(5, 0);     // typed: (dx: number, dy: number) => void
 * game.actions.addScore(100);  // typed: (points: number) => void
 * ```
 */
export function defineActions<S>(): <A extends ActionMap<S>>(actions: A) => A {
  return identity;
}

/** Identity function — the curried second call of {@link defineActions} just hands back its argument. */
const identity = <T>(value: T): T => value;
