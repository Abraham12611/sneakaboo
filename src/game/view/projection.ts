/**
 * World (flat tiles, z = height in tiles) -> "projected pixels" at zoom 1.
 * The camera then scales/translates projected pixels onto the logical 1280x720 viewport.
 */
import type { ProjectionKind } from "../contracts";

/** Pixels per tile (screen width of one tile) at zoom 1. */
export const TILE_PX = 64;
/** Default vertical squash of the floor plane in the oblique view. */
export const OBLIQUE_K = 0.85;
/** Height of tall exterior walls in tiles. */
export const WALL_HEIGHT_TILES = 1.6;

export interface Projection {
  readonly name: ProjectionKind;
  worldToScreen(x: number, y: number, z?: number): { sx: number; sy: number };
  screenToWorld(sx: number, sy: number): { x: number; y: number };
  /** Allocation-free scalar helpers used on the hot path. */
  px(x: number): number;
  py(y: number, z?: number): number;
  readonly tileScreenW: number;
  readonly tileScreenH: number;
  /** Pixels of extrusion for one tile of height (0 for top-down). */
  readonly heightPx: number;
  /** Pixels of a tall exterior wall. 0 for top-down. */
  wallHeightPx: number;
}

export class ObliqueProjection implements Projection {
  readonly name = "oblique" as const;
  readonly tileScreenW: number;
  readonly tileScreenH: number;
  readonly heightPx: number;
  wallHeightPx: number;
  constructor(
    readonly T = TILE_PX,
    readonly K = OBLIQUE_K,
    wallTiles = WALL_HEIGHT_TILES,
  ) {
    this.tileScreenW = T;
    this.tileScreenH = T * K;
    this.heightPx = T;
    this.wallHeightPx = wallTiles * T;
  }
  px(x: number): number {
    return x * this.T;
  }
  py(y: number, z = 0): number {
    return y * this.T * this.K - z * this.heightPx;
  }
  worldToScreen(x: number, y: number, z = 0) {
    return { sx: this.px(x), sy: this.py(y, z) };
  }
  screenToWorld(sx: number, sy: number) {
    return { x: sx / this.T, y: sy / (this.T * this.K) };
  }
}

export class TopDownProjection implements Projection {
  readonly name = "topdown" as const;
  readonly tileScreenW: number;
  readonly tileScreenH: number;
  readonly heightPx = 0;
  wallHeightPx = 0;
  constructor(readonly T = TILE_PX) {
    this.tileScreenW = T;
    this.tileScreenH = T;
  }
  px(x: number): number {
    return x * this.T;
  }
  py(y: number): number {
    return y * this.T;
  }
  worldToScreen(x: number, y: number) {
    return { sx: x * this.T, sy: y * this.T };
  }
  screenToWorld(sx: number, sy: number) {
    return { x: sx / this.T, y: sy / this.T };
  }
}

export function makeProjection(kind: ProjectionKind): Projection {
  return kind === "topdown" ? new TopDownProjection() : new ObliqueProjection();
}
