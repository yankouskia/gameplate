import { describe, expect, it, vi } from 'vitest';

import { createEmitter } from './emitter.js';

describe('createEmitter', () => {
  it('starts with no listeners', () => {
    const emitter = createEmitter<number>();
    expect(emitter.size()).toBe(0);
  });

  it('invokes listeners in insertion order with (current, previous)', () => {
    const emitter = createEmitter<number>();
    const calls: [number, number][] = [];
    emitter.on((c, p) => calls.push([c, p]));
    emitter.on((c, p) => calls.push([c * 10, p * 10]));
    emitter.emit(2, 1);
    expect(calls).toEqual([
      [2, 1],
      [20, 10],
    ]);
  });

  it('unsubscribe removes the listener and is idempotent', () => {
    const emitter = createEmitter<number>();
    const fn = vi.fn();
    const off = emitter.on(fn);
    emitter.emit(1, 0);
    off();
    off();
    emitter.emit(2, 1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(emitter.size()).toBe(0);
  });

  it('listeners that unsubscribe themselves do not break iteration', () => {
    const emitter = createEmitter<number>();
    const seen: number[] = [];
    const offA = emitter.on(() => {
      seen.push(0);
      offA();
    });
    emitter.on(() => {
      seen.push(1);
    });
    emitter.emit(1, 0);
    emitter.emit(2, 1);
    expect(seen).toEqual([0, 1, 1]);
    expect(emitter.size()).toBe(1);
  });

  it('re-throws the first error after all listeners run', () => {
    const emitter = createEmitter<number>();
    const fn = vi.fn();
    emitter.on(() => {
      throw new Error('boom');
    });
    emitter.on(fn);
    expect(() => emitter.emit(1, 0)).toThrow('boom');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('clear removes all listeners', () => {
    const emitter = createEmitter<number>();
    emitter.on(() => {
      /* noop */
    });
    emitter.on(() => {
      /* noop */
    });
    expect(emitter.size()).toBe(2);
    emitter.clear();
    expect(emitter.size()).toBe(0);
  });
});
