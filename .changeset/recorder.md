---
'gameplate': minor
---

Add `createRecorder` + `replay` — deterministic record-and-replay of action
sequences. Combined with a new `tap` field on `createGame`, you can capture
every dispatched action into a JSON-serialisable `Recording` and re-derive
any state moment with a pure `replay(recording, actions)` call.

Unlocks bug repro (ship the JSON, replay in a test), regression tests
(record gameplay once, assert state on every CI run), server-authoritative
validation (replay the client's recording on Node to detect impossible
inputs), and time-travel debugging (`replay(recording, actions, { until: N })`
scrubs to event _N_).

Zero new dependencies, ~0.4 KB brotli. The library still ships under 4 KB.
