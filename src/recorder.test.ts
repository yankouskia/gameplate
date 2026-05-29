import { describe, expect, it, vi } from 'vitest';

import { defineActions } from './actions.js';
import { createGame } from './game.js';
import {
  composeTaps,
  createRecorder,
  RECORDING_VERSION,
  replay,
  truncateRecording,
  type Recording,
} from './recorder.js';

import type { Scheduler } from './loop.js';

interface State {
  x: number;
  y: number;
  score: number;
}

const initial: State = { x: 0, y: 0, score: 0 };

const actions = defineActions<State>()({
  moveBy: (s, dx: number, dy: number) => ({ ...s, x: s.x + dx, y: s.y + dy }),
  addScore: (s, points: number) => ({ ...s, score: s.score + points }),
  reset: () => ({ ...initial }),
});

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

/** Monotonic fake clock — each read advances by 1 ms. Deterministic timestamps. */
function fakeClock(): () => number {
  let t = 0;
  return () => {
    t += 1;
    return t;
  };
}

describe('createRecorder', () => {
  it('tap is a no-op before start()', () => {
    const recorder = createRecorder<State>();
    expect(recorder.isRecording()).toBe(false);
    recorder.tap('moveBy', [1, 2]);
    expect(() => recorder.stop()).toThrow(/start\(\) was never called/);
  });

  it('captures dispatched actions between start and stop', () => {
    const recorder = createRecorder<State>({ now: fakeClock() });
    recorder.start(initial);
    expect(recorder.isRecording()).toBe(true);
    recorder.tap('moveBy', [3, 4]);
    recorder.tap('addScore', [10]);
    const recording = recorder.stop();
    expect(recorder.isRecording()).toBe(false);
    expect(recording.initialState).toEqual(initial);
    expect(recording.events).toHaveLength(2);
    expect(recording.events[0]?.name).toBe('moveBy');
    expect(recording.events[0]?.args).toEqual([3, 4]);
    expect(recording.events[1]?.name).toBe('addScore');
    expect(recording.events[1]?.args).toEqual([10]);
  });

  it('event args are snapshot — later mutation does not leak in', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    const mutableArgs: number[] = [1, 2];
    recorder.tap('moveBy', mutableArgs);
    mutableArgs[0] = 999;
    const recording = recorder.stop();
    expect(recording.events[0]?.args).toEqual([1, 2]);
  });

  it('records ascending timestamps relative to start()', () => {
    const recorder = createRecorder<State>({ now: fakeClock() });
    recorder.start(initial);
    recorder.tap('addScore', [1]);
    recorder.tap('addScore', [2]);
    recorder.tap('addScore', [3]);
    const events = recorder.stop().events;
    expect(events.map((e) => e.t)).toEqual([1, 2, 3]);
  });

  it('start() twice discards the first recording', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [1]);
    recorder.start({ ...initial, score: 50 });
    recorder.tap('addScore', [2]);
    const recording = recorder.stop();
    expect(recording.initialState).toEqual({ ...initial, score: 50 });
    expect(recording.events).toHaveLength(1);
    expect(recording.events[0]?.args).toEqual([2]);
  });

  it('stop() twice returns the same recording reference', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [5]);
    const a = recorder.stop();
    const b = recorder.stop();
    expect(a).toBe(b);
  });

  it('tap after stop() is ignored', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [1]);
    recorder.stop();
    recorder.tap('addScore', [999]);
    expect(recorder.stop().events).toHaveLength(1);
  });

  it('clear() returns the recorder to idle', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [1]);
    recorder.clear();
    expect(recorder.isRecording()).toBe(false);
    expect(() => recorder.stop()).toThrow(/start\(\) was never called/);
  });

  it('recording carries diagnostic metadata', () => {
    const recorder = createRecorder<State>({ now: fakeClock() });
    recorder.start(initial); // now → 1
    recorder.tap('addScore', [1]); // now → 2
    const recording = recorder.stop(); // now → 3
    expect(recording.meta.startedAt).toBe(1);
    expect(recording.meta.endedAt).toBe(3);
    expect(recording.meta.version).toBe(RECORDING_VERSION);
  });

  it('stop() returns a frozen events array', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [1]);
    const recording = recorder.stop();
    expect(Object.isFrozen(recording.events)).toBe(true);
    expect(() => {
      (recording.events as unknown as { push: (e: unknown) => void }).push({
        name: 'x',
        args: [],
        t: 0,
      });
    }).toThrow(TypeError);
  });

  it('clear() after stop() also drops the completed recording', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [1]);
    recorder.stop();
    recorder.clear();
    expect(recorder.isRecording()).toBe(false);
    expect(() => recorder.stop()).toThrow(/start\(\) was never called/);
  });

  it('tap after stop() then start() lands in the new recording', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.stop();
    recorder.start(initial);
    recorder.tap('addScore', [7]);
    const recording = recorder.stop();
    expect(recording.events).toHaveLength(1);
    expect(recording.events[0]?.args).toEqual([7]);
  });

  it('filter excludes matching events', () => {
    const recorder = createRecorder<State>({
      filter: (name) => name !== 'moveBy',
    });
    recorder.start(initial);
    recorder.tap('moveBy', [1, 2]);
    recorder.tap('addScore', [10]);
    recorder.tap('moveBy', [3, 4]);
    const recording = recorder.stop();
    expect(recording.events.map((e) => e.name)).toEqual(['addScore']);
  });

  it('initialState is held by reference — mutation between start and stop leaks in', () => {
    const recorder = createRecorder<State>();
    const mutableInitial: State = { x: 0, y: 0, score: 0 };
    recorder.start(mutableInitial);
    mutableInitial.score = 999;
    const recording = recorder.stop();
    // Pin the contract: the recorder does NOT snapshot initialState.
    expect(recording.initialState.score).toBe(999);
  });
});

