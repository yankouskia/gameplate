# Contributing to gameplate

Thanks for your interest! gameplate is small and aims to stay that way, so a
few rules keep contributions easy to land.

## Quick start

```sh
# 1. Clone & install
git clone https://github.com/yankouskia/gameplate.git
cd gameplate
corepack enable && pnpm install

# 2. Confirm everything works
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

> We use **pnpm** (pinned via `packageManager`). `npm install` or
> `yarn install` will produce a different lockfile and may break in CI.

## Day-to-day commands

| Command              | What it does                                      |
| -------------------- | ------------------------------------------------- |
| `pnpm dev`           | tsup watch mode (rebuilds on save)                |
| `pnpm test:watch`    | Vitest watch mode                                 |
| `pnpm test:coverage` | Run tests + emit coverage (fails below 90% lines) |
| `pnpm lint:fix`      | Auto-fix lint issues where possible               |
| `pnpm format`        | Run Prettier on the whole tree                    |
| `pnpm docs:serve`    | Build & preview the TypeDoc site locally          |
| `pnpm size`          | Report bundle sizes against the size-limit budget |

## Project layout

```
src/
├── index.ts            Public barrel — only the public API leaves this file
├── game.ts             createGame facade
├── store.ts            createStore + Store type
├── actions.ts          defineActions + Dispatch machinery
├── loop.ts             createLoop + schedulers
├── scenes.ts           createMachine FSM
├── selectors.ts        createSelector memoization
├── input/
│   ├── keyboard.ts
│   └── pointer.ts
├── emitter.ts          Internal — typed event emitter
├── freeze.ts           Internal — deepFreeze helper
└── types.ts            Shared public types
```

## How to make changes

1. **Branch:** `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
2. **Code:** add or modify code with TSDoc on every exported symbol.
3. **Test:** every exported function gets tests covering the happy path,
   error paths, and edge cases. Coverage threshold is 90% lines; the test
   step fails below it.
4. **Lint:** `pnpm lint` must be clean — zero warnings, zero errors.
5. **Changeset:** if your change is user-visible, run `pnpm changeset` and
   commit the generated file. Pick a bump:
   - **patch** — bug fix, doc update, internal refactor
   - **minor** — new feature, additive API change
   - **major** — breaking change (also update `BREAKING_CHANGES.md`)
6. **Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/)
   — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`, `build:`,
   `perf:`, `deps:`.

## Pull request checklist

- [ ] `pnpm typecheck` — clean
- [ ] `pnpm lint` — clean
- [ ] `pnpm test:coverage` — passes thresholds
- [ ] `pnpm build` — succeeds
- [ ] TSDoc on every new public symbol
- [ ] README updated if user-facing behavior changed
- [ ] Changeset added (user-visible change)

## Design principles

These are the four rules we apply when proposing new APIs:

1. **Easy to start, hard to misuse.** The 10-line quickstart must keep
   working forever. Defaults should match the 80% case.
2. **Zero runtime deps.** Adding a dep is a last resort, never a first.
3. **Renderer-agnostic.** Nothing in core should know about PIXI, Canvas2D,
   Three, the DOM, etc. Bring-your-own renderer is the whole point.
4. **Types are documentation.** If a generic, conditional type, or overload
   makes IntelliSense better, prefer it over runtime checks.

## Reporting bugs / requesting features

Use the [issue templates](https://github.com/yankouskia/gameplate/issues/new/choose).
Security issues go through the
[private advisory flow](https://github.com/yankouskia/gameplate/security/advisories/new).

## Code of Conduct

By participating, you agree to abide by the [Contributor Covenant](./CODE_OF_CONDUCT.md).
