---
'gameplate': minor
---

Add `createGamepad` — the third pillar of the input layer (keyboard ✓,
pointer ✓, **gamepad ✓**). Polls the platform Gamepad API on the same shape
as `createKeyboard` / `createPointer`, with built-in goodies:

- Per-frame edge detection: `wasPressed('A')`, `wasReleased('B')`.
- Analog button reads (triggers): `value('LT')` returns `0..1`.
- W3C **Standard Gamepad** name lookups (Xbox-naming, position-mapped):
  `isDown('A')`, `axis('LeftX')`, `stick('left')`.
- **Radial** deadzone for sticks (magnitude is gated and rescaled) plus a
  per-axis deadzone for triggers. Configurable; default `0.1`.
- Multi-pad support via optional `padIndex` on every reader.

`createGame({ gamepad })` accepts a `boolean` or a `GamepadOptions` object and
**auto-polls** gamepad at the top of every `update` tick — `game.gamepad.isDown('A')`
inside your update hook reads fresh state, no boilerplate. Headless-safe (every
reader returns `false` / `0` / `[]` when no platform `getGamepads` is reachable),
and trivially mockable in tests via the `getGamepads` option.

Zero new dependencies; bundle still under the 4 KB cap.
