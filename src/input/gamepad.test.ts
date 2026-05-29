import { describe, expect, it, vi } from 'vitest';

import { createGamepad, type Gamepad, type NativeGamepad, type StandardButton } from './gamepad.js';

/** Build a fake gamepad. `buttons` are bools (digital) unless `analog` is set. */
function fakePad(args: {
  buttons?: readonly (boolean | number)[];
  axes?: readonly number[];
  id?: string;
  index?: number;
  connected?: boolean;
}): NativeGamepad {
  return {
    id: args.id ?? 'fake',
    index: args.index ?? 0,
    connected: args.connected ?? true,
    buttons: (args.buttons ?? []).map((b) =>
      typeof b === 'number' ? { pressed: b > 0, value: b } : { pressed: b, value: b ? 1 : 0 },
    ),
    axes: args.axes ?? [],
  };
}

/** Drive a gamepad via a swappable script of snapshots. */
function harness(script: readonly (readonly (NativeGamepad | null)[])[]): {
  readonly gp: Gamepad;
  readonly advance: () => void;
} {
  let frame = 0;
  const gp = createGamepad({
    getGamepads: () => script[frame] ?? [],
  });
  return {
    gp,
    advance: () => {
      gp.poll();
      frame += 1;
    },
  };
}

describe('createGamepad', () => {
  it('returns false / 0 / empty before any poll', () => {
    const gp = createGamepad({ getGamepads: () => [] });
    expect(gp.isDown('A')).toBe(false);
    expect(gp.value('A')).toBe(0);
    expect(gp.axis('LeftX')).toBe(0);
    expect(gp.stick('left')).toEqual({ x: 0, y: 0 });
    expect(gp.count()).toBe(0);
    expect(gp.connected()).toBe(false);
    expect(gp.pads()).toEqual([]);
  });

  it('reads button state after poll', () => {
    const { gp, advance } = harness([[fakePad({ buttons: [true, false] })]]);
    advance();
    expect(gp.isDown('A')).toBe(true);
    expect(gp.isDown('B')).toBe(false);
  });

  it('Standard button names map to W3C standard indices', () => {
    const buttons = Array.from<boolean>({ length: 17 }).fill(false);
    const expected: readonly StandardButton[] = [
      'A',
      'B',
      'X',
      'Y',
      'LB',
      'RB',
      'LT',
      'RT',
      'Back',
      'Start',
      'LS',
      'RS',
      'Up',
      'Down',
      'Left',
      'Right',
      'Home',
    ];
    for (const [index, name] of expected.entries()) {
      const localButtons = [...buttons];
      localButtons[index] = true;
      const { gp, advance } = harness([[fakePad({ buttons: localButtons })]]);
      advance();
      expect(gp.isDown(name)).toBe(true);
      expect(gp.isDown(index)).toBe(true);
    }
  });

  it('axis name lookups match standard indices', () => {
    const axes = [0.5, -0.5, 0.25, -0.25];
    const { gp, advance } = harness([[fakePad({ axes })]]);
    advance();
    expect(gp.axis('LeftX')).toBe(0.5);
    expect(gp.axis('LeftY')).toBe(-0.5);
    expect(gp.axis('RightX')).toBe(0.25);
    expect(gp.axis('RightY')).toBe(-0.25);
    expect(gp.axis(0)).toBe(0.5);
  });

  it('wasPressed is true only on the false→true edge', () => {
    const { gp, advance } = harness([
      [fakePad({ buttons: [false] })],
      [fakePad({ buttons: [true] })],
      [fakePad({ buttons: [true] })],
      [fakePad({ buttons: [false] })],
    ]);
    advance();
    expect(gp.wasPressed('A')).toBe(false);
    advance();
    expect(gp.wasPressed('A')).toBe(true);
    advance();
    expect(gp.wasPressed('A')).toBe(false);
    advance();
    expect(gp.wasPressed('A')).toBe(false);
  });

  it('wasReleased is true only on the true→false edge', () => {
    const { gp, advance } = harness([
      [fakePad({ buttons: [true] })],
      [fakePad({ buttons: [true] })],
      [fakePad({ buttons: [false] })],
      [fakePad({ buttons: [false] })],
    ]);
    advance();
    expect(gp.wasReleased('A')).toBe(false);
    advance();
    expect(gp.wasReleased('A')).toBe(false);
    advance();
    expect(gp.wasReleased('A')).toBe(true);
    advance();
    expect(gp.wasReleased('A')).toBe(false);
  });

  it('value returns analog button level (e.g. trigger)', () => {
    const { gp, advance } = harness([
      // LT (index 6) at 0.42; A at 1
      [fakePad({ buttons: [true, false, false, false, false, false, 0.42] })],
    ]);
    advance();
    expect(gp.value('LT')).toBe(0.42);
    expect(gp.value('A')).toBe(1);
    expect(gp.value('B')).toBe(0);
  });

  it('axis applies the per-axis deadzone', () => {
    const { gp, advance } = harness([[fakePad({ axes: [0.05, 0.3, -0.05, -0.3] })]]);
    advance();
    // default deadzone 0.1: |0.05| < 0.1 → 0
    expect(gp.axis('LeftX')).toBe(0);
    expect(gp.axis('LeftY')).toBe(0.3);
    expect(gp.axis('RightX')).toBe(0);
    expect(gp.axis('RightY')).toBe(-0.3);
  });

  it('custom deadzone:0 reads raw axis values', () => {
    let frame = 0;
    const script = [[fakePad({ axes: [0.05, 0, 0, 0] })]];
    const gp = createGamepad({
      deadzone: 0,
      getGamepads: () => script[frame] ?? [],
    });
    gp.poll();
    frame += 1;
    expect(gp.axis('LeftX')).toBe(0.05);
  });

  it('stick applies a radial deadzone — within deadzone is (0, 0)', () => {
    const { gp, advance } = harness([[fakePad({ axes: [0.06, 0.06, 0, 0] })]]);
    advance();
    // magnitude sqrt(0.06^2 + 0.06^2) ≈ 0.085 < 0.1 → zeroed
    expect(gp.stick('left')).toEqual({ x: 0, y: 0 });
  });

  it('stick magnitude is rescaled past the deadzone (saturates at 1)', () => {
    const { gp, advance } = harness([[fakePad({ axes: [1, 0, 0, 0] })]]);
    advance();
    const { x, y } = gp.stick('left');
    expect(x).toBeCloseTo(1, 6);
    expect(y).toBe(0);
  });

  it('stick("right") reads axes 2 and 3', () => {
    const { gp, advance } = harness([[fakePad({ axes: [0, 0, 1, 0] })]]);
    advance();
    expect(gp.stick('right').x).toBeCloseTo(1, 6);
    expect(gp.stick('left')).toEqual({ x: 0, y: 0 });
  });

  it('selects a specific pad via padIndex', () => {
    const { gp, advance } = harness([
      [fakePad({ buttons: [false], index: 0 }), fakePad({ buttons: [true], index: 1 })],
    ]);
    advance();
    expect(gp.isDown('A', 0)).toBe(false);
    expect(gp.isDown('A', 1)).toBe(true);
  });

  it('null entries appear as disconnected slot stubs', () => {
    const { gp, advance } = harness([[null, fakePad({ buttons: [true], index: 1 })]]);
    advance();
    const pads = gp.pads();
    expect(pads).toHaveLength(2);
    expect(pads[0]?.connected).toBe(false);
    expect(pads[0]?.buttons).toEqual([]);
    expect(pads[1]?.connected).toBe(true);
    expect(gp.isDown('A', 0)).toBe(false);
    expect(gp.isDown('A', 1)).toBe(true);
  });

  it('count() and connected() reflect only `connected: true` pads', () => {
    const { gp, advance } = harness([
      [null, fakePad({ index: 1 }), fakePad({ index: 2, connected: false })],
    ]);
    advance();
    expect(gp.count()).toBe(1);
    expect(gp.connected()).toBe(true);
  });

  it('connected() returns false when no pads are present', () => {
    const { gp, advance } = harness([[]]);
    advance();
    expect(gp.connected()).toBe(false);
    expect(gp.count()).toBe(0);
  });

  it('unknown padIndex is safe — returns defaults, never throws', () => {
    const { gp, advance } = harness([[fakePad({ buttons: [true] })]]);
    advance();
    expect(gp.isDown('A', 7)).toBe(false);
    expect(gp.axis('LeftX', 7)).toBe(0);
    expect(gp.value('A', 7)).toBe(0);
    expect(gp.stick('left', 7)).toEqual({ x: 0, y: 0 });
  });

  it('default getGamepads (no navigator stub) is safe in a stripped env', () => {
    const gp = createGamepad();
    // happy-dom may or may not expose navigator.getGamepads — either way,
    // poll must not throw, and counts/reads must come back sane.
    expect(() => {
      gp.poll();
    }).not.toThrow();
    expect(gp.connected()).toBe(false);
  });

  it('destroy() clears state and stops polling — idempotent', () => {
    const { gp, advance } = harness([
      [fakePad({ buttons: [true] })],
      [fakePad({ buttons: [true] })],
    ]);
    advance();
    expect(gp.isDown('A')).toBe(true);
    gp.destroy();
    gp.destroy();
    // poll() is a no-op after destroy — held state is wiped.
    advance();
    expect(gp.isDown('A')).toBe(false);
    expect(gp.connected()).toBe(false);
  });

  it('stick() clamps diagonals to magnitude ≤ 1 (Standard axes are per-axis [-1, 1])', () => {
    const { gp, advance } = harness([[fakePad({ axes: [1, 1, 0, 0] })]]);
    advance();
    const { x, y } = gp.stick('left');
    expect(Math.hypot(x, y)).toBeLessThanOrEqual(1 + 1e-9);
    // Direction preserved: equal components on a 45° push.
    expect(x).toBeCloseTo(y, 6);
  });

  it('stick() saturates at magnitude 1 even for out-of-spec inputs', () => {
    const { gp, advance } = harness([[fakePad({ axes: [2, 0, 0, 0] })]]);
    advance();
    expect(gp.stick('left').x).toBeCloseTo(1, 6);
  });

  it('stick() returns (0, 0) at the origin even when deadzone is 0 (no NaN)', () => {
    let polled = false;
    const gp = createGamepad({
      deadzone: 0,
      getGamepads: () => (polled ? [] : [fakePad({ axes: [0, 0, 0, 0] })]),
    });
    gp.poll();
    polled = true;
    expect(gp.stick('left')).toEqual({ x: 0, y: 0 });
  });

  it('radial deadzone differs from per-axis: (0.09, 0.09) zeros axes but lights up stick', () => {
    const { gp, advance } = harness([[fakePad({ axes: [0.09, 0.09, 0, 0] })]]);
    advance();
    expect(gp.axis('LeftX')).toBe(0);
    expect(gp.axis('LeftY')).toBe(0);
    const { x, y } = gp.stick('left');
    // sqrt(0.0162) ≈ 0.127 > 0.1 → non-zero, equal components on the diagonal.
    expect(x).toBeGreaterThan(0);
    expect(x).toBeCloseTo(y, 6);
  });

  it('first poll with a held button: wasPressed fires (no previous frame to compare to)', () => {
    const { gp, advance } = harness([[fakePad({ buttons: [true] })]]);
    advance();
    expect(gp.wasPressed('A')).toBe(true);
  });

  it('snapshotPad copies — mutating the source NativeGamepad after poll() does not leak', () => {
    const sharedButtons: { pressed: boolean; value: number }[] = [{ pressed: true, value: 1 }];
    const sharedAxes: number[] = [0.5];
    const sharedPad: NativeGamepad = {
      id: 'mut',
      index: 0,
      connected: true,
      buttons: sharedButtons,
      axes: sharedAxes,
    };
    const gp = createGamepad({ getGamepads: () => [sharedPad] });
    gp.poll();
    sharedButtons[0]!.pressed = false;
    sharedAxes[0] = 0;
    expect(gp.isDown('A')).toBe(true);
    expect(gp.axis('LeftX', 0)).toBe(0.5);
  });
});

