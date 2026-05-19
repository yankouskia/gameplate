import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPointer } from './pointer.js';

function dispatchPointer(
  target: EventTarget,
  type: 'pointermove' | 'pointerdown' | 'pointerup',
  x: number,
  y: number,
): void {
  const event = new PointerEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    pointerType: 'mouse',
  });
  target.dispatchEvent(event);
}

describe('createPointer', () => {
  let target: EventTarget;
  beforeEach(() => {
    target = new EventTarget();
  });

  it('tracks last x/y and isDown', () => {
    const p = createPointer({ target });
    expect(p.x()).toBe(0);
    expect(p.y()).toBe(0);
    expect(p.isDown()).toBe(false);
    dispatchPointer(target, 'pointermove', 10, 20);
    expect(p.x()).toBe(10);
    expect(p.y()).toBe(20);
    dispatchPointer(target, 'pointerdown', 10, 20);
    expect(p.isDown()).toBe(true);
    dispatchPointer(target, 'pointerup', 10, 20);
    expect(p.isDown()).toBe(false);
  });

  it('move handlers receive a delta from the previous position', () => {
    const p = createPointer({ target });
    const calls: { x: number; y: number; dx: number; dy: number }[] = [];
    p.onMove((s) => calls.push({ x: s.x, y: s.y, dx: s.dx, dy: s.dy }));
    dispatchPointer(target, 'pointermove', 10, 10);
    dispatchPointer(target, 'pointermove', 15, 25);
    expect(calls[1]).toEqual({ x: 15, y: 25, dx: 5, dy: 15 });
  });

  it('down/up handlers report the position at the event', () => {
    const p = createPointer({ target });
    const down = vi.fn();
    const up = vi.fn();
    p.onDown(down);
    p.onUp(up);
    dispatchPointer(target, 'pointerdown', 3, 4);
    expect(down).toHaveBeenCalledWith(expect.objectContaining({ x: 3, y: 4, isDown: true }));
    dispatchPointer(target, 'pointerup', 7, 8);
    expect(up).toHaveBeenCalledWith(expect.objectContaining({ x: 7, y: 8, isDown: false }));
  });

  it('localizes to a target element via getBoundingClientRect', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'getBoundingClientRect', {
      value: () => ({ left: 100, top: 200, right: 300, bottom: 400, width: 200, height: 200 }),
    });
    const p = createPointer({ target: element });
    dispatchPointer(element, 'pointermove', 150, 250);
    expect(p.x()).toBe(50);
    expect(p.y()).toBe(50);
  });

  it('destroy detaches listeners and is idempotent', () => {
    const p = createPointer({ target });
    const fn = vi.fn();
    p.onMove(fn);
    p.destroy();
    p.destroy();
    dispatchPointer(target, 'pointermove', 1, 1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('unsubscribers remove individual handlers', () => {
    const p = createPointer({ target });
    const a = vi.fn();
    const b = vi.fn();
    const offA = p.onMove(a);
    p.onMove(b);
    offA();
    dispatchPointer(target, 'pointermove', 1, 1);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });
});
