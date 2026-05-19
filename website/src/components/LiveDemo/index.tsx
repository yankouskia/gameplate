import { useEffect, useRef, useState, type ReactNode } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import clsx from 'clsx';
import styles from './styles.module.css';

interface Particle {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly life: number;
  readonly hue: number;
  readonly size: number;
}

interface GameState {
  readonly player: {
    readonly x: number;
    readonly y: number;
    readonly vx: number;
    readonly vy: number;
  };
  readonly particles: readonly Particle[];
  readonly score: number;
  readonly thrust: boolean;
  readonly width: number;
  readonly height: number;
}

function DemoCanvas(): ReactNode {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hint, setHint] = useState<string>('↑ thrust · ← → steer · click anywhere');
  const [fps, setFps] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(true);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 360 });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const measure = (): void => {
      const rect = wrapper.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(280, Math.floor(Math.min(420, rect.width * 0.46)));
      setSize({ w, h });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    // Dynamic import keeps the demo strictly client-side and avoids any SSR
    // resolution of the linked `gameplate` workspace package.
    void import('gameplate').then(({ createGame, defineActions }) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const W = size.w;
      const H = size.h;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      const initial: GameState = {
        player: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
        particles: [],
        score: 0,
        thrust: false,
        width: W,
        height: H,
      };

      const actions = defineActions<GameState>()({
        physics: (s, dt: number): GameState => {
          let { x, y, vx, vy } = s.player;
          vy += 200 * dt;
          if (s.thrust) {
            vy -= 600 * dt;
          }
          x += vx * dt;
          y += vy * dt;
          if (x < 14) {
            x = 14;
            vx = Math.abs(vx) * 0.6;
          }
          if (x > s.width - 14) {
            x = s.width - 14;
            vx = -Math.abs(vx) * 0.6;
          }
          if (y < 14) {
            y = 14;
            vy = Math.abs(vy) * 0.6;
          }
          if (y > s.height - 14) {
            y = s.height - 14;
            vy = -Math.abs(vy) * 0.6;
          }

          const next: Particle[] = [];
          for (const p of s.particles) {
            const life = p.life - dt;
            if (life <= 0) continue;
            next.push({
              x: p.x + p.vx * dt,
              y: p.y + p.vy * dt,
              vx: p.vx * 0.985,
              vy: p.vy * 0.985 + 60 * dt,
              life,
              hue: p.hue,
              size: p.size,
            });
          }
          return { ...s, player: { x, y, vx, vy }, particles: next };
        },
        steer: (s, dx: number): GameState => ({
          ...s,
          player: { ...s.player, vx: Math.max(-280, Math.min(280, s.player.vx + dx)) },
        }),
        setThrust: (s, on: boolean): GameState => ({ ...s, thrust: on }),
        emit: (s, count: number): GameState => {
          const fresh: Particle[] = [];
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 140;
            fresh.push({
              x: s.player.x,
              y: s.player.y + 4,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 40,
              life: 0.6 + Math.random() * 0.8,
              hue: 280 + Math.random() * 80,
              size: 1 + Math.random() * 2.5,
            });
          }
          return {
            ...s,
            particles: [...s.particles, ...fresh].slice(-1200),
            score: s.score + count,
          };
        },
        burst: (s, x: number, y: number): GameState => {
          const fresh: Particle[] = [];
          for (let i = 0; i < 90; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 280;
            fresh.push({
              x,
              y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 0.5 + Math.random() * 1.1,
              hue: 320 + Math.random() * 60,
              size: 1 + Math.random() * 3,
            });
          }
          return { ...s, particles: [...s.particles, ...fresh].slice(-1500) };
        },
        resize: (s, w: number, h: number): GameState => ({ ...s, width: w, height: h }),
      });

      const game = createGame({
        state: initial,
        actions,
        fixedStep: 1 / 90,
        fixedUpdate: (state, dt, actions) => {
          actions.physics(dt);
          if (state.thrust && Math.random() < 0.85) actions.emit(2);
        },
        render: (state) => {
          const w = state.width;
          const h = state.height;
          // gradient background
          const bg = ctx.createLinearGradient(0, 0, 0, h);
          bg.addColorStop(0, '#0b0a14');
          bg.addColorStop(1, '#16112e');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);

          // ambient grid
          ctx.globalAlpha = 0.06;
          ctx.strokeStyle = '#a78bfa';
          ctx.lineWidth = 1;
          for (let gx = 0; gx < w; gx += 32) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, h);
            ctx.stroke();
          }
          for (let gy = 0; gy < h; gy += 32) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;

          // particles with additive blend
          const prevComp = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = 'lighter';
          for (const p of state.particles) {
            const a = Math.min(1, p.life);
            ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalCompositeOperation = prevComp;

          // player ship — gradient diamond
          const px = state.player.x;
          const py = state.player.y;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(state.player.vx * 0.005);
          const g = ctx.createLinearGradient(-12, -12, 12, 12);
          g.addColorStop(0, '#a78bfa');
          g.addColorStop(0.5, '#ff5277');
          g.addColorStop(1, '#f8b400');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(10, 8);
          ctx.lineTo(0, 4);
          ctx.lineTo(-10, 8);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // HUD
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillText(`particles: ${state.particles.length.toString().padStart(4, ' ')}`, 12, 22);
          ctx.fillText(`score:     ${state.score.toString().padStart(4, ' ')}`, 12, 38);
        },
      });

      const keyHandlers: Array<() => void> = [];
      keyHandlers.push(game.keyboard.onDown('ArrowUp', () => game.actions.setThrust(true)));
      keyHandlers.push(game.keyboard.onUp('ArrowUp', () => game.actions.setThrust(false)));
      keyHandlers.push(game.keyboard.onDown(' ', () => game.actions.setThrust(true)));
      keyHandlers.push(game.keyboard.onUp(' ', () => game.actions.setThrust(false)));
      keyHandlers.push(game.keyboard.onDown('ArrowLeft', () => game.actions.steer(-60)));
      keyHandlers.push(game.keyboard.onDown('ArrowRight', () => game.actions.steer(60)));

      // also poll for held arrow keys for smooth steering
      const pollSub = game.subscribe((s) => {
        if (game.keyboard.isDown('ArrowLeft') && s.player.vx > -260) game.actions.steer(-3);
        if (game.keyboard.isDown('ArrowRight') && s.player.vx < 260) game.actions.steer(3);
      });

      // Pointer burst
      const onPointer = (e: PointerEvent): void => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        game.actions.burst(x, y);
      };
      canvas.addEventListener('pointerdown', onPointer);

      // FPS sampler
      let frames = 0;
      const fpsTimer = window.setInterval(() => {
        setFps(frames);
        frames = 0;
      }, 1000);
      const subFps = game.subscribe(() => {
        frames++;
      });

      // Resize ack
      game.actions.resize(W, H);
      game.start();

      // Auto-thrust intro to grab attention
      const introTimeout = window.setTimeout(() => {
        if (cancelled) return;
        game.actions.setThrust(true);
        window.setTimeout(() => {
          if (cancelled) return;
          game.actions.setThrust(false);
        }, 700);
      }, 250);

      cleanup = () => {
        clearInterval(fpsTimer);
        clearTimeout(introTimeout);
        for (const off of keyHandlers) off();
        pollSub();
        subFps();
        canvas.removeEventListener('pointerdown', onPointer);
        game.destroy();
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [size.w, size.h, running]);

  return (
    <div ref={wrapperRef} className={styles.demoWrap}>
      <div className={styles.bezel}>
        <div className={styles.statusRow}>
          <span className={styles.dotRed} />
          <span className={styles.dotYellow} />
          <span className={styles.dotGreen} />
          <span className={styles.title}>gameplate.live — pilot.ts</span>
          <span className={styles.fps}>{fps} fps</span>
        </div>
        <canvas ref={canvasRef} className={styles.canvas} aria-label="Live gameplate demo" />
        <div className={styles.controls}>
          <span className={styles.hint}>{hint}</span>
          <button
            type="button"
            className={clsx('button', styles.resetBtn)}
            onClick={(): void => {
              setHint('Reset!');
              setRunning((r) => !r);
              window.setTimeout(() => setHint('↑ thrust · ← → steer · click anywhere'), 700);
            }}
          >
            ↻ reset
          </button>
        </div>
      </div>
      <div className={styles.legend}>
        <strong>Powered by gameplate</strong> — this canvas is driven by the real{' '}
        <code>createGame</code>, <code>defineActions</code>, fixed-step loop, keyboard input, and
        pointer events you'll import in your own project. View source on{' '}
        <a
          href="https://github.com/yankouskia/gameplate/blob/master/website/src/components/LiveDemo/index.tsx"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        .
      </div>
    </div>
  );
}

export default function LiveDemo(): ReactNode {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.headerRow}>
          <span className="gp-pill">live · interactive · running gameplate v2</span>
          <h2 className={styles.title2}>
            See it <span className="gp-gradient-text">running, not screenshotted.</span>
          </h2>
          <p className={styles.subtitle}>
            Every pixel below is rendered by a real <code>createGame</code> instance — the same API
            you'd <code>import</code> in your project. Fixed-step physics, additive-blend particles,
            keyboard + pointer wired through gameplate's input layer.
          </p>
        </div>
        <BrowserOnly fallback={<div className={styles.fallback}>Loading interactive demo…</div>}>
          {(): ReactNode => <DemoCanvas />}
        </BrowserOnly>
      </div>
    </section>
  );
}
