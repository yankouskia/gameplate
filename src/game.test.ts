import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defineActions } from './actions.js';
import { createGame } from './game.js';

import type { Scheduler } from './loop.js';

interface State {
  x: number;
  y: number;
  score: number;
}

function fakeScheduler(): Scheduler & { tick: (deltaMs: number) => void } {
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
  };
}

const actions = defineActions<State>()({
  moveBy: (s, dx: number, dy: number) => ({ ...s, x: s.x + dx, y: s.y + dy }),
  addScore: (s, points: number) => ({ ...s, score: s.score + points }),
  reset: (s) => ({ ...s, x: 0, y: 0, score: 0 }),
});

describe('createGame', () => {
  let scheduler: ReturnType<typeof fakeScheduler>;
  beforeEach(() => {
    scheduler = fakeScheduler();
  });

  it('exposes initial state, actions, store, loop', () => {
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      keyboard: false,
      pointer: false,
    });
    expect(game.state()).toEqual({ x: 0, y: 0, score: 0 });
    expect(game.isRunning()).toBe(false);
    expect(typeof game.actions.moveBy).toBe('function');
    expect(typeof game.actions.addScore).toBe('function');
    expect(game.store).toBeDefined();
    expect(game.loop).toBeDefined();
  });

  it('dispatchers apply actions and stay reference-stable', () => {
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      keyboard: false,
      pointer: false,
    });
    const ref = game.actions.moveBy;
    game.actions.moveBy(3, 4);
    expect(game.state()).toEqual({ x: 3, y: 4, score: 0 });
    expect(game.actions.moveBy).toBe(ref);
  });

  it('subscribers fire on state changes', () => {
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      keyboard: false,
      pointer: false,
    });
    const fn = vi.fn();
    game.subscribe(fn);
    game.actions.addScore(10);
    expect(fn).toHaveBeenCalledWith({ x: 0, y: 0, score: 10 }, { x: 0, y: 0, score: 0 });
  });

  it('update hook receives state, dt, and dispatchers', () => {
    const update = vi.fn();
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      update,
      keyboard: false,
      pointer: false,
    });
    game.start();
    scheduler.tick(0);
    scheduler.tick(16);
    expect(update).toHaveBeenCalledTimes(2);
    const [state, dt, dispatch] = update.mock.calls[1] as [State, number, typeof game.actions];
    expect(state).toEqual({ x: 0, y: 0, score: 0 });
    expect(dt).toBeCloseTo(0.016, 3);
    dispatch.addScore(5);
    expect(game.state().score).toBe(5);
  });

  it('fixedUpdate is invoked when fixedStep is set', () => {
    const fixedUpdate = vi.fn();
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      fixedStep: 0.01,
      fixedUpdate,
      keyboard: false,
      pointer: false,
    });
    game.start();
    scheduler.tick(0);
    scheduler.tick(35);
    expect(fixedUpdate).toHaveBeenCalledTimes(3);
  });

  it('render receives state and alpha', () => {
    const render = vi.fn();
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      render,
      keyboard: false,
      pointer: false,
    });
    game.start();
    scheduler.tick(16);
    expect(render).toHaveBeenCalledWith({ x: 0, y: 0, score: 0 }, 0);
  });

  it('destroy stops loop and detaches input', () => {
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      keyboard: false,
      pointer: false,
    });
    game.start();
    game.destroy();
    expect(game.isRunning()).toBe(false);
    // destroy() is idempotent
    game.destroy();
  });

  it('dev:true freezes state — direct mutation throws', () => {
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      dev: true,
      keyboard: false,
      pointer: false,
    });
    expect(() => {
      (game.state() as { x: number }).x = 99;
    }).toThrow(TypeError);
  });

  it('keyboard:false / pointer:false yield no-op-like input objects', () => {
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      keyboard: false,
      pointer: false,
    });
    expect(game.keyboard.isDown('a')).toBe(false);
    expect(game.pointer.isDown()).toBe(false);
    game.destroy();
  });

  it('gamepad:false produces an empty, never-throwing reader', () => {
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      keyboard: false,
      pointer: false,
      gamepad: false,
    });
    expect(game.gamepad.isDown('A')).toBe(false);
    expect(game.gamepad.connected()).toBe(false);
    expect(game.gamepad.stick('left')).toEqual({ x: 0, y: 0 });
    game.destroy();
  });

  it('gamepad option object configures getGamepads', () => {
    const pads = [
      {
        id: 'fake',
        index: 0,
        connected: true,
        buttons: [{ pressed: true, value: 1 }],
        axes: [],
      },
    ];
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      keyboard: false,
      pointer: false,
      gamepad: { getGamepads: () => pads },
    });
    game.gamepad.poll();
    expect(game.gamepad.isDown('A')).toBe(true);
    game.destroy();
  });

  it('createGame polls gamepad before every update tick', () => {
    let frame = 0;
    const snapshots = [
      [
        {
          id: 'p',
          index: 0,
          connected: true,
          buttons: [{ pressed: false, value: 0 }],
          axes: [],
        },
      ],
      [
        {
          id: 'p',
          index: 0,
          connected: true,
          buttons: [{ pressed: true, value: 1 }],
          axes: [],
        },
      ],
    ];
    const observed: boolean[] = [];
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      keyboard: false,
      pointer: false,
      gamepad: {
        getGamepads: () => snapshots[frame] ?? [],
      },
      update: () => {
        observed.push(game.gamepad.isDown('A'));
        frame += 1;
      },
    });
    game.start();
    scheduler.tick(0);
    scheduler.tick(16);
    expect(observed).toEqual([false, true]);
    game.destroy();
  });

  it('keyboard option object configures the underlying target', () => {
    const target = new EventTarget();
    const game = createGame({
      state: { x: 0, y: 0, score: 0 },
      actions,
      scheduler,
      keyboard: { target },
      pointer: false,
    });
    const event = new KeyboardEvent('keydown', { key: 'a' });
    target.dispatchEvent(event);
    expect(game.keyboard.isDown('a')).toBe(true);
    game.destroy();
  });
});
