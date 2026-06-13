/* eslint-disable unicorn/no-unused-array-method-return --
   `Timers.every(...)` is our repeating-timer API, not `Array.prototype.every`;
   ignoring its TimerHandle return is the common case. */
import { describe, expect, it, vi } from 'vitest';

import { createTimers, type TimerHandle } from './timers.js';

const noop = (): void => {
  /* noop */
};

describe('createTimers — after (one-shot)', () => {
  it('fires once after the elapsed game time', () => {
    const timers = createTimers();
    const fn = vi.fn();
    timers.after(1, fn);
    timers.advance(0.5);
    expect(fn).not.toHaveBeenCalled();
    timers.advance(0.5);
    expect(fn).toHaveBeenCalledTimes(1);
    timers.advance(1);
    expect(fn).toHaveBeenCalledTimes(1); // does not repeat
  });

  it('after(0) fires on the next advance', () => {
    const timers = createTimers();
    const fn = vi.fn();
    timers.after(0, fn);
    expect(fn).not.toHaveBeenCalled();
    timers.advance(0.016);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('a one-shot timer is removed after firing', () => {
    const timers = createTimers();
    timers.after(0.5, () => {
      /* noop */
    });
    expect(timers.count()).toBe(1);
    timers.advance(0.5);
    expect(timers.count()).toBe(0);
  });

  it('fires when dt overshoots the delay', () => {
    const timers = createTimers();
    const fn = vi.fn();
    timers.after(1, fn);
    timers.advance(5); // big frame
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('createTimers — every (repeating)', () => {
  it('fires every interval', () => {
    const timers = createTimers();
    const fn = vi.fn();
    timers.every(1, fn);
    timers.advance(1);
    timers.advance(1);
    timers.advance(1);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('catches up: a large dt fires once per elapsed interval', () => {
    const timers = createTimers();
    const fn = vi.fn();
    timers.every(0.5, fn);
    timers.advance(2); // 2 / 0.5 = 4 intervals
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('preserves the sub-interval remainder across advances', () => {
    const timers = createTimers();
    const fn = vi.fn();
    timers.every(1, fn);
    timers.advance(0.7);
    expect(fn).toHaveBeenCalledTimes(0);
    timers.advance(0.7); // total 1.4 → one fire, 0.4 remainder carried
    expect(fn).toHaveBeenCalledTimes(1);
    timers.advance(0.7); // total 2.1 → second fire
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws on a non-positive interval', () => {
    const timers = createTimers();
    expect(() => timers.every(0, noop)).toThrow(/> 0/);
    expect(() => timers.every(-1, noop)).toThrow(/> 0/);
  });

  it('stays active across many fires', () => {
    const timers = createTimers();
    const handle = timers.every(1, noop);
    timers.advance(3);
    expect(handle.active()).toBe(true);
    expect(timers.count()).toBe(1);
  });
});

describe('createTimers — cancellation', () => {
  it('cancel stops a pending timer', () => {
    const timers = createTimers();
    const fn = vi.fn();
    const handle = timers.after(1, fn);
    handle.cancel();
    timers.advance(2);
    expect(fn).not.toHaveBeenCalled();
    expect(handle.active()).toBe(false);
  });

  it('cancel is idempotent', () => {
    const timers = createTimers();
    const handle = timers.after(1, noop);
    expect(() => {
      handle.cancel();
      handle.cancel();
    }).not.toThrow();
    expect(timers.count()).toBe(0);
  });

  it('a repeating timer can cancel itself from inside its callback', () => {
    const timers = createTimers();
    const fn = vi.fn();
    const handle = timers.every(1, () => {
      fn();
      handle.cancel();
    });
    timers.advance(5); // would be 5 fires without the self-cancel
    expect(fn).toHaveBeenCalledTimes(1);
    expect(handle.active()).toBe(false);
  });

  it('a callback can cancel another timer before it fires this advance', () => {
    const timers = createTimers();
    const victim = vi.fn();
    // The canceller is scheduled first, so it runs first in snapshot order
    // and cancels the (later, also-due) victim before its turn. The arrow
    // only runs during advance(), after victimHandle is assigned.
    timers.after(0.5, () => {
      victimHandle.cancel();
    });
    const victimHandle: TimerHandle = timers.after(1, victim);
    timers.advance(1); // both due this advance — canceller wins
    expect(victim).not.toHaveBeenCalled();
  });

  it('cancelAll clears everything', () => {
    const timers = createTimers();
    const a = vi.fn();
    const b = vi.fn();
    timers.after(1, a);
    timers.every(1, b);
    expect(timers.count()).toBe(2);
    timers.cancelAll();
    expect(timers.count()).toBe(0);
    timers.advance(5);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
});

describe('createTimers — handle introspection', () => {
  it('remaining() counts down and floors at 0', () => {
    const timers = createTimers();
    const handle = timers.after(2, noop);
    expect(handle.remaining()).toBe(2);
    timers.advance(0.5);
    expect(handle.remaining()).toBeCloseTo(1.5, 6);
    timers.advance(5);
    expect(handle.remaining()).toBe(0); // fired & inactive
  });

  it('active() reflects lifecycle', () => {
    const timers = createTimers();
    const handle = timers.after(1, noop);
    expect(handle.active()).toBe(true);
    timers.advance(1);
    expect(handle.active()).toBe(false);
  });

  it('remaining() tracks the carried remainder of a repeating timer', () => {
    const timers = createTimers();
    const handle = timers.every(1, noop);
    timers.advance(0.3);
    expect(handle.remaining()).toBeCloseTo(0.7, 6);
    timers.advance(0.8); // total 1.1 → fires once, 0.9 left to next
    expect(handle.remaining()).toBeCloseTo(0.9, 6);
    timers.advance(0.5); // total 1.6 → 0.4 left
    expect(handle.remaining()).toBeCloseTo(0.4, 6);
  });
});

describe('createTimers — advance semantics', () => {
  it('advance(0) and negative dt are no-ops', () => {
    const timers = createTimers();
    const fn = vi.fn();
    timers.after(0, fn);
    timers.advance(0);
    timers.advance(-1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('advance(NaN) is a no-op and does not poison timers', () => {
    const timers = createTimers();
    const fn = vi.fn();
    timers.after(1, fn);
    timers.advance(Number.NaN); // must not corrupt `remaining` to NaN
    expect(fn).not.toHaveBeenCalled();
    timers.advance(1); // a real advance afterwards still fires
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('advance is not re-entrant — calling it from a callback throws', () => {
    const timers = createTimers();
    let caught: unknown;
    timers.after(0.1, () => {
      try {
        timers.advance(1);
      } catch (error) {
        caught = error;
      }
    });
    timers.advance(0.1);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/re-entrant/);
  });

  it('every() catch-up fires floor(dt / interval) times and carries the remainder', () => {
    const timers = createTimers();
    const fn = vi.fn();
    timers.every(0.3, fn);
    timers.advance(1); // 1 / 0.3 = 3.33 → 3 fires, 0.1 carried (remaining ≈ -0.1 → +0.3 = 0.2... )
    expect(fn).toHaveBeenCalledTimes(3);
    timers.advance(0.05); // not enough for the 4th
    expect(fn).toHaveBeenCalledTimes(3);
    timers.advance(0.3); // crosses the 4th boundary
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('timers scheduled during an advance wait for the next advance', () => {
    const timers = createTimers();
    const inner = vi.fn();
    timers.after(0.5, () => {
      timers.after(0.1, inner); // scheduled mid-advance
    });
    timers.advance(1); // outer fires; inner is NOT fired this round
    expect(inner).not.toHaveBeenCalled();
    timers.advance(0.1);
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('not advancing means nothing fires (pause semantics)', () => {
    const timers = createTimers();
    const fn = vi.fn();
    timers.after(1, fn);
    // simulate a paused loop: never call advance
    expect(fn).not.toHaveBeenCalled();
    expect(timers.count()).toBe(1);
  });
});
