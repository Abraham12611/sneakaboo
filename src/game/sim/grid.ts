import type { LevelData, LevelObject } from "./levelSchema";
import { TILE } from "./levelSchema";
import { DEFAULT_HEIGHT, NON_BLOCKING_TYPES, SIGHT_BLOCK_HEIGHT, SURFACE_CODE } from "./defaults";
import type { Grid, ObjectState } from "./types";

const EPS = 1e-6;

export function resolveObject(def: LevelObject): ObjectState {
  const isDoor = def.type === "door";
  const state: ObjectState["state"] = isDoor ? (def.state ?? "open") : "static";
  const height = def.height ?? DEFAULT_HEIGHT[def.type];
  const blocksMove = def.blocksMove ?? (isDoor ? state === "closed" : !NON_BLOCKING_TYPES.has(def.type));
  const blocksSight = def.blocksSight ?? (isDoor ? state === "closed" : height >= SIGHT_BLOCK_HEIGHT);
  return { id: def.id, def, height, blocksMove, blocksSight, state };
}

/** Rebuild blocking flags from tiles + objects. Call after toggling a door. */
export function stampObjects(grid: Grid, level: LevelData, objects: readonly ObjectState[], baseMove: Uint8Array, baseSight: Uint8Array): void {
  grid.blocksMove.set(baseMove);
  grid.blocksSight.set(baseSight);
  for (const o of objects) {
    if (!o.blocksMove && !o.blocksSight) continue;
    const { x, y, w, h } = o.def;
    const x0 = Math.max(0, Math.floor(x + EPS));
    const y0 = Math.max(0, Math.floor(y + EPS));
    const x1 = Math.min(level.size.w - 1, Math.ceil(x + w - EPS) - 1);
    const y1 = Math.min(level.size.h - 1, Math.ceil(y + h - EPS) - 1);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i = ty * level.size.w + tx;
        if (o.blocksMove) grid.blocksMove[i] = 1;
        if (o.blocksSight) grid.blocksSight[i] = 1;
      }
    }
  }
}

function inRect(r: readonly number[], px: number, py: number): boolean {
  const [rx = 0, ry = 0, rw = 0, rh = 0] = r;
  return px >= rx && px < rx + rw && py >= ry && py < ry + rh;
}

export function buildGrid(level: LevelData, objects: readonly ObjectState[]): { grid: Grid; baseMove: Uint8Array; baseSight: Uint8Array } {
  const { w, h } = level.size;
  const n = w * h;
  const baseMove = new Uint8Array(n);
  const baseSight = new Uint8Array(n);
  const roomIndex = new Int16Array(n).fill(-1);
  const surface = new Uint8Array(n);

  for (let ty = 0; ty < h; ty++) {
    const row = level.tiles[ty] ?? "";
    for (let tx = 0; tx < w; tx++) {
      const i = ty * w + tx;
      const c = row.charAt(tx) || TILE.VOID;
      switch (c) {
        case TILE.WALL:
        case TILE.PARTITION:
        case TILE.HEDGE:
          baseMove[i] = 1; baseSight[i] = 1; break;
        case TILE.WINDOW:
          baseMove[i] = 1; break;
        case TILE.FLOOR:
        case TILE.GRASS:
          break;
        default: // void and unknown chars
          baseMove[i] = 1;
      }
      let ri = -1;
      for (let r = 0; r < level.rooms.length && ri < 0; r++) {
        const rects = level.rooms[r]!.rects;
        for (const rect of rects) {
          if (inRect(rect, tx + 0.5, ty + 0.5)) { ri = r; break; }
        }
      }
      roomIndex[i] = ri;
      surface[i] = ri >= 0 ? SURFACE_CODE[level.rooms[ri]!.surface] : c === TILE.GRASS ? SURFACE_CODE.grass : SURFACE_CODE.wood;
    }
  }
  const grid: Grid = { w, h, blocksMove: new Uint8Array(n), blocksSight: new Uint8Array(n), roomIndex, surface };
  stampObjects(grid, level, objects, baseMove, baseSight);
  return { grid, baseMove, baseSight };
}
