---
id: recording
title: Recording & Replay
sidebar_position: 8
---

# Recording & Replay 🎬

Record every action a player dispatches. Replay it later — deterministically,
in milliseconds, anywhere. Same recording, same final state. **Always.**

Powerful for:

- **Bug repro.** Ship a JSON recording with the bug report.
- **Regression tests.** Record a playthrough once; CI asserts the same final
  state on every run.
- **Server-authoritative validation.** Replay a client's recording on the
  server to detect impossible inputs.
- **Time-travel debugging.** Scrub to event _N_ and inspect the state then.

It works because `gameplate` already routes every mutation through a typed
action. Capture the actions + the starting state — and you have a perfect,
deterministic transcript of the session.

## The 30-second tour

```ts
import { createGame, createRecorder, defineActions, replay } from 'gameplate';

type State = { score: number; combo: number };

const actions = defineActions<State>()({
  hit: (s, points: number) => ({ score: s.score + points, combo: s.combo + 1 }),
  miss: (s) => ({ score: s.score, combo: 0 }),
});

// 1. Build a recorder for this state type.
const recorder = createRecorder<State>();

// 2. Wire it into the game via the new `tap` field.
const game = createGame({
  state: { score: 0, combo: 0 },
  actions,
  tap: recorder.tap, // 👈 this is the whole integration
});

// 3. Capture some gameplay.
recorder.start(game.state());
game.actions.hit(100);
game.actions.hit(150);
game.actions.miss();
game.actions.hit(50);
const recording = recorder.stop();

// 4. Replay deterministically — pure, fast, zero side effects.
replay(recording, actions);
// → { score: 300, combo: 1 }
```

## What's in a `Recording`

A recording is plain data — `JSON.stringify`-able and human-readable:

```jsonc
{
  "initialState": { "score": 0, "combo": 0 },
  "events": [
    { "name": "hit",  "args": [100], "t": 0 },
    { "name": "hit",  "args": [150], "t": 18 },
    { "name": "miss", "args": [],    "t": 31 },
    { "name": "hit",  "args": [50],  "t": 47 },
  ],
  "meta": { "startedAt": 1721823600000, "endedAt": 1721823600047, "version": 1 },
}
```

- **`initialState`** — what `game.state()` was the moment you called
  `recorder.start()`.
- **`events`** — every action dispatched while recording, in order, each with
  the args you passed and a millisecond offset from `start()`.
- **`meta`** — wall-clock bookends and a format version. Ignored by `replay`;
  safe to omit when you re-import.

Because the shape is just data, you can persist it anywhere:

```ts
await fetch('/api/bug-reports', {
  method: 'POST',
  body: JSON.stringify({ recording, browser: navigator.userAgent }),
});
```

## Time-travel debugging

The `until` option scrubs to any point in the recording. Pair it with `onTick`
to build a full state history (a DevTools-style scrubber):

```ts
// Final state.
replay(recording, actions);

// State right after event index 1.
replay(recording, actions, { until: 2 });

// Every intermediate state, in order.
const history: State[] = [recording.initialState];
replay(recording, actions, { onTick: (state) => history.push(state) });
// history[0] = initial, history[1] = after first action, …, history[N] = final
```

`until` is clamped to `[0, events.length]`, so passing `0` returns the initial
state and any value beyond the end gives the final state.

## Regression tests in three lines

```ts
import recording from './fixtures/level-1-clear.json' assert { type: 'json' };

it('a clean run of level 1 still scores 4,250', () => {
  expect(replay(recording, actions).score).toBe(4250);
});
```

That's it. The recording is the test fixture; `replay` is the assertion. If
you change an action's behaviour, the test breaks — exactly when you'd want it
to.

## Server-authoritative replay

The same recording, run on the server with the canonical action map, tells you
whether the client's claimed final state is reachable:

```ts
import express from 'express';
import { replay } from 'gameplate';
import { actions } from './shared/actions.js';

app.post('/api/submit-run', (req, res) => {
  const { recording, claimedScore } = req.body;
  const final = replay(recording, actions);
  if (final.score !== claimedScore) {
    return res.status(400).json({ error: 'inconsistent' });
  }
  res.json({ ok: true });
});
```

Because actions are pure functions of state + args, the server doesn't need to
trust the client — it computes the truth from scratch.

## Composing taps and filtering events

Most games want the recorder *and* a logger *and* analytics on the same
dispatch — `composeTaps` fans one tap out to many, so the documented
`tap: recorder.tap` stays a one-liner:

```ts
import { composeTaps, createRecorder } from 'gameplate';

const recorder = createRecorder<State>();
const game = createGame({
  ...,
  tap: composeTaps(
    recorder.tap,
    (name, args) => console.debug(name, args),
    sendToAnalytics,
  ),
});
```

