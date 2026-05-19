import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import LiveDemo from '@site/src/components/LiveDemo';
import WebGLStack from '@site/src/components/WebGLStack';

import styles from './index.module.css';

const QUICKSTART = `import { createGame, defineActions } from 'gameplate';

type State = { x: number; y: number; score: number };

const actions = defineActions<State>()({
  moveBy:   (s, dx: number, dy: number) => ({ ...s, x: s.x + dx, y: s.y + dy }),
  addScore: (s, points: number)         => ({ ...s, score: s.score + points }),
});

const game = createGame({
  state: { x: 0, y: 0, score: 0 },
  actions,
  update: (state, dt, actions) => {
    if (game.keyboard.isDown('ArrowRight')) actions.moveBy(200 * dt, 0);
    if (game.keyboard.isDown('ArrowLeft'))  actions.moveBy(-200 * dt, 0);
  },
  render: (state) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(state.x, state.y, 20, 20);
  },
});

game.start();
`;

function HomepageHero(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden />
      <div className={clsx('container', styles.heroInner)}>
        <span className="gp-pill">v2 · zero-dependency · ~3 KB gzipped</span>
        <h1 className={styles.heroTitle}>
          The <span className="gp-gradient-text">tiny&nbsp;TypeScript</span> framework
          <br />
          for browser <em>and</em> headless games.
        </h1>
        <p className={styles.heroSub}>{siteConfig.tagline}</p>

        <div className={styles.ctas}>
          <Link
            className={clsx('button button--primary button--lg', styles.ctaPrimary)}
            to="/docs/getting-started/quickstart"
          >
            Get started →
          </Link>
          <Link
            className={clsx('button button--secondary button--lg', styles.ctaSecondary)}
            to="/docs/api"
          >
            API reference
          </Link>
          <Link
            className={clsx('button button--outline button--lg', styles.ctaGhost)}
            href="https://github.com/yankouskia/gameplate"
          >
            ⭐ Star on GitHub
          </Link>
        </div>

        <div className={styles.installRow}>
          <code className={styles.install}>npm install gameplate</code>
          <code className={styles.install}>pnpm add gameplate</code>
          <code className={styles.install}>yarn add gameplate</code>
          <code className={styles.install}>bun add gameplate</code>
        </div>
      </div>
    </header>
  );
}

function HomepageQuickstart(): ReactNode {
  return (
    <section className={styles.quickstart}>
      <div className="container">
        <div className="row">
          <div className={clsx('col col--5', styles.qsCopy)}>
            <h2>A game in 30 lines.</h2>
            <p>
              Typed state, deterministic loop, normalized input, scene FSM, memoized selectors — all
              batteries included, all tree-shakeable, all <strong>renderer-agnostic</strong>.
            </p>
            <ul className={styles.qsList}>
              <li>✅ Strict TypeScript inference — never type your state twice.</li>
              <li>✅ Variable timestep by default, fixed-step on opt-in.</li>
              <li>✅ Runs in the browser, Node, Bun, Deno, Web Workers.</li>
              <li>
                ✅ Zero runtime dependencies. <strong>Forever.</strong>
              </li>
            </ul>
            <Link className="button button--primary" to="/docs/getting-started/quickstart">
              Read the quickstart →
            </Link>
          </div>
          <div className="col col--7">
            <CodeBlock language="ts" title="game.ts" showLineNumbers>
              {QUICKSTART}
            </CodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomepageCompare(): ReactNode {
  return (
    <section className={styles.compare}>
      <div className="container">
        <h2 className={styles.compareTitle}>
          You don't need <span className="gp-gradient-text">another engine</span>.
          <br />
          You need the <span className="gp-gradient-text">glue</span>.
        </h2>
        <div className="row">
          <div className="col col--4">
            <div className="gp-card">
              <h3>vs. PIXI / Three / Phaser</h3>
              <p>
                Those are <strong>renderers</strong> (or full engines). <code>gameplate</code> is
                the <strong>glue</strong> between your game logic and any of them — bring whichever
                renderer you love.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className="gp-card">
              <h3>vs. XState</h3>
              <p>
                XState is great for arbitrary statecharts. <code>gameplate</code>'s FSM is small
                (~150 LOC), purpose-built for game scenes, and ships with the rest of the framework.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className="gp-card">
              <h3>vs. rolling your own</h3>
              <p>
                You will. Eventually. <code>gameplate</code> is what your fifth from-scratch loop
                wants to become — typed, tested, headless-ready.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Tiny, fully-typed game framework for TypeScript"
      description={siteConfig.tagline}
    >
      <HomepageHero />
      <main>
        <LiveDemo />
        <HomepageFeatures />
        <HomepageQuickstart />
        <WebGLStack />
        <HomepageCompare />
      </main>
    </Layout>
  );
}
