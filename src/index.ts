/**
 * # gameplate
 *
 * A tiny, zero-dependency, fully-typed TypeScript framework for browser &
 * headless games. Bring your own renderer.
 *
 * ```ts
 * import { createGame, defineActions } from 'gameplate';
 * ```
 *
 * @packageDocumentation
 */

// Game facade — the 90% surface
export { createGame, type Game, type GameConfig } from './game.js';

// State + actions
export { createStore, type Store } from './store.js';
export {
  defineActions,
  type Action,
  type ActionMap,
  type AnyAction,
  type Dispatch,
} from './actions.js';

// Loop
export {
  createLoop,
  browserScheduler,
  nodeScheduler,
  defaultScheduler,
  type Loop,
  type LoopConfig,
  type Scheduler,
} from './loop.js';

// Input
export { createKeyboard, type Keyboard } from './input/keyboard.js';
export { createPointer, type Pointer, type PointerState } from './input/pointer.js';

// Scenes (FSM)
export { createMachine, type Machine, type MachineConfig, type Transitions } from './scenes.js';

// Selectors
export { createSelector, type Selector } from './selectors.js';

// Recorder & replay (deterministic record + replay of action sequences)
export {
  composeTaps,
  createRecorder,
  RECORDING_VERSION,
  replay,
  truncateRecording,
  type ActionTap,
  type RecordedEvent,
  type Recorder,
  type RecorderOptions,
  type Recording,
  type ReplayOptions,
} from './recorder.js';

// Shared types
export type { DeepReadonly, Listener, Unsubscribe } from './types.js';
