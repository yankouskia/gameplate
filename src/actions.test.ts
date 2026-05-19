import { describe, expect, expectTypeOf, it } from 'vitest';

import { type Dispatch, defineActions } from './actions.js';

interface State {
  x: number;
  y: number;
  tags: readonly string[];
}

describe('defineActions', () => {
  it('returns the same action map back (identity)', () => {
    const actions = defineActions<State>()({
      move: (s, dx: number, dy: number) => ({ ...s, x: s.x + dx, y: s.y + dy }),
    });
    expect(actions.move({ x: 0, y: 0, tags: [] }, 1, 2)).toEqual({
      x: 1,
      y: 2,
      tags: [],
    });
  });

  it('infers a Dispatch type that strips the state arg', () => {
    const _actions = defineActions<State>()({
      move: (s, dx: number, dy: number) => ({ ...s, x: s.x + dx, y: s.y + dy }),
      tag: (s, name: string) => ({ ...s, tags: [...s.tags, name] }),
      reset: (s) => ({ ...s, x: 0, y: 0 }),
    });

    type D = Dispatch<typeof _actions>;
    expectTypeOf<D['move']>().toEqualTypeOf<(dx: number, dy: number) => void>();
    expectTypeOf<D['tag']>().toEqualTypeOf<(name: string) => void>();
    expectTypeOf<D['reset']>().toEqualTypeOf<() => void>();
  });
});