describe('createGamepad — connect / disconnect', () => {
  it('onConnect fires on the first poll for already-connected pads', () => {
    const handler = vi.fn();
    const gp = createGamepad({
      getGamepads: () => [fakePad({ buttons: [false], index: 0 })],
    });
    gp.onConnect(handler);
    gp.poll();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ index: 0, connected: true });
  });

  it('onConnect does not fire again on subsequent polls of the same pad', () => {
    const handler = vi.fn();
    const { gp, advance } = harness([
      [fakePad({ buttons: [false] })],
      [fakePad({ buttons: [true] })],
      [fakePad({ buttons: [true] })],
    ]);
    gp.onConnect(handler);
    advance();
    advance();
    advance();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('onDisconnect fires when a connected pad drops to null', () => {
    const handler = vi.fn();
    const { gp, advance } = harness([[fakePad({ buttons: [true] })], [null]]);
    gp.onDisconnect(handler);
    advance();
    advance();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ index: 0 });
  });

  it('unsubscribers remove the handler', () => {
    const handler = vi.fn();
    const { gp, advance } = harness([
      [fakePad({ buttons: [false], index: 0 })],
      [fakePad({ buttons: [false], index: 0 }), fakePad({ buttons: [false], index: 1 })],
    ]);
    const off = gp.onConnect(handler);
    advance();
    off();
    advance();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('destroy() clears connect/disconnect handlers', () => {
    const onConn = vi.fn();
    const onDisc = vi.fn();
    const { gp, advance } = harness([[fakePad({ buttons: [false] })], [null]]);
    gp.onConnect(onConn);
    gp.onDisconnect(onDisc);
    gp.destroy();
    advance();
    advance();
    expect(onConn).not.toHaveBeenCalled();
    expect(onDisc).not.toHaveBeenCalled();
  });
});

