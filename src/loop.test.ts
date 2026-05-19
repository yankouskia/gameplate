import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createLoop, type Scheduler } from './loop.js';

/** A scheduler we can drive manually from tests. */
function fakeScheduler(): Scheduler & { tick: (deltaMs: number) => void; pending: number } {
  let now = 0;
  let pending: ((t: number) => void) | undefined;
  return {
    now: () => now,
    schedule(cb) {
      pending = cb;
      return () => {
        pending = undefined;
      };
    },
    tick(deltaMs) {
      now += deltaMs;
      const cb = pending;
      pending = undefined;
      cb?.(now);
    },
    get pending(): number {
      return pending === undefined ? 0 : 1;
    },
  };
}

describe('createLoop', () => {
  let scheduler: ReturnType<typeof fakeScheduler>;
  beforeEach(() => {
    scheduler = fakeScheduler();
  });

  it('does not call update before start', () => {
    const update = vi.fn();
    createLoop({ scheduler, update });
    scheduler.tick(16);
    expect(update).not.toHaveBeenCalled();
  });

  it('calls update with seconds between ticks', () => {
    const update = vi.fn();
    const loop = createLoop({ scheduler, update });
    loop.start();
    scheduler.tick(16);
    scheduler.tick(16);
    expect(update.mock.calls[0]?.[0]).toBeCloseTo(0);
    expect(update.mock.calls[1]?.[0]).toBeCloseTo(0.016, 3);
  });

  it('caps dt at maxDelta to avoid spiral of death', () => {
    const update = vi.fn();
    const loop = createLoop({ scheduler, update, maxDelta: 0.1 });
    loop.start();
    scheduler.tick(0);
    scheduler.tick(5000); // 5 seconds
    expect(update.mock.calls[1]?.[0]).toBeCloseTo(0.1, 5);
  });

  it('isRunning reflects start/stop', () => {
    const loop = createLoop({ scheduler });
    expect(loop.isRunning()).toBe(false);
    loop.start();
    expect(loop.isRunning()).toBe(true);
    loop.stop();
    expect(loop.isRunning()).toBe(false);
  });

  it('start is idempotent', () => {
    const update = vi.fn();
    const loop = createLoop({ scheduler, update });
    loop.start();
    loop.start();
    loop.start();
    scheduler.tick(16);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('stop is idempotent and cancels pending frame', () => {
    const update = vi.fn();
    const loop = createLoop({ scheduler, update });
    loop.start();
    loop.stop();
    loop.stop();
    scheduler.tick(16);
    expect(update).not.toHaveBeenCalled();
  });

  it('fixed timestep runs N catch-up ticks per frame', () => {
    const fixedUpdate = vi.fn();
    const render = vi.fn();
    const loop = createLoop({
      scheduler,
      fixedStep: 0.01,
      fixedUpdate,
      render,
    });
    loop.start();
    scheduler.tick(0);
    // 50 ms of wall time → 5 fixed ticks of 10 ms
    scheduler.tick(50);
    expect(fixedUpdate).toHaveBeenCalledTimes(5);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('passes alpha in [0, 1) to render under fixed step', () => {
    const render = vi.fn();
    const loop = createLoop({
      scheduler,
      fixedStep: 0.01,
      fixedUpdate: () => {
        /* noop */
      },
      render,
    });
    loop.start();
    scheduler.tick(0);
    scheduler.tick(15); // 1.5 fixed ticks → 1 catch-up, alpha = 0.5
    const alpha = render.mock.calls[1]?.[0] as number;
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThan(1);
    expect(alpha).toBeCloseTo(0.5, 5);
  });

  it('without fixed step, render receives alpha=0', () => {
    const render = vi.fn();
    const loop = createLoop({ scheduler, render });
    loop.start();
    scheduler.tick(16);
    expect(render).toHaveBeenCalledWith(0);
  });
});
