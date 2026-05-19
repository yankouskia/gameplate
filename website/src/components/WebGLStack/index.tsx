import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

interface RendererCard {
  name: string;
  blurb: string;
  href: string;
  icon: string;
  color: string;
  badge?: string;
}

const RENDERERS: RendererCard[] = [
  {
    name: 'Three.js',
    blurb: 'The de-facto 3D library for the web. Hand state to a Scene, let three render.',
    href: '/docs/guides/webgl#threejs',
    icon: '◉',
    color: '#049ef4',
    badge: '3D',
  },
  {
    name: 'PIXI.js v8',
    blurb: 'Blazing-fast 2D sprite rendering, WebGPU-first. The friendliest WebGL out there.',
    href: '/docs/guides/webgl#pixijs',
    icon: '◆',
    color: '#e0228d',
    badge: '2D · WebGPU',
  },
  {
    name: 'regl',
    blurb: 'Functional WebGL. Pure & stateless — pairs beautifully with gameplate state.',
    href: '/docs/guides/webgl#regl',
    icon: '⬡',
    color: '#16a34a',
    badge: 'WebGL',
  },
  {
    name: 'OGL',
    blurb: 'Tiny, minimal WebGL2 framework. ~10 KB and full featured.',
    href: '/docs/guides/webgl#ogl',
    icon: '◬',
    color: '#facc15',
    badge: 'WebGL2',
  },
  {
    name: 'WebGPU (raw)',
    blurb: 'Next-gen GPU API. Bring your own pipeline — gameplate stays out of the way.',
    href: '/docs/guides/webgl#webgpu',
    icon: '⬢',
    color: '#a78bfa',
    badge: '2026 native',
  },
  {
    name: 'Canvas 2D',
    blurb: "When you don't need a GPU. Same gameplate code, different render fn.",
    href: '/docs/guides/webgl#canvas-2d',
    icon: '□',
    color: '#ff5277',
    badge: 'fallback',
  },
];

export default function WebGLStack(): ReactNode {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <span className="gp-pill">renderer-agnostic · WebGL · WebGPU · Canvas · DOM</span>
          <h2 className={styles.title}>
            Drop into <span className="gp-gradient-text">any rendering stack</span>.
          </h2>
          <p className={styles.subtitle}>
            <strong>gameplate</strong> never owns your render loop's pixels. Pass a{' '}
            <code>render(state, alpha)</code> callback to <code>createGame</code> — inside, use
            whichever renderer fits your project today. Swap it for a different one tomorrow.
          </p>
        </div>

        <div className="row">
          {RENDERERS.map((r) => (
            <div key={r.name} className={clsx('col col--4', styles.col)}>
              <Link to={r.href} className={clsx('gp-card', styles.card)}>
                <div className={styles.iconRow}>
                  <span className={styles.icon} style={{ color: r.color }} aria-hidden>
                    {r.icon}
                  </span>
                  {r.badge ? <span className={styles.badge}>{r.badge}</span> : null}
                </div>
                <h3 className={styles.cardTitle}>{r.name}</h3>
                <p className={styles.cardBody}>{r.blurb}</p>
                <span className={styles.cta}>See pattern →</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
