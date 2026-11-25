/** Static geometry derived once per level: wall runs, doorways. Pure data, no drawing. */
import type { LevelData } from "../sim/levelSchema";

export type WallKind = "wall" | "partition" | "window" | "hedge";

export interface WallRun {
  kind: WallKind;
  /** First tile and number of tiles (runs are horizontal). */
  x: number;
  y: number;
  len: number;
  /** Visual height in tiles. */
  height: number;
}

export const TALL_WALL = 1.6;
export const LOW_WALL = 0.5;
export const HEDGE_HEIGHT = 0.9;

export function tileAt(level: LevelData, x: number, y: number): string {
  if (x < 0 || y < 0 || x >= level.size.w || y >= level.size.h) return " ";
  return level.tiles[y]?.charAt(x) ?? " ";
}

export const isSolidTile = (c: string) => c === "#" || c === "=" || c === "w" || c === "h";
export const isFloorTile = (c: string) => c === "." || c === ",";

/**
 * Height of a wall-like tile in tiles. Exterior walls and windows are tall, except those that are the
 * south edge of an indoor floor (seen from behind, they would hide the room): those are drawn low.
 */
export function wallHeightAt(level: LevelData, x: number, y: number): number {
  const c = tileAt(level, x, y);
  if (c === "=") return LOW_WALL;
  if (c === "h") return HEDGE_HEIGHT;
  if (c === "#" || c === "w") return tileAt(level, x, y - 1) === "." ? LOW_WALL : TALL_WALL;
  return 0;
}

const KIND: Record<string, WallKind | undefined> = { "#": "wall", "=": "partition", w: "window", h: "hedge" };

export function buildWallRuns(level: LevelData): WallRun[] {
  const runs: WallRun[] = [];
  for (let y = 0; y < level.size.h; y++) {
    let cur: WallRun | null = null;
    for (let x = 0; x < level.size.w; x++) {
      const kind = KIND[tileAt(level, x, y)];
      if (!kind) {
        cur = null;
        continue;
      }
      const height = wallHeightAt(level, x, y);
      if (cur && cur.kind === kind && cur.height === height) cur.len++;
      else {
        cur = { kind, x, y, len: 1, height };
        runs.push(cur);
      }
    }
  }
  return runs;
}

const solidAt = (level: LevelData, x: number, y: number) => isSolidTile(tileAt(level, x, y));

/** Wall on both sides above/below (within 2 tiles) = a gap in a horizontal wall run, passage runs N-S... see doorwayAxis. */
function flanked(level: LevelData, x: number, y: number, vertical: boolean): boolean {
  if (tileAt(level, x, y) !== ".") return false;
  if (vertical) {
    // walls above and below: the passage runs east-west
    return (solidAt(level, x, y - 1) || solidAt(level, x, y - 2)) && (solidAt(level, x, y + 1) || solidAt(level, x, y + 2)) && !solidAt(level, x - 1, y) && !solidAt(level, x + 1, y);
  }
  return (solidAt(level, x - 1, y) || solidAt(level, x - 2, y)) && (solidAt(level, x + 1, y) || solidAt(level, x + 2, y)) && !solidAt(level, x, y - 1) && !solidAt(level, x, y + 1);
}

/**
 * Doorway gaps: a floor tile flanked by walls on two opposite sides (up to 2 tiles away, so 2-wide gaps count)
 * whose neighbours along the passage are not flanked themselves (so long corridors are not doorways).
 * Returns the passage direction: "ew" (walls above and below) or "ns", or null.
 */
export function doorwayAxis(level: LevelData, x: number, y: number): "ew" | "ns" | null {
  if (flanked(level, x, y, true) && !flanked(level, x - 1, y, true) && !flanked(level, x + 1, y, true)) return "ew";
  if (flanked(level, x, y, false) && !flanked(level, x, y - 1, false) && !flanked(level, x, y + 1, false)) return "ns";
  return null;
}

export function isDoorway(level: LevelData, x: number, y: number): boolean {
  return doorwayAxis(level, x, y) !== null;
}