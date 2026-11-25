/**
 * Grid helpers for the level validator: blocking rules, blocked-cell grid and shortest path.
 * Pure functions, no I/O. Units are tiles; cell (cx, cy) covers [cx, cx+1) x [cy, cy+1).
 */
import type { LevelData, LevelObject } from "../../src/game/sim/levelSchema";

export const WALK_SPEED = 3.0; // tiles per second (normal walk)
export const PLAYER_RADIUS = 0.3; // < 0.5, so 1-tile gaps are always passable

/** Tile chars that block movement (walkable are "." and ","). */
export const BLOCKING_TILES = new Set([" ", "#", "=", "w", "h"]);
const NON_BLOCKING_TYPES = new Set(["rug", "painting", "lamp"]);

export function isWalkableChar(ch: string | undefined): boolean {
  return ch !== undefined && !BLOCKING_TILES.has(ch);
}

export function tileAt(level: LevelData, x: number, y: number): string | undefined {
  return level.tiles[y]?.[x];
}

export interface BlockOptions {
  /** Closed doors block movement when true (default). Open doors never block. */
  closedDoorsBlock?: boolean;
}

/** Does this object block walking? */
export function objectBlocks(o: LevelObject, opts: BlockOptions = {}): boolean {
  const closedBlock = opts.closedDoorsBlock ?? true;
  if (o.type === "door") {
    const closed = o.state === "closed";
    return closed && closedBlock;
  }
  if (o.blocksMove !== undefined) return o.blocksMove;
  return !NON_BLOCKING_TYPES.has(o.type);
}

/** Overlap area of an object footprint with the unit cell (cx, cy). */
export function cellOverlap(o: LevelObject, cx: number, cy: number): number {
  const ox = Math.min(o.x + o.w, cx + 1) - Math.max(o.x, cx);
  const oy = Math.min(o.y + o.h, cy + 1) - Math.max(o.y, cy);
  return ox > 0 && oy > 0 ? ox * oy : 0;
}

const OVERLAP_BLOCK = 0.2; // a cell counts as blocked when an object covers >= 20% of it

/** blocked[y][x] = true when tiles or blocking objects make the cell impassable. */
export function buildBlocked(level: LevelData, opts: BlockOptions = {}): boolean[][] {
  const { w, h } = level.size;
  const blocked: boolean[][] = [];
  for (let y = 0; y < h; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < w; x++) row.push(!isWalkableChar(tileAt(level, x, y)));
    blocked.push(row);
  }
  for (const o of level.objects) {
    if (!objectBlocks(o, opts)) continue;
    const x0 = Math.max(0, Math.floor(o.x));
    const x1 = Math.min(w - 1, Math.ceil(o.x + o.w) - 1);
    const y0 = Math.max(0, Math.floor(o.y));
    const y1 = Math.min(h - 1, Math.ceil(o.y + o.h) - 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (cellOverlap(o, x, y) >= OVERLAP_BLOCK) (blocked[y] as boolean[])[x] = true;
      }
    }
  }
  return blocked;
}

export interface Cell {
  x: number;
  y: number;
}

export function inBounds(blocked: boolean[][], x: number, y: number): boolean {
  return y >= 0 && y < blocked.length && x >= 0 && x < (blocked[0]?.length ?? 0);
}

export function isFree(blocked: boolean[][], x: number, y: number): boolean {
  return inBounds(blocked, x, y) && blocked[y]?.[x] === false;
}

const DIRS: Array<[number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

export interface PathResult {
  found: boolean;
  /** Length in tiles (cell centre to cell centre, 8-connected, no corner cutting). */
  length: number;
  path: Cell[];
}

/** Dijkstra from `from` to the nearest cell of `goals` on the blocked grid. */
export function shortestPath(blocked: boolean[][], from: Cell, goals: Cell[]): PathResult {
  const h = blocked.length;
  const w = blocked[0]?.length ?? 0;
  const none: PathResult = { found: false, length: Infinity, path: [] };
  if (!isFree(blocked, from.x, from.y)) return none;
  const goalSet = new Set(goals.filter((g) => isFree(blocked, g.x, g.y)).map((g) => g.y * w + g.x));
  if (goalSet.size === 0) return none;
  const dist = new Float64Array(w * h).fill(Infinity);
  const prev = new Int32Array(w * h).fill(-1);
  const done = new Uint8Array(w * h);
  const startIdx = from.y * w + from.x;
  dist[startIdx] = 0;
  const open = new Set<number>([startIdx]);
  while (open.size > 0) {
    let cur = -1;
    let best = Infinity;
    for (const i of open) {
      const d = dist[i] as number;
      if (d < best) {
        best = d;
        cur = i;
      }
    }
    open.delete(cur);
    done[cur] = 1;
    if (goalSet.has(cur)) {
      const path: Cell[] = [];
      for (let i = cur; i !== -1; i = prev[i] as number) path.push({ x: i % w, y: Math.floor(i / w) });
      path.reverse();
      return { found: true, length: best, path };
    }
    const cx = cur % w;
    const cy = Math.floor(cur / w);
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isFree(blocked, nx, ny)) continue;
      // no corner cutting: diagonal needs both orthogonal neighbours free
      if (dx !== 0 && dy !== 0 && (!isFree(blocked, cx + dx, cy) || !isFree(blocked, cx, cy + dy))) continue;
      const ni = ny * w + nx;
      if (done[ni]) continue;
      const nd = best + cost;
      if (nd < (dist[ni] as number)) {
        dist[ni] = nd;
        prev[ni] = cur;
        open.add(ni);
      }
    }
  }
  return none;
}

/** All cells reachable from `from` (4-connected flood fill). */
export function floodFill(blocked: boolean[][], from: Cell): Set<number> {
  const w = blocked[0]?.length ?? 0;
  const seen = new Set<number>();
  if (!isFree(blocked, from.x, from.y)) return seen;
  const stack: Cell[] = [from];
  seen.add(from.y * w + from.x);
  while (stack.length > 0) {
    const c = stack.pop() as Cell;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      if (!isFree(blocked, nx, ny)) continue;
      const idx = ny * w + nx;
      if (seen.has(idx)) continue;
      seen.add(idx);
      stack.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/** Cells of the home rect (any cell the rect overlaps). */
export function homeCells(level: LevelData): Cell[] {
  const [hx, hy, hw, hh] = level.home;
  const out: Cell[] = [];
  for (let y = Math.floor(hy); y < Math.ceil(hy + hh); y++) {
    for (let x = Math.floor(hx); x < Math.ceil(hx + hw); x++) out.push({ x, y });
  }
  return out;
}

export function startCell(level: LevelData): Cell {
  return { x: Math.floor(level.start.x), y: Math.floor(level.start.y) };
}
