import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { browserScheduler, defaultScheduler, nodeScheduler } from './loop.js';

describe('browserScheduler', () => {
  it('uses requestAnimationFrame and performance.now', () => {
    const scheduler = browserScheduler();
    expect(typeof scheduler.now()).toBe('number');
    return new Promise<void>((resolve) => {
      const cancel = scheduler.schedule((t) => {
        expect(typeof t).toBe('number');
        cancel();
        resolve();
      });
    });
  });

  it('cancel removes the scheduled frame', () => {
    const scheduler = browserScheduler();
    let fired = false;
    const cancel = scheduler.schedule(() => {
      fired = true;
    });
    cancel();
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(fired).toBe(false);
        resolve();
      }, 50);
    });
  });

  it('throws if rAF is unavailable', () => {
    const original = globalThis.requestAnimationFrame;
    // @ts-expect-error — test mutation
    delete globalThis.requestAnimationFrame;
    try {
      expect(() => browserScheduler()).toThrow();
    } finally {
      globalThis.requestAnimationFrame = original;
    }
  });
});

describe('nodeScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses setTimeout at the configured rate', () => {
    const scheduler = nodeScheduler(120); // 120 Hz → ~8.33 ms
    const cb = vi.fn();
    scheduler.schedule(cb);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('cancel prevents the callback', () => {
    const scheduler = nodeScheduler(60);
    const cb = vi.fn();
    const cancel = scheduler.schedule(cb);
    cancel();
    vi.advanceTimersByTime(100);
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('defaultScheduler', () => {
  it('returns a working scheduler', () => {
    const scheduler = defaultScheduler();
    expect(typeof scheduler.now).toBe('function');
    expect(typeof scheduler.schedule).toBe('function');
  });
});
