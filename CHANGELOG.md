# gameplate

## 2.0.1

### Patch Changes

- Slim the published package and harden type-resolution validation.
  - **Drop source maps from `dist/`.** The original `src/` is not part of the
    published package, so the `.js.map` / `.cjs.map` files could never resolve
    to real sources anyway. Removing them cuts the published tarball from
    ~50 KB to ~24 KB (and the unpacked size by more than half).
  - **Fix "Are the Types Wrong?" validation.** The `attw` CLI crashes on any
    package whose tarball exceeds ~32 KB (an upstream `fflate` streaming bug).
    Package validation now runs through a small wrapper around
    `@arethetypeswrong/core`, so dual ESM/CJS type resolution is verified on
    every supported Node version — no behavioural change to the library itself.

## 2.0.0

### Major Changes

- Initial published release. A complete rewrite as a tiny, zero-dependency,
  fully-typed TypeScript framework for browser & headless games.

  Public API: `createGame`, `defineActions`, `createStore`, `createLoop`,
  `createMachine`, `createSelector`, `createKeyboard`, `createPointer` —
  plus the `browserScheduler` / `nodeScheduler` / `defaultScheduler` loop
  primitives.

  v1 (2019) was an unpublished webpack + PixiJS + Redux boilerplate and had
  no importable API, so there is no upgrade path — v2 is a fresh start under
  the same name.