describe('createGamepad — exported name maps', () => {
  it('STANDARD_BUTTONS and STANDARD_AXES are frozen and exhaustive', async () => {
    const mod = await import('./gamepad.js');
    expect(Object.isFrozen(mod.STANDARD_BUTTONS)).toBe(true);
    expect(Object.isFrozen(mod.STANDARD_AXES)).toBe(true);
    expect(mod.STANDARD_BUTTONS.A).toBe(0);
    expect(mod.STANDARD_BUTTONS.Home).toBe(16);
    expect(mod.STANDARD_AXES.LeftX).toBe(0);
    expect(mod.STANDARD_AXES.RightY).toBe(3);
  });
});

describe('createGamepad + getGamepads error', () => {
  it('a throwing getGamepads degrades to empty — never kills the game loop', () => {
    const gp = createGamepad({
      getGamepads: () => {
        throw new Error('mocked');
      },
    });
    expect(() => {
      gp.poll();
    }).not.toThrow();
    expect(gp.connected()).toBe(false);
    expect(gp.count()).toBe(0);
    expect(gp.isDown('A')).toBe(false);
    expect(gp.stick('left')).toEqual({ x: 0, y: 0 });
  });

  it('survives a getGamepads that toggles between empty and populated', () => {
    let n = 0;
    const gp = createGamepad({
      getGamepads: () => {
        n += 1;
        return n % 2 === 0 ? [fakePad({ buttons: [true] })] : [];
      },
    });
    gp.poll();
    expect(gp.connected()).toBe(false);
    gp.poll();
    expect(gp.connected()).toBe(true);
    expect(gp.wasPressed('A')).toBe(true);
    gp.poll();
    expect(gp.connected()).toBe(false);
    expect(gp.wasReleased('A')).toBe(true);
  });

  it('getGamepads is called exactly once per poll', () => {
    const get = vi.fn(() => [fakePad({ buttons: [true] })]);
    const gp = createGamepad({ getGamepads: get });
    gp.poll();
    gp.poll();
    gp.poll();
    expect(get).toHaveBeenCalledTimes(3);
  });
});
