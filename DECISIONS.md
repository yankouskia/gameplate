# Architecture Decision Records

Lightweight ADRs for `gameplate` v2. Each entry: context, decision, alternatives, consequences.

---

## ADR-001 — Pivot from boilerplate to library

**Context.** v1 was a clone-and-go webpack boilerplate, not a published library. Its
`package.json` `main` pointed at executable browser code; `npm install gameplate`
would have shipped an entry that nobody could meaningfully `import`. Modern starters
solve the boilerplate problem (Vite templates, `create-*` CLIs, GitHub Templates).

**Decision.** Rewrite as a published, importable TypeScript library: a tiny headless
game framework (state store + loop + input + scenes). Same name, same intent ("simple
game tooling"), totally different shape.

**Alternatives.**

1. Stay a boilerplate, modernize stack to Vite + PIXI v8. *Rejected:* duplicates
   `create-vite` and a hundred PIXI starters.
2. Build a typed Redux-for-games (just store + actions). *Rejected:* too narrow to
   justify a new package.

**Consequences.** Fresh API design needed. Old PIXI/sprite demo code is deleted.
v1 was never on npm, so no consumer migration required.

---

## ADR-002 — Zero runtime dependencies

**Context.** v1 pulled in `lodash`, `pixi.js`, and `redux`. None are required to
build the abstractions we want.

**Decision.** Runtime dependencies stay at **zero**. The framework relies only on
the JS/DOM platform (`requestAnimationFrame`, `KeyboardEvent`, `PointerEvent`,
`performance.now`).

**Alternatives.** Take a dependency on `nanoevents` or `mitt` for the emitter.
*Rejected:* the emitter is ~30 LOC inline; not worth a dep + version surface.

**Consequences.** Tiny bundle, no transitive supply-chain risk, no `peerDependencies`
to manage. Tradeoff: we re-implement an event emitter and a memoization helper.

---

## ADR-003 — TypeScript-first; dual ESM + CJS publish

**Context.** Modern bundlers prefer ESM but a large fraction of Node tooling still
loads CJS. Type-only consumers expect bundler-friendly `.d.ts`.

**Decision.** Source is TypeScript ESM; ship dual ESM + CJS + `.d.ts` + `.d.cts` via
`tsup`. `exports` map drives resolution; validated by `@arethetypeswrong/cli` and
`publint` in CI.

**Alternatives.** ESM-only. *Rejected for now:* the brief asks for "no broken
consumers"; CJS support is cheap with `tsup`.

**Consequences.** Build step is mandatory; `tsc --noEmit` runs separately as the
typecheck.

---

## ADR-004 — pnpm as the package manager

**Context.** v1 had a `yarn.lock`. pnpm offers stricter dependency hygiene, faster
installs, and is the de-facto choice for new TS libraries in 2026.

**Decision.** pnpm 9.x, pinned via the `packageManager` field. CI uses corepack.

**Consequences.** Contributors need pnpm; `pnpm install` is the documented setup.

---

## ADR-005 — ESLint v9 flat config + typescript-eslint v8

**Context.** Both Biome and ESLint+Prettier are viable in 2026. The brief asks me
to evaluate and document.

**Decision.** ESLint v9 flat + Prettier. Reasons: (1) typescript-eslint v8 has
type-aware rules Biome still lacks; (2) the broader plugin ecosystem (`unicorn`,
`import-x`, `n`) is mature and covers Node-specific lints we want.

**Alternatives.** Biome. *Considered:* one tool, fast, no plugins. *Rejected for
this library:* we want type-aware lints (`no-floating-promises`, `no-misused-promises`)
that are central to async correctness.

**Consequences.** Two configs (`eslint.config.js` + `.prettierrc`). Slightly slower
lint than Biome would be — acceptable on a small codebase.

---

## ADR-006 — `defineActions<S>()(...)` curried-generic for action inference

**Context.** Consumers want to write `actions.move(5, 0)` with full IntelliSense.
That requires inferring action arg types from the action map *while* fixing the
state type `S`. Single-call generic inference can't do both.

**Decision.** Two-call form: `defineActions<S>()(actionMap)`. First call locks `S`;
second call infers each action's arg signature. The returned dispatch type strips
the first (state) parameter.

**Alternatives.**

1. `createGame<S>({ state, actions })` and let the user annotate each action's `s`
   parameter. *Rejected:* boilerplate every consumer hits.
2. Class-based store with method-as-action. *Rejected:* methods don't play nicely
   with structural typing and inference for `this`-less callbacks.

**Consequences.** Slightly unusual `()()` call shape, documented prominently in
the README with a "why" callout.

---

## ADR-007 — Fixed timestep with interpolation

**Context.** A naive `requestAnimationFrame` loop produces nondeterministic physics
(framerate-dependent integration). Fixed-timestep with interpolated render is the
standard solution ("Fix Your Timestep!", Glenn Fiedler).

**Decision.** Default loop is variable-step (simple). Opt-in `fixedStep: 1/60`
config enables a fixed-timestep accumulator with `alpha` passed to the render
callback for interpolation.

**Alternatives.** Always fixed. *Rejected:* most casual game code doesn't need
determinism; making the simple case complex is a worse default.

**Consequences.** Two execution modes documented; example shows when to pick which.

---

## ADR-008 — DeepReadonly state at the type level

**Context.** Action handlers must return new state, not mutate. We want the
compiler to prevent `s.player.x = 10` inside an action.

**Decision.** The `state` parameter passed into actions is typed as
`DeepReadonly<S>`. Mutations are compile-errors.

**Consequences.** Some consumer ergonomics impact (have to spread). Documented as
a feature with an example. We do *not* freeze at runtime by default (cost in hot
paths); a `dev: true` option enables runtime `Object.freeze`.

---

## ADR-009 — Changesets for release management

**Context.** Manual `npm publish` doesn't scale, drifts changelogs, forgets
provenance.

**Decision.** Adopt `@changesets/cli`. PRs require a changeset; merging the
"Version Packages" PR publishes via the release workflow with npm provenance.

**Alternatives.** `semantic-release`. *Considered:* parses commit messages. Cleaner
UX with conventional commits but less explicit per-PR; team feedback in the wider
ecosystem has pushed toward changesets for libraries.

---

## ADR-010 — Why we keep the name `gameplate`

**Context.** The library is no longer a "boilerplate."

**Decision.** Keep `gameplate`. It evokes "game" + "plate" (template/foundation)
without literally meaning boilerplate; the name is short, memorable, available on
npm, and consistent with the repo URL/history.

**Alternatives.** Rename to `@gameplate/core`. *Deferred to v3* if/when we split
into multiple packages.
