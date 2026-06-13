/**
 * Game-time timers. Schedule callbacks in *seconds of game time* and advance
 * them yourself with `advance(dt)` — so they obey pause, slow-motion, and
 * fixed-step exactly like the rest of your simulation.
 *
 * Why not `setTimeout`? `setTimeout` runs on wall-clock time: it keeps firing
 * while the game is paused, ignores a slowed-down or sped-up clock, and drifts
 * from the loop. A game-time timer fires when *the game* has advanced far
 * enough — pause the loop and every timer pauses with it.
 *
 * {@link createGame | createGame} advances its `timers` for you at the top of
 * every `update` tick; for a hand-rolled loop, call `timers.advance(dt)`.
 *
 * @packageDocumentation
 */

/**
 * Handle to a scheduled timer. Returned by {@link Timers.after} /
 * {@link Timers.every}.
 *
 * @category Timers
 */
export interface TimerHandle {
  /** Cancel the timer. Idempotent; safe to call from inside its own callback. */
  readonly cancel: () => void;
  /** `true` until the timer has fired (one-shot) or been cancelled. */
  readonly active: () => boolean;
  /** Seconds of game time until the next fire. `0` once elapsed. */
  readonly remaining: () => number;
}

/**
 * A pool of game-time timers. Drive it with {@link Timers.advance}.
 *
 * @category Timers
 */
export interface Timers {
  /**
   * Fire `callback` once, `seconds` of game time from now. A non-positive
   * `seconds` fires on the next {@link Timers.advance | advance}.
   */
  readonly after: (seconds: number, callback: () => void) => TimerHandle;
  /**
   * Fire `callback` every `seconds` of game time, repeatedly. `seconds` must
   * be `> 0`. If a single `advance` spans multiple intervals, the callback
   * fires once per elapsed interval (catch-up), preserving the remainder.
   */
  readonly every: (seconds: number, callback: () => void) => TimerHandle;
  /**
   * Advance every active timer by `dt` seconds, firing those that come due (in
   * scheduule order). Timers created *during* an advance wait for the next one.
   */
  readonly advance: (dt: number) => void;
  /** Cancel every timer. */
  readonly cancelAll: () => void;
  /** Number of currently-active timers. */
  readonly count: () => number;
}

interface Timer {
  remaining: number;
  readonly interval: number;
  readonly repeat: boolean;
  readonly callback: () => void;
  active: boolean;
}

/**
 * Create a {@link Timers} pool.
 *
 * @category Timers
 *
 * @example
 * ```ts
 * const timers = createTimers();
 *
 * timers.after(2, () => spawnBoss());           // once, in 2s of game time
 * const wave = timers.every(0.5, () => spawn()); // every 0.5s
 *
 * // In your loop (createGame does this for you):
 * timers.advance(dt);
 *
 * wave.cancel(); // stop the repeating spawn
 * ```
 */
export function createTimers(): Timers {
  const timers = new Set<Timer>();

  const schedule = (seconds: number, callback: () => void, repeat: boolean): TimerHandle => {
    const timer: Timer = {
      remaining: seconds,
      interval: seconds,
      repeat,
      callback,
      active: true,
    };
    timers.add(timer);
    return {
      cancel: () => {
        timer.active = false;
        timers.delete(timer);
      },
      active: () => timer.active,
      remaining: () => (timer.active ? Math.max(0, timer.remaining) : 0),
    };
  };

  let advancing = false;

  return {
    after: (seconds, callback) => schedule(seconds, callback, false),
    every: (seconds, callback) => {
      if (!(seconds > 0)) {
        throw new Error('Timers.every(): interval must be > 0 seconds.');
      }
      return schedule(seconds, callback, true);
    },
    advance: (dt) => {
      // `!(dt > 0)` rather than `dt <= 0` so a NaN dt is a no-op instead of
      // poisoning every timer's `remaining` to NaN (an irreversible stall).
      if (!(dt > 0)) return;
      // Re-entrancy guard: a callback that calls advance() again would
      // re-snapshot still-active one-shots and re-fire them (unbounded
      // recursion). Advancing is inherently sequential — reject nesting.
      if (advancing) {
        throw new Error('Timers.advance(): cannot be called re-entrantly from a timer callback.');
      }
      advancing = true;
      try {
        // Snapshot: timers scheduled by a callback during this advance wait for
        // the next one, and a fixed snapshot keeps iteration stable under
        // mid-advance cancellation. (A timer an earlier callback cancelled is
        // still in the snapshot; the `while` guard below skips firing it.)
        const snapshot = [...timers];
        for (const timer of snapshot) {
          timer.remaining -= dt;
          while (timer.active && timer.remaining <= 0) {
            timer.callback();
            if (!timer.repeat) {
              timer.active = false;
              timers.delete(timer);
              break;
            }
            // Repeating: refill by exactly one interval so catch-up fires once
            // per elapsed period and the sub-interval remainder is preserved.
            const before = timer.remaining;
            timer.remaining += timer.interval;
            // Float underflow: if the interval is too small to change
            // `remaining`, adding it can't make progress — bail rather than
            // spin forever. (Reachable only with pathologically tiny intervals.)
            if (timer.remaining <= before) break;
          }
        }
      } finally {
        advancing = false;
      }
    },
    cancelAll: () => {
      for (const timer of timers) timer.active = false;
      timers.clear();
    },
    count: () => timers.size,
  };
}
