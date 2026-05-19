---
id: installation
title: Installation
sidebar_position: 1
---

# Installation

`gameplate` ships dual ESM + CJS with TypeScript definitions. Pick your package manager:

```bash
# npm
npm install gameplate

# pnpm  (recommended)
pnpm add gameplate

# yarn
yarn add gameplate

# bun
bun add gameplate
```

## Requirements

|                  |                                                      |
| :--------------- | :--------------------------------------------------- |
| **Node**         | ≥ 20.10 (LTS)                                        |
| **TypeScript**   | ≥ 5.0 (works without TS too, but it's most fun with) |
| **Browsers**     | Last 2 evergreen, Safari 16+, iOS 16+                |
| **Runtime deps** | **None.** Zero. Nada. Zilch.                         |

## Verifying

After installing, run this in a fresh `.ts` file:

```ts
import { createGame, defineActions } from 'gameplate';

const actions = defineActions<{ n: number }>()({
  inc: (s) => ({ n: s.n + 1 }),
});

const game = createGame({
  state: { n: 0 },
  actions,
  update: () => game.actions.inc(),
});

game.start();
setTimeout(() => {
  game.stop();
  console.log('counted to', game.state().n, 'frames');
}, 1000);
```

If you see `counted to <some-number> frames`, you're good. Onward to the [quickstart](./quickstart.md). 🚀

## Module resolution

`gameplate` uses the `exports` field for spec-correct dual publishing:

```json
{
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    }
  }
}
```

If you're seeing `"Cannot find module 'gameplate' or its corresponding type declarations"`:

- Make sure your `tsconfig.json` has `"moduleResolution": "bundler"` (or `"node16"` / `"nodenext"`).
- If you're on `"node"` (the legacy resolver), bump it — `gameplate` ships modern types.
