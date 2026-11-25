/**
 * Runtime contract between sim, view, input and host. DO NOT import DOM APIs in src/game/sim.
 * Coordinates are flat plan units (tiles). Angles in the sim are RADIANS (0 = +x, PI/2 = +y/down).
 * Level JSON uses degrees; the loader converts.
 */
import type { LevelData, LevelObject } from "./levelSchema";

export interface Vec { x: number; y: number }

export type Gait = "sneak" | "walk" | "run";

/** What the player wants this tick. Produced by the input layer, consumed by the sim. */
export interface InputState {
  /** Movement vector, each axis -1..1. Magnitude 0..1 (clamped by the sim). */
  move: Vec;
  /** True when `move` comes from an analog stick (gait derived from magnitude). */
  analog: boolean;
  sneak: boolean; // Shift
  run: boolean;   // Space
  /** Edge-triggered: true only on the tick the button went down. */
  interactPressed: boolean;
  interactHeld: boolean;
  /** 0-3 when an inventory slot was triggered this tick, else null. */
  useSlot: number | null;
}
export const NO_INPUT: InputState = {
  move: { x: 0, y: 0 }, analog: false, sneak: false, run: false,
  interactPressed: false, interactHeld: false, useSlot: null,
};

/** View-only controls (never reach the sim). */
export interface ViewControls {
  /** Zoom request this frame in "steps": +1 zoom in one notch, -1 zoom out. Fractions allowed (pinch). */
  zoomDelta: number;
  /** Hold-to-peek (zoom out briefly). */
  peek: boolean;
}

export type RoomVisibility = "unknown" | "remembered" | "visible";

export interface PlayerState {
  x: number; y: number;
  /** Position at the previous tick (for render interpolation). */
  px: number; py: number;
  facing: number; // radians
  gait: Gait;
  moving: boolean;
  radius: number; // collision circle, tiles (0.3)
  hidden: boolean; // reserved for phase 3
}

export interface SeekerState {
  id: string;
  type: string;
  x: number; y: number; px: number; py: number;
  facing: number; // radians
  /** Phase 2 fills these in. Phase 1 seekers stand still. */
  state: "patrol" | "curious" | "investigate" | "search" | "chase" | "return" | "sleep";
  /** Vision cone parameters (tiles / radians). Used by the view in phase 2. */
  coneRange: number;
  coneAngle: number;
  detection: number; // 0..1
}

export interface ObjectState {
  id: string;
  def: LevelObject;
  /** Resolved defaults (the loader fills these in). */
  height: number;
  blocksMove: boolean;
  blocksSight: boolean;
  /** Doors: current state. Others: "static". */
  state: "open" | "closed" | "static";
}

export interface NoiseEvent {
  id: number;
  x: number; y: number;
  radius: number;
  age: number;  // seconds since emitted
  life: number; // seconds it lives
  source: "player" | "world";
}

export type GameStatus = "ready" | "playing" | "won" | "found" | "timeout";

/** Derived static lookups, built once by createWorld. Not serialized. */
export interface Grid {
  w: number; h: number;
  /** 1 = blocks movement (walls, void, blocking objects). */
  blocksMove: Uint8Array;
  /** 1 = blocks sight (walls, hedges, tall objects, closed doors). */
  blocksSight: Uint8Array;
  /** Room index per tile, -1 = none. Index into level.rooms. */
  roomIndex: Int16Array;
  /** Surface code per tile: 0 wood,1 carpet,2 tile,3 creaky,4 grass,5 concrete. */
  surface: Uint8Array;
}

export interface WorldState {
  level: LevelData;
  grid: Grid;
  tick: number;
  t: number;          // seconds since level load
  status: GameStatus;
  timeLeft: number;   // seconds; starts counting when the player first moves
  timerStarted: boolean;
  player: PlayerState;
  seekers: SeekerState[];
  objects: ObjectState[];
  noise: NoiseEvent[];
  /** Room id -> visibility. Rooms the player has seen become "remembered". */
  roomVis: Record<string, RoomVisibility>;
  /** Id of the room the player stands in, or null (yard counts if a yard room exists). */
  currentRoom: string | null;
  rngState: number;
  nextNoiseId: number;
}

/** Events the sim emits each step. The view, audio, and host listen. Cleared by the host per frame. */
export type SimEvent =
  | { type: "noise"; x: number; y: number; radius: number; source: "player" | "world" }
  | { type: "roomEntered"; roomId: string }
  | { type: "roomRevealed"; roomId: string }
  | { type: "timerStarted" }
  | { type: "won" }
  | { type: "timeout" }
  | { type: "found"; seekerId: string };

/** Fixed sim step. */
export const SIM_DT = 1 / 60;

export const GAIT_SPEED: Record<Gait, number> = { sneak: 1.8, walk: 3.0, run: 4.6 };
/** Base noise radius per gait (tiles) before the surface multiplier. */
export const GAIT_NOISE: Record<Gait, number> = { sneak: 0, walk: 2.5, run: 6 };
/** Surface noise multipliers by surface code (see Grid.surface). */
export const SURFACE_NOISE = [1, 0.5, 1.3, 1.8, 1, 1.2] as const;
