/**
 * Loop primitives — variable & fixed timestep, fully testable via a Scheduler
 * abstraction. Used by {@link createGame} but exported so you can build
 * something else on top.
 */

/**
 * A `Scheduler` decouples the loop from `requestAnimationFrame`/`setTimeout`,
 * so tests can drive it with a fake clock without ever touching real time.
 *
 * Default schedulers exist for the browser (rAF) and Node (setImmediate).
 *
 * @category Loop
 */
export interface Scheduler {
  /** Current high-resolution time in milliseconds. */
  readonly now: () => number;
  /**
   * Schedule `callback` for the next frame. The `timestamp` arg matches
   * `now()` at the time the callback fires.
   *
   * Returns a cancel function.
   */
  readonly schedule: (callback: (timestamp: number) => void) => () => void;
}

/**
 * @category Loop
 */
export interface LoopConfig {
  /**
   * Called every frame with the elapsed seconds since the previous frame
   * (`dt`). Use for camera, input polling, UI tween, etc.
   */
  update?: (dt: number) => void;
  /**
   * Called every frame *after* update. If `fixedStep` is set, receives an
   * `alpha` in `[0, 1)` for interpolating between fixed updates — useful for
   * smooth rendering at any framerate.
   */
  render?: (alpha: number) => void;
  /**
   * Seconds per fixed tick (e.g. `1/60` for 60 Hz physics). When set, the
   * loop runs `fixedUpdate` 0..N times per frame to catch up to wall time.
   *
   * Omit for a pure variable-step loop.
   */
  fixedStep?: number;
  /**
   * Called for each fixed tick when `fixedStep` is set. `dt` is exactly
   * `fixedStep`, every time — deterministic for physics.
   */
  fixedUpdate?: (dt: number) => void;
  /**
   * Cap on per-frame elapsed time, in seconds. Prevents the "spiral of death"
   * after a tab pauses or the debugger trips. Default `0.25` (250 ms).
   */
  maxDelta?: number;
  /** Custom scheduler — useful for tests or non-browser runtimes. */
  scheduler?: Scheduler;
}

/**
 * @category Loop
 */
export interface Loop {
  /** Begin scheduling frames. No-op if already running. */
  readonly start: () => void;
  /** Cancel any pending frame. No-op if already stopped. */
  readonly stop: () => void;
  /** Whether `start()` has been called more recently than `stop()`. */
  readonly isRunning: () => boolean;
}

function hasRequestAnimationFrame(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame === 'function'
  );
}

/**
 * Default browser scheduler — `performance.now` + `requestAnimationFrame`.
 *
 * @category Loop
 */
export function browserScheduler(): Scheduler {
  if (!hasRequestAnimationFrame()) {
    throw new Error('browserScheduler() requires a window/rAF — use nodeScheduler() instead.');
  }
  return {
    now: () => globalThis.performance.now(),
    schedule: (cb) => {
      const id = globalThis.requestAnimationFrame(cb);
      return () => {
        globalThis.cancelAnimationFrame(id);
      };
    },
  };
}

/**
 * Default Node scheduler — `performance.now` + `setImmediate` at ~60 Hz.
 * Useful for headless game logic, simulation, or server-authoritative play.
 *
 * @category Loop
 */
export function nodeScheduler(targetHz = 60): Scheduler {
  const interval = 1000 / targetHz;
  const start = performance.now();
  return {
    now: () => performance.now() - start,
    schedule: (cb) => {
      const id = setTimeout(() => {
        cb(performance.now() - start);
      }, interval);
      return () => {
        clearTimeout(id);
      };
    },
  };
}

/**
 * Auto-pick `browserScheduler` or `nodeScheduler` based on environment.
 *
 * @category Loop
 */
export function defaultScheduler(): Scheduler {
  return hasRequestAnimationFrame() ? browserScheduler() : nodeScheduler();
}

/**
 * Create a deterministic game loop. Most users want {@link createGame}
 * instead; reach for this when you need the loop without state/input layers.
 *
 * @category Loop
 *
 * @example Variable timestep
 * ```ts
 * const loop = createLoop({
 *   update: (dt) => console.log('frame, dt =', dt),
 * });
 * loop.start();
 * ```
 *
 * @example Fixed timestep with interpolation
 * ```ts
 * const loop = createLoop({
 *   fixedStep: 1 / 60,
 *   fixedUpdate: (dt) => physics.step(dt),
 *   render: (alpha) => renderer.draw(alpha),
 * });
 * loop.start();
 * ```
 */
const FIXED_STEP_EPSILON = 1e-9;

export function createLoop(config: LoopConfig = {}): Loop {
  const scheduler = config.scheduler ?? defaultScheduler();
  const maxDelta = config.maxDelta ?? 0.25;
  const fixedStep = config.fixedStep;
  const hasFixed = typeof fixedStep === 'number' && fixedStep > 0;

  let running = false;
  let cancel: (() => void) | undefined;
  let lastTimestamp: number | undefined;
  let accumulator = 0;

  const tick = (timestamp: number): void => {
    if (!running) return;
    const previous = lastTimestamp ?? timestamp;
    let dt = (timestamp - previous) / 1000;
    if (dt > maxDelta) dt = maxDelta;
    if (dt < 0) dt = 0;
    lastTimestamp = timestamp;

    config.update?.(dt);

    if (hasFixed && config.fixedUpdate !== undefined) {
      accumulator += dt;
      // Cap accumulator too, so a long pause doesn't drown us in catch-up ticks.
      if (accumulator > maxDelta) accumulator = maxDelta;
      // Epsilon absorbs floating-point error so a 1/60 step doesn't drift.
      while (accumulator + FIXED_STEP_EPSILON >= fixedStep) {
        config.fixedUpdate(fixedStep);
        accumulator -= fixedStep;
      }
      if (accumulator < 0) accumulator = 0;
      config.render?.(accumulator / fixedStep);
    } else {
      config.render?.(0);
    }

    cancel = scheduler.schedule(tick);
  };

  return {
    start: () => {
      if (running) return;
      running = true;
      lastTimestamp = undefined;
      accumulator = 0;
      cancel = scheduler.schedule(tick);
    },
    stop: () => {
      if (!running) return;
      running = false;
      cancel?.();
      cancel = undefined;
    },
    isRunning: () => running,
  };
}
