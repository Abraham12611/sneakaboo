// World (flat tile grid, z = height in tiles) -> screen pixels at zoom 1.
export interface Projection {
  readonly name: 'oblique' | 'topdown';
  worldToScreen(x: number, y: number, z?: number): { sx: number; sy: number };
  screenToWorld(sx: number, sy: number): { x: number; y: number };
  readonly tileScreenW: number;
  readonly tileScreenH: number;
  wallHeightPx: number; // 0 for top-down
}

export const TILE = 64;
export const WALL_HEIGHT_TILES = 1.6;

export class ObliqueProjection implements Projection {
  readonly name = 'oblique' as const;
  readonly tileScreenW: number;
  readonly tileScreenH: number;
  wallHeightPx: number;
  /** pixels per tile of height (z). 1 z unit = one tile width on screen. */
  readonly H: number;
  constructor(readonly T = TILE, readonly K = 0.85, wallTiles = WALL_HEIGHT_TILES) {
    this.tileScreenW = T; this.tileScreenH = T * K; this.H = T; this.wallHeightPx = wallTiles * this.H;
  }
  worldToScreen(x: number, y: number, z = 0) { return { sx: x * this.T, sy: y * this.T * this.K - z * this.H }; }
  screenToWorld(sx: number, sy: number) { return { x: sx / this.T, y: sy / (this.T * this.K) }; }
}

export class TopDownProjection implements Projection {
  readonly name = 'topdown' as const;
  readonly tileScreenW: number;
  readonly tileScreenH: number;
  wallHeightPx = 0;
  constructor(readonly T = TILE) { this.tileScreenW = T; this.tileScreenH = T; }
  worldToScreen(x: number, y: number, _z = 0) { return { sx: x * this.T, sy: y * this.T }; }
  screenToWorld(sx: number, sy: number) { return { x: sx / this.T, y: sy / this.T }; }
}

export function makeProjection(name: string): Projection {
  return name === 'topdown' ? new TopDownProjection() : new ObliqueProjection();
}
