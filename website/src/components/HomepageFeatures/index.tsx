import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

interface Feature {
  title: string;
  icon: string;
  description: ReactNode;
}

const FEATURES: Feature[] = [
  {
    icon: '🪶',
    title: 'Tiny — ~3 KB gzipped',
    description: (
      <>
        Smaller than a single sprite sheet. Side-effect free and fully tree-shakeable, so only what
        you import lands in your bundle.
      </>
    ),
  },
  {
    icon: '🦺',
    title: 'TypeScript-first, strict',
    description: (
      <>
        Source is TS with <code>strict: true</code> + every <code>noUnchecked*</code> flag.
        Inference does the work — no <code>as any</code>, ever.
      </>
    ),
  },
  {
    icon: '🎯',
    title: 'Renderer-agnostic',
    description: (
      <>
        Canvas 2D, WebGL, PIXI, Three.js, DOM, SVG, terminal — <code>gameplate</code> doesn't care.
        Bring whichever renderer you love.
      </>
    ),
  },
  {
    icon: '⏱️',
    title: 'Deterministic loop',
    description: (
      <>
        Variable timestep by default; opt into a fixed-step accumulator with interpolation when
        physics needs to be reproducible.
      </>
    ),
  },
  {
    icon: '🎮',
    title: 'First-class input',
    description: (
      <>
        Normalized keyboard + pointer with target-relative coordinates. Headless? The Node build
        no-ops cleanly — same API, zero crashes.
      </>
    ),
  },
  {
    icon: '🎬',
    title: 'Scene FSM built-in',
    description: (
      <>
        Compile-time-checked finite state machine for menus, modes, and lifecycles. Send an event
        that doesn't exist — TypeScript stops you.
      </>
    ),
  },
  {
    icon: '🧠',
    title: 'Memoized selectors',
    description: (
      <>
        Reselect-style derived state in &lt;30 LOC. Never recompute the visible-enemies list twice
        in the same frame.
      </>
    ),
  },
  {
    icon: '🖥️',
    title: 'Browser AND Node',
    description: (
      <>
        Same code, two runtimes. Headless simulation, server-authoritative play, CI snapshot tests —
        all just work.
      </>
    ),
  },
  {
    icon: '📦',
    title: 'Dual ESM + CJS',
    description: (
      <>
        ESM-first source, dual ESM/CJS publish. <code>publint</code> +{' '}
        <code>@arethetypeswrong/cli</code> clean. Provenance signed.
      </>
    ),
  },
];

function FeatureCard({ icon, title, description }: Feature): ReactNode {
  return (
    <div className={clsx('col col--4', styles.featureCol)}>
      <div className={clsx('gp-card', styles.feature)}>
        <div className={styles.featureIcon} aria-hidden>
          {icon}
        </div>
        <h3 className={styles.featureTitle}>{title}</h3>
        <p className={styles.featureBody}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <h2 className={styles.sectionTitle}>
          Everything you need. <span className="gp-gradient-text">Nothing you don't.</span>
        </h2>
        <div className="row">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
