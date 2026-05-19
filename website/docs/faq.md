---
id: faq
title: FAQ
sidebar_position: 100
---

# FAQ ❓

## Is `gameplate` production-ready?

Yes. v2 is a complete rewrite with:

- **≥ 90 %** test coverage, type-level tests included.
- **CI matrix** across Node 20 / 22 / 24 × Ubuntu / macOS / Windows.
- **CodeQL** security analysis on every PR.
- **npm provenance** on every release.
- **Bundle size** enforced (&lt; 4 KB gzipped ESM).

That said, v2.0.0 is fresh — please [open an issue](https://github.com/yankouskia/gameplate/issues)
if you find anything off.

## Can I use it without TypeScript?

Yes. The published package is JavaScript with `.d.ts` types alongside. Plain Node and plain
`<script type="module">` work. TypeScript is just where the framework shines brightest.

## Does it work in Bun / Deno / Web Workers?

Yes. Anywhere with a working `globalThis` and either `requestAnimationFrame` or `setTimeout`,
`gameplate` runs. The auto-picked `defaultScheduler()` handles the choice for you.

## Where's the renderer?

There isn't one — by design. See [Why gameplate?](./getting-started/why-gameplate.md).

Pick whichever you like:

- **Canvas 2D** — built into browsers, simplest.
- **WebGL** — direct, fast, fiddly.
- **PIXI.js** — high-level 2D, great for sprites.
- **Three.js** — 3D.
- **DOM** — sometimes the right answer (HTML drag-drop games).

`gameplate` doesn't care. Your `render(state, alpha)` callback receives state — what you do
with it is up to you.

## Why not Redux + React Three Fiber + XState?

You could absolutely build a game that way. It'll work. It'll also:

- Ship ~80 KB of dependencies before you write a line of game code.
- Push your state into a tree designed for UI, not for 60 Hz mutation.
- Lock you into React's render model (great for UI, awkward for games).

`gameplate` is the answer for "I want game-shaped state with TypeScript guarantees and nothing
else." If you also want a UI framework, drop `gameplate` _next to_ React — that's how the HUD
example works.

## How do I add audio?

There's no audio module (yet). Use the
[Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) directly, or a
small library like [Howler.js](https://howlerjs.com/). Trigger from action hooks, `onEnter`
scene hooks, or in your `update` based on state diffs:

```ts
const prevHp = useRef(0);
game.subscribe((next) => {
  if (next.player.hp < prevHp.current) audio.play('hit');
  prevHp.current = next.player.hp;
});
```

## How do I add networking?

Same answer: bring your favorite WebSocket / WebRTC library and dispatch actions on incoming
messages. See the [headless multiplayer example](./examples/headless.md).

A future `@gameplate/network` package may ship deterministic state-sync helpers — not yet.
Watch [Issues](https://github.com/yankouskia/gameplate/issues) for the roadmap.

## I'm getting a "missing types" error in my project

Check your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // or "node16" / "nodenext"
    "module": "esnext", // or "node16" / "nodenext"
    "target": "es2022"
  }
}
```

`gameplate` ships modern dual ESM/CJS types via the `exports` map. The legacy `"node"`
resolver doesn't understand `exports` — bump it.

## Can I contribute?

Please. Start with [`CONTRIBUTING.md`](https://github.com/yankouskia/gameplate/blob/master/CONTRIBUTING.md);
or [open an issue](https://github.com/yankouskia/gameplate/issues) describing what you'd like
to add. Bug fixes, examples, docs improvements, and renderer demos all welcome.

## How do I sponsor?

[github.com/sponsors/yankouskia](https://github.com/sponsors/yankouskia). Thank you. ❤️
