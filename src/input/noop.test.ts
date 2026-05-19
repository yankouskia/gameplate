/**
 * Verify the no-op fallback paths fire when there's no target and no
 * suitable global. We simulate "headless Node" by stripping the
 * `addEventListener` capability from globalThis temporarily.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createKeyboard } from './keyboard.js';
import { createPointer } from './pointer.js';

describe('input no-op fallbacks (headless env)', () => {
  let originalAdd: typeof globalThis.addEventListener | undefined;

  beforeEach(() => {
    originalAdd = globalThis.addEventListener.bind(globalThis);
    // Remove the global so the createXxx fallbacks take the noop branch.
    Reflect.deleteProperty(globalThis, 'addEventListener');
  });

  afterEach(() => {
    if (originalAdd !== undefined) {
      Object.defineProperty(globalThis, 'addEventListener', {
        value: originalAdd,
        configurable: true,
        writable: true,
      });
    }
  });

  it('createKeyboard() returns a no-op keyboard', () => {
    const kb = createKeyboard();
    expect(kb.isDown('a')).toBe(false);
    expect(kb.pressed()).toEqual([]);
    const off = kb.onDown('a', () => {
      /* noop */
    });
    off();
    kb.destroy();
  });

  it('createPointer() returns a no-op pointer', () => {
    const p = createPointer();
    expect(p.x()).toBe(0);
    expect(p.y()).toBe(0);
    expect(p.isDown()).toBe(false);
    const off = p.onMove(() => {
      /* noop */
    });
    off();
    p.destroy();
  });
});
