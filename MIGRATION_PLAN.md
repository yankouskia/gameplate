# Migration Plan — `gameplate` v1 → v2

## What this package does (new mission)

`gameplate` is a tiny, zero-dependency, fully-typed TypeScript framework for building
games in the browser or in Node. It gives you a typed state store, a deterministic
game loop (variable or fixed timestep), a normalized input layer (keyboard, pointer,
gamepad-ready), a finite-state scene manager, and memoized selectors — all in roughly
3 KB gzipped. It is **renderer-agnostic**: bring your own Canvas2D, WebGL, PIXI,
Three.js, DOM, or terminal renderer.

The original v1 (2019) was a webpack + PixiJS + Redux + lodash boilerplate
demonstrating a clickable smiley sprite. v2 is a complete rewrite as a published
library focused on developer experience and type safety.

## Current state snapshot (pre-modernization)

| Aspect        | v1 (2019)                                            |
| ------------- | ---------------------------------------------------- |
| Language      | JavaScript ES2017, Babel-transpiled                  |
| Module system | CJS source (`"main": "src/index.js"`)                |
| Node target   | unspecified (`engines` missing)                      |
| Source files  | 6 JS files, ~80 LOC, browser-only PIXI demo          |
| Runtime deps  | `lodash@4`, `pixi.js@4`, `redux@4`                   |
| Dev deps      | webpack 4, ESLint 5, babel-eslint, airbnb config     |
| Tests         | none (zero tests, zero coverage)                     |
| Lint          | ESLint 5 + airbnb (legacy `.eslintrc` JSON)          |
| Build         | webpack 4 bundling browser app                       |
| CI            | none                                                 |
| Docs          | 35-line README pointing at PIXI/redux/webpack/atom   |
| Release       | manual `npm publish` (never executed — not on npm)   |
| TypeScript    | not used                                             |
| Public API    | none — the package's `main` was an executable script |

## Target state (v2)

| Aspect         | v2 (2026)                                                  |
| -------------- | ---------------------------------------------------------- |
| Language       | TypeScript 5.x, `strict: true` + every strict-related flag |
| Module system  | Dual ESM + CJS via `exports` map, ESM-first source         |
| Node target    | `>=20.10` (Node 20 LTS, 22 LTS, 24 current)                |
| Browser target | last 2 evergreen, Safari last 2, iOS last 2                |
| Source         | TypeScript, strict, zero `any`                             |
| Runtime deps   | **zero**                                                   |
| Dev deps       | vitest, tsup, eslint v9 flat, prettier, typedoc, ...       |
| Tests          | Vitest, ≥90% line coverage, type-level tests               |
| Lint           | ESLint v9 flat + typescript-eslint v8 + unicorn + n        |
| Build          | tsup → dual ESM/CJS + d.ts + source maps + d.ts.map        |
| CI             | matrix (Node 20/22/24 × ubuntu/macos/windows) + release    |
| Docs           | rewritten README + generated TypeDoc site on GH Pages      |
| Release        | Changesets + npm provenance + OIDC trusted publishing      |
| Package mgr    | pnpm (pinned via `packageManager` + corepack)              |
| Validation     | `publint` + `@arethetypeswrong/cli` pass clean             |

## Phase plan

| Phase | Theme                                              | Status |
| ----- | -------------------------------------------------- | ------ |
| 0     | Reconnaissance + this plan                         | ☑      |
| 1     | Foundation: TS, package.json, tsconfig, lockfile   | ☐      |
| 2     | Dependencies (re-pick from zero — runtime is zero) | ☐      |
| 3     | Code: typed store, loop, input, scenes, selectors  | ☐      |
| 4     | Tooling: ESLint flat, Prettier, tsup, git hooks    | ☐      |
| 5     | Testing: Vitest unit + type tests + benchmarks     | ☐      |
| 6     | CI: ci.yml, release.yml, codeql.yml, docs.yml      | ☐      |
| 7     | Docs: README rewrite + TypeDoc site                | ☐      |
| 8     | Examples directory                                 | ☐      |
| 9     | Verification + smoke tests                         | ☐      |

## Risk register

| Risk                                                                        | Likelihood | Mitigation                                                                                                                |
| --------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Package name conflict on npm**                                            | Low        | `gameplate` is _not_ currently published (verified via `npm view`). Name is free. First publish will claim it.            |
| **Breaking change for v1 consumers**                                        | None       | v1 had no public API — it was a boilerplate to clone, not a library to import. There are no installed-from-npm consumers. |
| **`@arethetypeswrong/cli` flagging dual-publish issues**                    | Medium     | Build with `tsup` which generates spec-correct exports; validate in CI on every PR.                                       |
| **Game loop timing tests being flaky on CI**                                | Medium     | Use a fake-clock abstraction; never depend on real `requestAnimationFrame` in tests.                                      |
| **Browser-only globals (`window`, `document`) breaking Node consumers**     | High       | Lazy DOM access; all DOM-touching modules guard with `typeof window !== 'undefined'`; export a `createHeadlessGame` path. |
| **`unhandledrejection` listeners leaking between tests**                    | Medium     | Each test gets a fresh game instance; teardown helpers in test setup.                                                     |
| **Action argument inference regressing under future TS versions**           | Low        | Pin TS in CI matrix; add `expectTypeOf` type-level tests that fail loudly on inference breakage.                          |
| **Old git history contains commits under `aleksandr.yankovskiy@gmail.com`** | None       | Author identity stays consistent (same person, current email); no history rewrite needed.                                 |
| **No published baseline for performance regression detection**              | Accepted   | Establish baseline with first release; benchmark suite runs but doesn't gate CI until a baseline exists.                  |

## Public API surface (target)

```ts
// Core
export function createGame<S, A>(config: GameConfig<S, A>): Game<S, A>;
export function defineActions<S>(): <A>(actions: A) => A;

// State machine
export function createMachine<S extends string, E extends string>(
  config: MachineConfig<S, E>
): Machine<S, E>;

// Selectors
export function createSelector<S, R>(...): Selector<S, R>;

// Loop primitives (advanced)
export function createLoop(opts: LoopOptions): Loop;

// Input primitives (advanced)
export function createKeyboard(target?: EventTarget): Keyboard;
export function createPointer(target?: EventTarget): Pointer;

// Types
export type { Game, GameConfig, Action, Dispatch, Selector, Machine, ... };
```

## Deferred / explicit non-goals (v2)

- **Renderer.** v2 is renderer-agnostic on purpose. No PIXI/Three/Canvas wrappers.
- **Networking.** No multiplayer/netcode in v2. Could land in v3 as `@gameplate/net`.
- **ECS.** A full entity-component-system is out of scope. Keep the core small.
- **Asset loading.** Out of scope; consumers use Vite/their bundler.

## Living checklist

This file is updated as phases complete. Final summary lands at the bottom of this file
once Phase 9 verification passes.
