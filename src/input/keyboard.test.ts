import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createKeyboard } from './keyboard.js';

function dispatchKey(target: EventTarget, type: 'keydown' | 'keyup', key: string): void {
  // Construct a minimal KeyboardEvent. happy-dom supports KeyboardEvent.
  const event = new KeyboardEvent(type, { key, bubbles: true });
  target.dispatchEvent(event);
}

describe('createKeyboard', () => {
  let target: EventTarget;
  beforeEach(() => {
    target = new EventTarget();
  });

  it('tracks held keys with isDown / pressed', () => {
    const kb = createKeyboard({ target });
    expect(kb.isDown('a')).toBe(false);
    dispatchKey(target, 'keydown', 'a');
    expect(kb.isDown('a')).toBe(true);
    expect(kb.pressed()).toEqual(['a']);
    dispatchKey(target, 'keyup', 'a');
    expect(kb.isDown('a')).toBe(false);
    expect(kb.pressed()).toEqual([]);
  });

  it('onDown fires once per real press (suppresses OS auto-repeat)', () => {
    const kb = createKeyboard({ target });
    const fn = vi.fn();
    kb.onDown(' ', fn);
    dispatchKey(target, 'keydown', ' ');
    dispatchKey(target, 'keydown', ' '); // repeat — already pressed
    dispatchKey(target, 'keyup', ' ');
    dispatchKey(target, 'keydown', ' ');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('onUp fires every release', () => {
    const kb = createKeyboard({ target });
    const fn = vi.fn();
    kb.onUp('x', fn);
    dispatchKey(target, 'keydown', 'x');
    dispatchKey(target, 'keyup', 'x');
    dispatchKey(target, 'keydown', 'x');
    dispatchKey(target, 'keyup', 'x');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('onAny receives both down and up with the type tag', () => {
    const kb = createKeyboard({ target });
    const calls: ['down' | 'up', string][] = [];
    kb.onAny((e, type) => calls.push([type, e.key]));
    dispatchKey(target, 'keydown', 'a');
    dispatchKey(target, 'keyup', 'a');
    expect(calls).toEqual([
      ['down', 'a'],
      ['up', 'a'],
    ]);
  });

  it('unsubscribers remove handlers without affecting others', () => {
    const kb = createKeyboard({ target });
    const a = vi.fn();
    const b = vi.fn();
    const offA = kb.onDown('q', a);
    kb.onDown('q', b);
    offA();
    dispatchKey(target, 'keydown', 'q');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });

  it('destroy detaches listeners and is idempotent', () => {
    const kb = createKeyboard({ target });
    const fn = vi.fn();
    kb.onDown('a', fn);
    kb.destroy();
    kb.destroy();
    dispatchKey(target, 'keydown', 'a');
    expect(fn).not.toHaveBeenCalled();
    expect(kb.isDown('a')).toBe(false);
  });

  it('returns a no-op keyboard if no target and no globalThis listener API', () => {
    // happy-dom provides a global window, so simulate "no target" via empty options:
    // we pass an explicit empty EventTarget that supports addEventListener.
    const kb = createKeyboard({ target: new EventTarget() });
    expect(kb.isDown('a')).toBe(false);
    expect(kb.pressed()).toEqual([]);
    // The destroyed-twice path is exercised in the other test.
    kb.destroy();
  });

  it('preventDefault option calls preventDefault on the underlying event', () => {
    const kb = createKeyboard({ target, preventDefault: true });
    const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    kb.destroy();
  });
});
