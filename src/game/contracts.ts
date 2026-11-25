/**
 * Module interfaces for Phase 1. Each owner implements its side; the host wires them.
 *
 *  sim   (src/game/sim/index.ts)     -> SimApi
 *  view  (src/game/view/index.ts)    -> createGameView
 *  input (src/game/input/index.ts)   -> createInputController
 *  host  (src/game/host/GameHost.ts) -> wires all of them
 */
import type { LevelData } from "./sim/levelSchema";
import type { InputState, SimEvent, ViewControls, WorldState } from "./sim/types";

/** Pure game logic. No DOM. Deterministic. */
export interface SimApi {
  /** Build a fresh world from validated level data. */
  createWorld(level: LevelData): WorldState;
  /** Advance exactly one fixed tick (SIM_DT). Pushes emitted events into `events`. */
  stepWorld(world: WorldState, input: InputState, events: SimEvent[]): void;
  /** Index of the room containing the tile at (x, y), or -1. */
  roomIndexAt(world: WorldState, x: number, y: number): number;
  /** True if a circle of `radius` at (x, y) fits (does not overlap blocking tiles). */
  isWalkable(world: WorldState, x: number, y: number, radius: number): boolean;
}

export type ProjectionKind = "oblique" | "topdown";

export interface ViewOptions {
  projection: ProjectionKind;
  /** Saved zoom preference (0.6-1.8) or undefined to use the level default. */
  initialZoom?: number;
  debug?: boolean;
}

/** Everything that draws. Owns camera, projection, renderer. Never mutates the sim. */
export interface GameView {
  /** Replace the level (call on load/retry). */
  setLevel(level: LevelData, world: WorldState): void;
  /** CSS pixel size and device pixel ratio of the canvas container. */
  resize(cssW: number, cssH: number, dpr: number): void;
  setProjection(kind: ProjectionKind): void;
  getProjection(): ProjectionKind;
  /** Draw one frame. `alpha` (0..1) interpolates between the previous and current sim tick. */
  frame(world: WorldState, alpha: number, dtSeconds: number, controls: ViewControls, events: readonly SimEvent[]): void;
  /** Current zoom (for settings persistence and the HUD). */
  getZoom(): number;
  setZoom(z: number): void;
  /** Convert a screen point (CSS px relative to the canvas) to flat world tiles. */
  screenToWorld(sx: number, sy: number): { x: number; y: number };
  setDebug(on: boolean): void;
  dispose(): void;
}
export type CreateGameView = (canvas: HTMLCanvasElement, opts: ViewOptions) => GameView;

export interface InputController {
  /** Poll the current input for this sim tick (edge flags are consumed). */
  pollSim(): InputState;
  /** Poll per-frame view controls (zoom deltas are consumed). */
  pollView(): ViewControls;
  /** Pause/restart/projection-toggle/debug requests since the last call. */
  pollCommands(): { pause: boolean; restart: boolean; toggleProjection: boolean; toggleDebug: boolean };
  /** Layout hint for the on-screen touch UI (left-handed swap). */
  setLeftHanded(on: boolean): void;
  dispose(): void;
}
export type CreateInputController = (target: HTMLElement) => InputController;
