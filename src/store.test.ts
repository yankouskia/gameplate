import { describe, expect, it, vi } from 'vitest';

import { createStore } from './store.js';

describe('createStore', () => {
  it('returns the initial state from getState', () => {
    const store = createStore({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
  });

  it('setState updates state and notifies subscribers', () => {
    const store = createStore({ count: 0 });
    const fn = vi.fn();
    store.subscribe(fn);
    store.setState((s) => ({ ...s, count: s.count + 1 }));
    expect(store.getState()).toEqual({ count: 1 });
    expect(fn).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
  });

  it('does not notify if updater returns the same reference', () => {
    const store = createStore({ count: 0 });
    const fn = vi.fn();
    store.subscribe(fn);
    store.setState((s) => s);
    expect(fn).not.toHaveBeenCalled();
  });

  it('unsubscribe stops further notifications', () => {
    const store = createStore({ count: 0 });
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.setState((s) => ({ ...s, count: 1 }));
    off();
    store.setState((s) => ({ ...s, count: 2 }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('listenerCount reflects active subscribers', () => {
    const store = createStore({ count: 0 });
    const offA = store.subscribe(() => {
      /* noop */
    });
    const offB = store.subscribe(() => {
      /* noop */
    });
    expect(store.listenerCount()).toBe(2);
    offA();
    expect(store.listenerCount()).toBe(1);
    offB();
    expect(store.listenerCount()).toBe(0);
  });

  it('dev: true freezes state and surfaces mutations', () => {
    const store = createStore({ count: 0 }, { dev: true });
    expect(Object.isFrozen(store.getState())).toBe(true);
    expect(() => {
      (store.getState() as { count: number }).count = 99;
    }).toThrow(TypeError);
  });
});
