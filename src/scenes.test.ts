import { describe, expect, it, vi } from 'vitest';

import { createMachine } from './scenes.js';

type S = 'menu' | 'playing' | 'paused' | 'gameover';
type E = 'start' | 'pause' | 'resume' | 'die' | 'restart';

function buildMachine() {
  return createMachine<S, E>({
    initial: 'menu',
    on: {
      menu: { start: 'playing' },
      playing: { pause: 'paused', die: 'gameover' },
      paused: { resume: 'playing' },
      gameover: { restart: 'menu' },
    },
  });
}

describe('createMachine', () => {
  it('starts in the initial state', () => {
    const fsm = buildMachine();
    expect(fsm.current()).toBe('menu');
    expect(fsm.matches('menu')).toBe(true);
  });

  it('transitions on a known event', () => {
    const fsm = buildMachine();
    expect(fsm.send('start')).toBe('playing');
    expect(fsm.current()).toBe('playing');
  });

  it('ignores undefined transitions silently', () => {
    const fsm = buildMachine();
    expect(fsm.send('pause')).toBe('menu'); // 'menu' has no 'pause' transition
    expect(fsm.current()).toBe('menu');
  });

  it('fires onEnter for initial state and every transition', () => {
    const onEnterMenu = vi.fn();
    const onEnterPlaying = vi.fn();
    const onExitMenu = vi.fn();
    const fsm = createMachine<S, E>({
      initial: 'menu',
      on: { menu: { start: 'playing' } },
      onEnter: { menu: onEnterMenu, playing: onEnterPlaying },
      onExit: { menu: onExitMenu },
    });
    expect(onEnterMenu).toHaveBeenCalledOnce();
    fsm.send('start');
    expect(onExitMenu).toHaveBeenCalledOnce();
    expect(onEnterPlaying).toHaveBeenCalledOnce();
  });

  it('subscribers receive (current, previous, event)', () => {
    const fsm = buildMachine();
    const fn = vi.fn();
    fsm.subscribe(fn);
    fsm.send('start');
    expect(fn).toHaveBeenCalledWith('playing', 'menu', 'start');
  });

  it('does not fire subscribers when transition is ignored', () => {
    const fsm = buildMachine();
    const fn = vi.fn();
    fsm.subscribe(fn);
    fsm.send('pause'); // ignored from 'menu'
    expect(fn).not.toHaveBeenCalled();
  });

  it('full lifecycle: menu → playing → paused → playing → gameover → menu', () => {
    const fsm = buildMachine();
    fsm.send('start');
    fsm.send('pause');
    expect(fsm.current()).toBe('paused');
    fsm.send('resume');
    expect(fsm.current()).toBe('playing');
    fsm.send('die');
    expect(fsm.current()).toBe('gameover');
    fsm.send('restart');
    expect(fsm.current()).toBe('menu');
  });
});