High-frequency actions (60 Hz pointer pulses, idle ticks) or sensitive ones
(chat, PII) can be dropped at the source with `RecorderOptions.filter`:

```ts
const recorder = createRecorder<State>({
  filter: (name) => name !== 'pointerMove' && !name.startsWith('chat'),
});
```

## Shrinking a recording to its minimal reproducer

Found the failing event with `replay(rec, actions, { until: N })`? Snip the
recording with `truncateRecording` and ship the smallest possible fixture:

```ts
import { truncateRecording } from 'gameplate';

// Bisect to the smallest failing N, then hand off:
const minimal = truncateRecording(recording, failingEventIndex + 1);
await writeFile('repro.json', JSON.stringify(minimal));
```

## Version skew

`recording.meta.version` is stamped from `RECORDING_VERSION`, exported from
the package so you can gate on schema compatibility when loading old fixtures:

```ts
import { RECORDING_VERSION, replay } from 'gameplate';

function loadRecording(blob: string) {
  const rec = JSON.parse(blob) as Recording<State>;
  if (rec.meta.version !== RECORDING_VERSION) {
    throw new Error(`recording v${rec.meta.version} is older than this build (v${RECORDING_VERSION})`);
  }
  return rec;
}
```

## API surface

```ts
createRecorder<S>(options?: {
  now?: () => number;
  filter?: (name: string, args: readonly unknown[]) => boolean;
}): Recorder<S>
```

Build a recorder. Pass `recorder.tap` to `createGame({ tap })`. The recorder
is dormant until you call `start()`. Inject a custom `now` for deterministic
tests; pass `filter` to drop events at the source.

```ts
recorder.start(initialState: S): void
recorder.stop(): Recording<S>
recorder.clear(): void
recorder.isRecording(): boolean
```

- `start()` begins a fresh recording. Calling it again **discards** the
  in-progress one — call `stop()` first to keep it.
- `stop()` finalises and returns the recording. Subsequent calls return the
  same value until the next `start()`.
- `clear()` returns the recorder to the idle state.

```ts
replay<S>(recording, actions, options?: {
  until?: number;
  onTick?: (state: S, event: RecordedEvent, index: number) => void;
  dev?: boolean;
}): S
```

Pure. Returns the state at event `until` (default: all events) as
`DeepReadonly<S>`. Throws if a referenced action is missing from the provided
map — but **lazily**, at the event index that needs it: a `{ until: N }` that
stops before the unknown event will still succeed. `dev: true` deep-freezes
every intermediate state (and structured-clones the initial state first, so
the freeze never escapes into your recording) — accidental in-place mutations
surface as `TypeError`s.

```ts
composeTaps(...taps: ActionTap[]): ActionTap
truncateRecording<S>(recording: Recording<S>, until: number): Recording<S>
RECORDING_VERSION: number
```

`composeTaps` fans a single `tap` slot out to many. `truncateRecording`
returns a fresh recording with the first `until` events (and a corrected
`meta.endedAt`). `RECORDING_VERSION` is the schema version this build stamps
into new recordings — compare against `recording.meta.version` to detect
skew.

## Limitations & sharp edges

- **Actions only.** Direct `store.setState` calls bypass the recorder. So does
  any state change driven by `update` or `fixedUpdate` that doesn't go through
  the action dispatcher. Stick to actions and you're fine.
- **Order-based, not time-based.** `replay` advances event-by-event in array
  order; `event.t` is metadata for your tooling (timeline UIs, scrubbers),
  not used for scheduling. If you want a live "watch it back" with timing,
  you'd dispatch the events yourself with a `setTimeout` per `event.t`.
- **`event.t` is wall-clock, not loop time.** Timestamps come from the
  recorder's clock (`now`, default `Date.now`), not the game loop's
  simulation time. An event recorded during a long-running frame still
  carries the wall-clock offset.
- **JSON-serialisable args.** Recordings round-trip cleanly only if the
  arguments do. Pass primitives (number, string, boolean) and plain objects;
  avoid `Map`, `Set`, `Date`, class instances, or DOM nodes.
- **No input replay.** The recorder captures the **actions** you dispatched,
  not the keyboard/pointer events that triggered them. Replay re-derives the
  final state purely; if you want a "live re-watch" with the loop running,
  feed the recorded events back through `game.actions.<name>(...args)` on a
  fresh game.
- **Version skew.** If you rename an action between recording and replay,
  `replay` throws with the offending name. Bump `meta.version` in your own
  shared module if you start shipping recordings between releases.

## Related

- [State & Actions](./state-and-actions.md) — why actions are the right unit
  to record.
- [Headless](./headless.md) — running the simulation on Node makes
  server-authoritative replay one import away.
