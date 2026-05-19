import { describe, expect, it } from 'vitest';

import { deepFreeze } from './freeze.js';

describe('deepFreeze', () => {
  it('returns primitives unchanged', () => {
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze('hi')).toBe('hi');
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(true)).toBe(true);
  });

  it('freezes nested objects and arrays', () => {
    const obj = { a: { b: [{ c: 1 }] } };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(obj.a)).toBe(true);
    expect(Object.isFrozen(obj.a.b)).toBe(true);
    expect(Object.isFrozen(obj.a.b[0])).toBe(true);
  });

  it('tolerates cycles', () => {
    interface Node {
      name: string;
      next?: Node;
    }
    const a: Node = { name: 'a' };
    const b: Node = { name: 'b' };
    a.next = b;
    b.next = a;
    expect(() => deepFreeze(a)).not.toThrow();
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(b)).toBe(true);
  });

  it('returns already-frozen objects untouched', () => {
    const frozen = Object.freeze({ a: 1 });
    expect(deepFreeze(frozen)).toBe(frozen);
  });
});
