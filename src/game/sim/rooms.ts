import { FOG_RANGE } from "./defaults";
import type { Grid, SimEvent, WorldState } from "./types";

interface FogCache {
  /** Sample tile indices per room index (checkerboard, every 2nd tile). */
  samples: Int32Array[];
  visible: Uint8Array;
}
const caches = new WeakMap<Grid, FogCache>();

export function roomIndexAt(world: WorldState, x: number, y: number): number {
  const g = world.grid;
  const tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= g.w || ty >= g.h) return -1;
  return g.roomIndex[ty * g.w + tx] ?? -1;
}

function getCache(world: WorldState): FogCache {
  const g = world.grid;
  let c = caches.get(g);
  if (c && c.samples.length === world.level.rooms.length) return c;
  const nr = world.level.rooms.length;
  const lists: number[][] = Array.from({ length: nr }, () => []);
  for (let ty = 0; ty < g.h; ty++) {
    for (let tx = 0; tx < g.w; tx++) {
      const i = ty * g.w + tx;
      const r = g.roomIndex[i] ?? -1;
      if (r < 0 || g.blocksSight[i] === 1) continue;
      if ((tx + ty) % 2 === 0) lists[r]!.push(i);
    }
  }
  // Rooms with no checkerboard sample (tiny rooms) fall back to every open tile.
  for (let r = 0; r < nr; r++) {
    if (lists[r]!.length > 0) continue;
    for (let i = 0; i < g.roomIndex.length; i++) {
      if (g.roomIndex[i] === r && g.blocksSight[i] === 0) lists[r]!.push(i);
    }
  }
  c = { samples: lists.map((l) => Int32Array.from(l)), visible: new Uint8Array(nr) };
  caches.set(g, c);
  return c;
}

/** DDA line of sight on the tile grid from (x0,y0) to (x1,y1). The start tile is ignored. */
export function rayClear(grid: Grid, x0: number, y0: number, x1: number, y1: number): boolean {
  let tx = Math.floor(x0), ty = Math.floor(y0);
  const ex = Math.floor(x1), ey = Math.floor(y1);
  const dx = x1 - x0, dy = y1 - y0;
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  const tDeltaX = adx > 0 ? 1 / adx : Infinity;
  const tDeltaY = ady > 0 ? 1 / ady : Infinity;
  let tMaxX = adx > 0 ? (dx > 0 ? tx + 1 - x0 : x0 - tx) / adx : Infinity;
  let tMaxY = ady > 0 ? (dy > 0 ? ty + 1 - y0 : y0 - ty) / ady : Infinity;
  let guard = Math.abs(ex - tx) + Math.abs(ey - ty) + 2;
  const { w, h, blocksSight } = grid;
  while ((tx !== ex || ty !== ey) && guard-- > 0) {
    if (tMaxX < tMaxY) { tx += stepX; tMaxX += tDeltaX; }
    else if (tMaxY < tMaxX) { ty += stepY; tMaxY += tDeltaY; }
    else {
      // Exact corner crossing: do not slip between two diagonal blockers.
      const ax = tx + stepX, ay = ty + stepY;
      if (ax >= 0 && ax < w && ty >= 0 && ty < h && ay >= 0 && ay < h && blocksSight[ty * w + ax] === 1 && blocksSight[ay * w + tx] === 1) return false;
      tx = ax; ty = ay; tMaxX += tDeltaX; tMaxY += tDeltaY;
    }
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return false;
    if (blocksSight[ty * w + tx] === 1) return false;
  }
  return true;
}

/** Recompute current room and room visibility. Pushes roomEntered / roomRevealed when `events` is given. */
export function updateRooms(world: WorldState, events: SimEvent[] | null): void {
  const g = world.grid;
  const rooms = world.level.rooms;
  const cache = getCache(world);
  const vis = cache.visible;
  const px = world.player.x, py = world.player.y;
  const cur = roomIndexAt(world, px, py);
  const curId = cur >= 0 ? rooms[cur]!.id : null;
  if (curId !== world.currentRoom) {
    world.currentRoom = curId;
    if (curId !== null && events) events.push({ type: "roomEntered", roomId: curId });
  }
  vis.fill(0);
  if (cur >= 0) vis[cur] = 1;
  const r2 = FOG_RANGE * FOG_RANGE;
  for (let r = 0; r < rooms.length; r++) {
    if (vis[r] === 1) continue;
    const s = cache.samples[r]!;
    for (let k = 0; k < s.length; k++) {
      const idx = s[k]!;
      const tx = idx % g.w, ty = (idx - tx) / g.w;
      const cx = tx + 0.5, cy = ty + 0.5;
      const ddx = cx - px, ddy = cy - py;
      if (ddx * ddx + ddy * ddy > r2) continue;
      if (rayClear(g, px, py, cx, cy)) { vis[r] = 1; break; }
    }
  }
  for (let r = 0; r < rooms.length; r++) {
    const id = rooms[r]!.id;
    const prev = world.roomVis[id];
    if (vis[r] === 1) {
      if (prev !== "visible") {
        world.roomVis[id] = "visible";
        if (prev === "unknown" && events) events.push({ type: "roomRevealed", roomId: id });
      }
    } else if (prev === "visible") {
      world.roomVis[id] = "remembered";
    }
  }
}

