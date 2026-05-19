/**
 * Recursively `Object.freeze` an object graph. Cycles are tolerated via a
 * WeakSet. Primitives, frozen objects, and functions are returned as-is.
 *
 * Used only when `dev: true` is passed to {@link createGame} — it adds runtime
 * cost so we skip it in production.
 *
 * @internal
 */
export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value;
  const object = value as unknown as object;
  if (Object.isFrozen(object) || seen.has(object)) return value;
  seen.add(object);
  for (const key of Reflect.ownKeys(object)) {
    const child: unknown = (object as Record<PropertyKey, unknown>)[key as string];
    if (child !== null && typeof child === 'object') deepFreeze(child, seen);
  }
  Object.freeze(object);
  return value;
}
