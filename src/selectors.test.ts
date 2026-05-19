import { describe, expect, it, vi } from 'vitest';

import { createSelector } from './selectors.js';

interface State {
  player: { x: number; y: number };
  enemies: readonly { id: number; visible: boolean }[];
}

const baseState: State = {
  player: { x: 0, y: 0 },
  enemies: [
    { id: 1, visible: true },
    { id: 2, visible: false },
  ],
};

describe('createSelector', () => {
  it('single-input selector returns the combiner result', () => {
    const visible = createSelector(
      (s: State) => s.enemies,
      (enemies) => enemies.filter((e) => e.visible),
    );
    expect(visible(baseState)).toHaveLength(1);
  });

  it('memoizes when inputs are reference-equal', () => {
    const combiner = vi.fn((enemies: State['enemies']) => enemies.filter((e) => e.visible));
    const sel = createSelector((s: State) => s.enemies, combiner);
    const a = sel(baseState);
    const b = sel(baseState);
    expect(a).toBe(b);
    expect(combiner).toHaveBeenCalledOnce();
  });

  it('re-runs when an input changes by reference', () => {
    const combiner = vi.fn((enemies: State['enemies']) => enemies.length);
    const sel = createSelector((s: State) => s.enemies, combiner);
    sel(baseState);
    const next: State = { ...baseState, enemies: [...baseState.enemies, { id: 3, visible: true }] };
    sel(next);
    expect(combiner).toHaveBeenCalledTimes(2);
  });

  it('supports a tuple of inputs', () => {
    const combiner = vi.fn((player: State['player'], enemies: State['enemies']) =>
      enemies.map((e) => Math.hypot(e.id - player.x, e.id - player.y)),
    );
    const sel = createSelector(
      [(s: State) => s.player, (s: State) => s.enemies] as const,
      combiner,
    );
    expect(sel(baseState)).toHaveLength(2);
    sel(baseState);
    expect(combiner).toHaveBeenCalledOnce();
  });

  it('Object.is-compares inputs (NaN equality works)', () => {
    const combiner = vi.fn((value: number) => value * 2);
    const sel = createSelector((s: { v: number }) => s.v, combiner);
    sel({ v: Number.NaN });
    sel({ v: Number.NaN });
    expect(combiner).toHaveBeenCalledOnce();
  });
});
