import type { Unsubscribe } from '../types.js';

/**
 * A normalized pointer event (mouse, pen, touch — same shape).
 *
 * Coordinates are *target-relative* when a `HTMLElement` target is passed
 * (using `getBoundingClientRect()`); otherwise they're page coordinates.
 *
 * @category Input
 */
export interface PointerState {
  /** Pointer X, in target-local CSS pixels. */
  x: number;
  /** Pointer Y, in target-local CSS pixels. */
  y: number;
  /** Distance since the previous event on the X axis. */
  dx: number;
  /** Distance since the previous event on the Y axis. */
  dy: number;
  /** Whether the primary button is currently pressed. */
  isDown: boolean;
  /** The underlying DOM event, if you need it. */
  event: PointerEvent;
}

/**
 * Normalized pointer (mouse/touch/pen) state.
 *
 * @category Input
 */
export interface Pointer {
  /** Last seen X coordinate. */
  readonly x: () => number;
  /** Last seen Y coordinate. */
  readonly y: () => number;
  /** `true` while a primary button is held. */
  readonly isDown: () => boolean;
  /** Fires on every pointermove. */
  readonly onMove: (handler: (state: PointerState) => void) => Unsubscribe;
  /** Fires on pointerdown. */
  readonly onDown: (handler: (state: PointerState) => void) => Unsubscribe;
  /** Fires on pointerup. */
  readonly onUp: (handler: (state: PointerState) => void) => Unsubscribe;
  /** Remove listeners and detach. Idempotent. */
  readonly destroy: () => void;
}

interface PointerOptions {
  target?: EventTarget;
}

/**
 * Create a {@link Pointer} bound to an element (or `window` by default).
 *
 * No-op stub when called server-side, just like {@link createKeyboard}.
 *
 * @category Input
 *
 * @example
 * ```ts
 * const canvas = document.querySelector('canvas')!;
 * const pointer = createPointer({ target: canvas });
 * pointer.onDown(({ x, y }) => game.actions.spawn(x, y));
 * pointer.onMove(({ x, y, isDown }) => { if (isDown) game.actions.drag(x, y); });
 * ```
 */
export function createPointer(options: PointerOptions = {}): Pointer {
  const target =
    options.target ??
    (typeof globalThis !== 'undefined' && 'addEventListener' in globalThis
      ? globalThis
      : undefined);

  if (target === undefined) return noopPointer();

  let lastX = 0;
  let lastY = 0;
  let down = false;
  const moveHandlers = new Set<(s: PointerState) => void>();
  const downHandlers = new Set<(s: PointerState) => void>();
  const upHandlers = new Set<(s: PointerState) => void>();

  const localize = (event: PointerEvent): { x: number; y: number; dx: number; dy: number } => {
    const element = target as Partial<Element>;
    let x = event.clientX;
    let y = event.clientY;
    if (typeof element.getBoundingClientRect === 'function') {
      const rect = element.getBoundingClientRect();
      x -= rect.left;
      y -= rect.top;
    }
    const dx = x - lastX;
    const dy = y - lastY;
    return { x, y, dx, dy };
  };

  const onMove = (event: Event): void => {
    const e = event as PointerEvent;
    const { x, y, dx, dy } = localize(e);
    lastX = x;
    lastY = y;
    const state: PointerState = { x, y, dx, dy, isDown: down, event: e };
    for (const fn of moveHandlers) fn(state);
  };

  const onDown = (event: Event): void => {
    const e = event as PointerEvent;
    down = true;
    const { x, y, dx, dy } = localize(e);
    lastX = x;
    lastY = y;
    const state: PointerState = { x, y, dx, dy, isDown: true, event: e };
    for (const fn of downHandlers) fn(state);
  };

  const onUp = (event: Event): void => {
    const e = event as PointerEvent;
    down = false;
    const { x, y, dx, dy } = localize(e);
    lastX = x;
    lastY = y;
    const state: PointerState = { x, y, dx, dy, isDown: false, event: e };
    for (const fn of upHandlers) fn(state);
  };

  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointerup', onUp);

  let destroyed = false;

  return {
    x: () => lastX,
    y: () => lastY,
    isDown: () => down,
    onMove: (handler) => {
      moveHandlers.add(handler);
      return () => {
        moveHandlers.delete(handler);
      };
    },
    onDown: (handler) => {
      downHandlers.add(handler);
      return () => {
        downHandlers.delete(handler);
      };
    },
    onUp: (handler) => {
      upHandlers.add(handler);
      return () => {
        upHandlers.delete(handler);
      };
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerdown', onDown);
      target.removeEventListener('pointerup', onUp);
      moveHandlers.clear();
      downHandlers.clear();
      upHandlers.clear();
    },
  };
}

const noUnsubscribe: Unsubscribe = () => {
  /* no-op */
};
const noListener = (): Unsubscribe => noUnsubscribe;
const noDestroy = (): void => {
  /* no-op */
};

function noopPointer(): Pointer {
  return {
    x: () => 0,
    y: () => 0,
    isDown: () => false,
    onMove: noListener,
    onDown: noListener,
    onUp: noListener,
    destroy: noDestroy,
  };
}