describe('replay', () => {
  it('reproduces the final state deterministically', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('moveBy', [3, 4]);
    recorder.tap('addScore', [10]);
    recorder.tap('moveBy', [-1, -2]);
    const final = replay(recorder.stop(), actions);
    expect(final).toEqual({ x: 2, y: 2, score: 10 });
  });

  it('returns initialState when there are no events', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    const empty = recorder.stop();
    expect(replay(empty, actions)).toEqual(initial);
  });

  it('returns initialState when until: 0', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [10]);
    expect(replay(recorder.stop(), actions, { until: 0 })).toEqual(initial);
  });

  it('scrubs to an intermediate point with until', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [1]);
    recorder.tap('addScore', [2]);
    recorder.tap('addScore', [4]);
    const recording = recorder.stop();
    expect(replay(recording, actions, { until: 0 }).score).toBe(0);
    expect(replay(recording, actions, { until: 1 }).score).toBe(1);
    expect(replay(recording, actions, { until: 2 }).score).toBe(3);
    expect(replay(recording, actions, { until: 3 }).score).toBe(7);
  });

  it('clamps until to [0, events.length]', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [10]);
    const recording = recorder.stop();
    expect(replay(recording, actions, { until: -5 })).toEqual(initial);
    expect(replay(recording, actions, { until: 999 })).toEqual({ ...initial, score: 10 });
  });

  it('streams intermediate states through onTick', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [1]);
    recorder.tap('addScore', [10]);
    recorder.tap('addScore', [100]);
    const recording = recorder.stop();
    const scores: number[] = [];
    replay(recording, actions, { onTick: (s) => scores.push(s.score) });
    expect(scores).toEqual([1, 11, 111]);
  });

  it('onTick receives the recorded event and a 0-based contiguous index', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [1]);
    recorder.tap('moveBy', [3, 4]);
    const recording = recorder.stop();
    const calls: [number, string, readonly unknown[], number][] = [];
    replay(recording, actions, {
      onTick: (s, e, i) => calls.push([s.score, e.name, e.args, i]),
    });
    expect(calls).toEqual([
      [1, 'addScore', [1], 0],
      [1, 'moveBy', [3, 4], 1],
    ]);
  });

  it('onTick is not called when events is empty', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    const recording = recorder.stop();
    const onTick = vi.fn();
    replay(recording, actions, { onTick });
    expect(onTick).not.toHaveBeenCalled();
  });

  it('onTick fires exactly `limit` times when until clamps below max', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [1]);
    recorder.tap('addScore', [2]);
    recorder.tap('addScore', [3]);
    const recording = recorder.stop();
    const onTick = vi.fn();
    replay(recording, actions, { until: 2, onTick });
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('onTick fires for all events when until is beyond the end', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('addScore', [1]);
    recorder.tap('addScore', [2]);
    const recording = recorder.stop();
    const onTick = vi.fn();
    replay(recording, actions, { until: 999, onTick });
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('throws on an unknown action name (version mismatch)', () => {
    const recorder = createRecorder<State>();
    recorder.start(initial);
    recorder.tap('teleport', [5, 5]); // not in `actions`
    const recording = recorder.stop();
    expect(() => replay(recording, actions)).toThrow(/teleport/);
  });

  it('dev: true surfaces accidental in-place mutations as TypeError', () => {
    const mutating = defineActions<State>()({
      bad: (s) => {
        // simulate an action that forgot to copy
        (s as { score: number }).score += 1;
        return s;
      },
    });
    const recording: Recording<State> = {
      initialState: { ...initial },
      events: [{ name: 'bad', args: [], t: 0 }],
      meta: { startedAt: 0, endedAt: 0, version: RECORDING_VERSION },
    };
    expect(() => replay(recording, mutating, { dev: true })).toThrow(TypeError);
  });

  it('dev:false (default) lets accidentally-mutating actions still complete', () => {
    const mutating = defineActions<State>()({
      bad: (s) => {
        (s as { score: number }).score += 1;
        return s;
      },
    });
    const recording: Recording<State> = {
      initialState: { ...initial },
      events: [{ name: 'bad', args: [], t: 0 }],
      meta: { startedAt: 0, endedAt: 0, version: RECORDING_VERSION },
    };
    expect(() => replay(recording, mutating)).not.toThrow();
  });

  it('dev:true does NOT freeze the caller`s recording.initialState', () => {
    const recorder = createRecorder<State>();
    const localInitial: State = { x: 0, y: 0, score: 0 };
    recorder.start(localInitial);
    recorder.tap('addScore', [1]);
    const recording = recorder.stop();
    replay(recording, actions, { dev: true });
    expect(Object.isFrozen(localInitial)).toBe(false);
    expect(Object.isFrozen(recording.initialState)).toBe(false);
  });

  it('unknown action error names the event index; previously-applied onTick calls still fired', () => {
    const recording: Recording<State> = {
      initialState: { ...initial },
      events: [
        { name: 'addScore', args: [3], t: 0 },
        { name: 'teleport', args: [], t: 1 },
      ],
      meta: { startedAt: 0, endedAt: 0, version: RECORDING_VERSION },
    };
    const onTick = vi.fn();
    expect(() => replay(recording, actions, { onTick })).toThrow(/teleport.*event 1/);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('Recording has the documented shape (no accidental field drift)', () => {
    const recorder = createRecorder<State>({ now: fakeClock() });
    recorder.start(initial);
    recorder.tap('moveBy', [1, 2]);
    const recording = recorder.stop();
    // JSON round-trip pins the wire shape — `structuredClone` would
    // preserve symbols / frozen flags / etc and miss accidental field drift.
    // eslint-disable-next-line unicorn/prefer-structured-clone
    expect(JSON.parse(JSON.stringify(recording))).toEqual({
      initialState: { x: 0, y: 0, score: 0 },
      events: [{ name: 'moveBy', args: [1, 2], t: 1 }],
      meta: { startedAt: 1, endedAt: 3, version: RECORDING_VERSION },
    });
  });

  it('round-trips through JSON', () => {
    const recorder = createRecorder<State>({ now: fakeClock() });
    recorder.start(initial);
    recorder.tap('moveBy', [1, 2]);
    recorder.tap('addScore', [42]);
    recorder.tap('reset', []);
    const recording = recorder.stop();
    // This test deliberately verifies the JSON round-trip — `structuredClone`
    // would defeat the point (it preserves shapes JSON never could).
    // eslint-disable-next-line unicorn/prefer-structured-clone
    const restored = JSON.parse(JSON.stringify(recording)) as Recording<State>;
    expect(replay(restored, actions)).toEqual(replay(recording, actions));
  });
});

describe('composeTaps', () => {
  it('fans out to every tap in argument order', () => {
    const calls: string[] = [];
    const tap = composeTaps(
      (n) => calls.push(`a:${n}`),
      (n) => calls.push(`b:${n}`),
      (n) => calls.push(`c:${n}`),
    );
    tap('foo', []);
    expect(calls).toEqual(['a:foo', 'b:foo', 'c:foo']);
  });

  it('with no arguments is a no-op', () => {
    expect(() => composeTaps()('any', [])).not.toThrow();
  });
});

function makeTruncateRecording(): Recording<State> {
  const recorder = createRecorder<State>({ now: fakeClock() });
  recorder.start(initial);
  recorder.tap('addScore', [1]);
  recorder.tap('addScore', [2]);
  recorder.tap('addScore', [4]);
  return recorder.stop();
}

describe('truncateRecording', () => {
  it('keeps the first `until` events and shortens the recording', () => {
    const full = makeTruncateRecording();
    const head = truncateRecording(full, 2);
    expect(head.events).toHaveLength(2);
    expect(head.events.map((e) => e.args)).toEqual([[1], [2]]);
  });

  it('clamps `until` into [0, events.length]', () => {
    const full = makeTruncateRecording();
    expect(truncateRecording(full, -5).events).toHaveLength(0);
    expect(truncateRecording(full, 999).events).toHaveLength(full.events.length);
  });

  it('updates endedAt to startedAt + last kept event.t', () => {
    const full = makeTruncateRecording();
    const truncated = truncateRecording(full, 2);
    const last = truncated.events.at(-1);
    expect(last).toBeDefined();
    expect(truncated.meta.endedAt).toBe(truncated.meta.startedAt + (last?.t ?? 0));
  });

  it('does not mutate the input recording', () => {
    const full = makeTruncateRecording();
    const before = full.events.length;
    truncateRecording(full, 1);
    expect(full.events).toHaveLength(before);
  });

  it('produces a recording that replays to the same partial state', () => {
    const full = makeTruncateRecording();
    const head = truncateRecording(full, 2);
    expect(replay(head, actions)).toEqual(replay(full, actions, { until: 2 }));
  });
});

describe('createGame + recorder integration', () => {
  it('tap fires synchronously after setState — the new state is visible', () => {
    let scoreAtTap: number | undefined;
    const game = createGame({
      state: initial,
      actions,
      scheduler: fakeScheduler(),
      keyboard: false,
      pointer: false,
      tap: () => {
        scoreAtTap = game.state().score;
      },
    });
    game.actions.addScore(10);
    expect(scoreAtTap).toBe(10);
  });

  it('re-entrant dispatch from tap is recorded in apply order and replays identically', () => {
    const recorder = createRecorder<State>();
    const game = createGame({
      state: initial,
      actions,
      scheduler: fakeScheduler(),
      keyboard: false,
      pointer: false,
      tap: composeTaps(recorder.tap, (name) => {
        // Re-entrant dispatch: tap for `moveBy` fires `addScore(1)`.
        if (name === 'moveBy') game.actions.addScore(1);
      }),
    });
    recorder.start(game.state());
    game.actions.moveBy(2, 3);
    const recording = recorder.stop();
    // Live: moveBy applies first, then addScore.
    expect(game.state()).toEqual({ x: 2, y: 3, score: 1 });
    // Recorded order MUST match apply order, not dispatch order.
    expect(recording.events.map((e) => e.name)).toEqual(['moveBy', 'addScore']);
    // …so pure replay reproduces the live state.
    expect(replay(recording, actions)).toEqual(game.state());
  });

  it('action that throws synchronously is NOT recorded — replay stays deterministic', () => {
    const throwing = defineActions<State>()({
      addScore: (s, points: number) => ({ ...s, score: s.score + points }),
      boom: () => {
        throw new Error('intentional');
      },
    });
    const recorder = createRecorder<State>();
    const game = createGame({
      state: initial,
      actions: throwing,
      scheduler: fakeScheduler(),
      keyboard: false,
      pointer: false,
      tap: recorder.tap,
    });
    recorder.start(game.state());
    game.actions.addScore(10);
    expect(() => game.actions.boom()).toThrow(/intentional/);
    game.actions.addScore(5);
    const recording = recorder.stop();
    // `boom` never reached `tap` because `setState` threw first.
    expect(recording.events.map((e) => e.name)).toEqual(['addScore', 'addScore']);
    expect(replay(recording, throwing)).toEqual(game.state());
  });

  it('tap receives the action key and the dispatched args', () => {
    const tap = vi.fn();
    const game = createGame({
      state: initial,
      actions,
      scheduler: fakeScheduler(),
      keyboard: false,
      pointer: false,
      tap,
    });
    game.actions.moveBy(3, 4);
    game.actions.addScore(7);
    expect(tap).toHaveBeenNthCalledWith(1, 'moveBy', [3, 4]);
    expect(tap).toHaveBeenNthCalledWith(2, 'addScore', [7]);
  });

  it('end-to-end: record gameplay then replay → identical final state', () => {
    const recorder = createRecorder<State>({ now: fakeClock() });
    const game = createGame({
      state: initial,
      actions,
      scheduler: fakeScheduler(),
      keyboard: false,
      pointer: false,
      tap: recorder.tap,
    });
    recorder.start(game.state());
    game.actions.moveBy(2, 3);
    game.actions.addScore(50);
    game.actions.moveBy(-1, 0);
    game.actions.addScore(25);
    const recording = recorder.stop();
    expect(replay(recording, actions)).toEqual(game.state());
  });

  it('also captures actions dispatched from inside update()', () => {
    const recorder = createRecorder<State>({ now: fakeClock() });
    const scheduler = fakeScheduler();
    const game = createGame({
      state: initial,
      actions,
      scheduler,
      keyboard: false,
      pointer: false,
      tap: recorder.tap,
      update: (_s, _dt, d) => {
        d.addScore(1);
      },
    });
    recorder.start(game.state());
    game.start();
    scheduler.tick(0);
    scheduler.tick(16);
    scheduler.tick(16);
    game.stop();
    const recording = recorder.stop();
    expect(recording.events).toHaveLength(3);
    expect(replay(recording, actions).score).toBe(3);
  });

  it('with no tap, createGame still dispatches normally', () => {
    const game = createGame({
      state: initial,
      actions,
      scheduler: fakeScheduler(),
      keyboard: false,
      pointer: false,
    });
    game.actions.addScore(5);
    expect(game.state().score).toBe(5);
  });
});
