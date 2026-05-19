import type { Unsubscribe } from '../types.js';

/**
 * Normalized keyboard state + event API. Wraps `addEventListener('keydown' …)`
 * so you can write `keyboard.onDown('ArrowRight', …)` instead of filtering
 * key codes yourself.
 *
 * Key strings follow the [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key)
 * spec: `'ArrowUp'`, `'Enter'`, `'Escape'`, `' '` (space), `'a'`, etc.
 *
 * @category Input
 */
export interface Keyboard {
  /** `true` while `key` is held. */
  readonly isDown: (key: string) => boolean;
  /** Snapshot of every currently-held key. */
  readonly pressed: () => readonly string[];
  /** Fire `handler` once per real keydown for `key` (not repeats). */
  readonly onDown: (key: string, handler: (event: KeyboardEvent) => void) => Unsubscribe;
  /** Fire `handler` on every keyup for `key`. */
  readonly onUp: (key: string, handler: (event: KeyboardEvent) => void) => Unsubscribe;
  /** Fire `handler` for *any* keydown/keyup. Useful for capture-all overlays. */
  readonly onAny: (handler: (event: KeyboardEvent, type: 'down' | 'up') => void) => Unsubscribe;
  /** Remove every listener and detach from the target. Idempotent. */
  readonly destroy: () => void;
}

interface KeyboardOptions {
  /** Element to attach listeners to. Defaults to `window` in browsers. */
  target?: EventTarget;
  /** Pass `preventDefault: true` to call `.preventDefault()` on every event. */
  preventDefault?: boolean;
}

/**
 * Create a {@link Keyboard} bound to `window` (or a custom target).
 *
 * Returns a no-op stub when called in a non-browser environment so that
 * isomorphic game code doesn't crash on the server — `isDown` will always be
 * `false` and listeners will never fire.
 *
 * @category Input
 *
 * @example
 * ```ts
 * const kb = createKeyboard();
 * kb.onDown('ArrowRight', () => player.move(5, 0));
 * kb.onDown('Escape', () => game.stop());
 * // In your loop:
 * if (kb.isDown(' ')) player.charge();
 * ```
 */
export function createKeyboard(options: KeyboardOptions = {}): Keyboard {
  const target =
    options.target ??
    (typeof globalThis !== 'undefined' && 'addEventListener' in globalThis
      ? globalThis
      : undefined);

  if (target === undefined) return noopKeyboard();

  const pressed = new Set<string>();
  const downHandlers = new Map<string, Set<(event: KeyboardEvent) => void>>();
  const upHandlers = new Map<string, Set<(event: KeyboardEvent) => void>>();
  const anyHandlers = new Set<(event: KeyboardEvent, type: 'down' | 'up') => void>();

  const onKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (options.preventDefault === true) e.preventDefault();
    const isRepeat = pressed.has(e.key);
    pressed.add(e.key);
    if (!isRepeat) {
      const handlers = downHandlers.get(e.key);
      if (handlers !== undefined) for (const fn of handlers) fn(e);
    }
    for (const fn of anyHandlers) fn(e, 'down');
  };

  const onKeyUp = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (options.preventDefault === true) e.preventDefault();
    pressed.delete(e.key);
    const handlers = upHandlers.get(e.key);
    if (handlers !== undefined) for (const fn of handlers) fn(e);
    for (const fn of anyHandlers) fn(e, 'up');
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);

  let destroyed = false;

  return {
    isDown: (key) => pressed.has(key),
    pressed: () => [...pressed],
    onDown: (key, handler) => {
      const bucket = downHandlers.get(key) ?? new Set();
      bucket.add(handler);
      downHandlers.set(key, bucket);
      return () => {
        bucket.delete(handler);
        if (bucket.size === 0) downHandlers.delete(key);
      };
    },
    onUp: (key, handler) => {
      const bucket = upHandlers.get(key) ?? new Set();
      bucket.add(handler);
      upHandlers.set(key, bucket);
      return () => {
        bucket.delete(handler);
        if (bucket.size === 0) upHandlers.delete(key);
      };
    },
    onAny: (handler) => {
      anyHandlers.add(handler);
      return () => {
        anyHandlers.delete(handler);
      };
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      pressed.clear();
      downHandlers.clear();
      upHandlers.clear();
      anyHandlers.clear();
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

function noopKeyboard(): Keyboard {
  return {
    isDown: () => false,
    pressed: () => [],
    onDown: noListener,
    onUp: noListener,
    onAny: noListener,
    destroy: noDestroy,
  };
}
