/**
 * Pure level validation. `validateLevel(level, opts)` returns a Report; no I/O, no process access.
 * Layout rules come from docs/17-floor-plan-and-layout-principles.md.
 */
import type { LevelData, Room } from "../../src/game/sim/levelSchema";
import {
  WALK_SPEED,
  buildBlocked,
  cellOverlap,
  floodFill,
  homeCells,
  isFree,
  isWalkableChar,
  shortestPath,
  startCell,
  tileAt,
  type Cell,
  type PathResult,
} from "./grid";

export interface Report {
  id: string;
  file?: string;
  relaxed: boolean;
  ok: boolean;
  errors: string[];
  warnings: string[];
  info: {
    routeLength: number | null;
    estTimeSec: number | null;
    rooms: number;
    doorways: number;
    hideSpots: Record<string, number> & { total: number };
    startHomeDistance: number | null;
  };
}

export interface ValidateOptions {
  /** Files starting with "_" (test rooms): skips house-level rules (room count, loops, distance). */
  relaxed?: boolean;
}

export const HIDE_TYPES = ["wardrobe", "bed", "closet", "sofa"] as const;
const PACE_MARGIN = 1.15;
const SAFE_ZONE = 4;
const MAX_SIDE_EXEMPT = new Set(["hall", "yard", "gallery"]);

export function levelIndex(id: string): number | null {
  const m = /^L(\d+)/i.exec(id);
  return m ? Number(m[1]) : null;
}

function roomArea(room: Room): number {
  return room.rects.reduce((s, r) => s + r[2] * r[3], 0);
}

function inRect(r: readonly number[], x: number, y: number): boolean {
  return x >= (r[0] as number) && x < (r[0] as number) + (r[2] as number) && y >= (r[1] as number) && y < (r[1] as number) + (r[3] as number);
}

/** Room lookup: interior rooms first; yard is the fallback for walkable cells. */
export function makeRoomLookup(level: LevelData): (x: number, y: number) => Room | undefined {
  const indoor = level.rooms.filter((r) => r.type !== "yard");
  const yards = level.rooms.filter((r) => r.type === "yard");
  return (x, y) => {
    for (const room of indoor) if (room.rects.some((r) => inRect(r, x, y))) return room;
    if (isWalkableChar(tileAt(level, x, y))) {
      for (const room of yards) if (room.rects.some((r) => inRect(r, x, y))) return room;
    }
    return undefined;
  };
}

export interface Doorway {
  cells: Cell[];
  width: number;
  rooms: string[];
}

/** Gaps = indoor floor tiles that belong to no indoor room (the 1-2 tile openings in walls). */
export function findDoorways(level: LevelData): Doorway[] {
  const { w, h } = level.size;
  const indoor = level.rooms.filter((r) => r.type !== "yard");
  const inIndoor = (x: number, y: number) => indoor.some((room) => room.rects.some((r) => inRect(r, x, y)));
  const roomAt = makeRoomLookup(level);
  const gap = (x: number, y: number) => tileAt(level, x, y) === "." && !inIndoor(x, y);
  const seen = new Set<number>();
  const out: Doorway[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!gap(x, y) || seen.has(y * w + x)) continue;
      const cells: Cell[] = [];
      const stack: Cell[] = [{ x, y }];
      seen.add(y * w + x);
      while (stack.length > 0) {
        const c = stack.pop() as Cell;
        cells.push(c);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = c.x + dx;
          const ny = c.y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !gap(nx, ny) || seen.has(ny * w + nx)) continue;
          seen.add(ny * w + nx);
          stack.push({ x: nx, y: ny });
        }
      }
      const xs = cells.map((c) => c.x);
      const ys = cells.map((c) => c.y);
      const bw = Math.max(...xs) - Math.min(...xs) + 1;
      const bh = Math.max(...ys) - Math.min(...ys) + 1;
      const rooms = new Set<string>();
      for (const c of cells) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const r = roomAt(c.x + dx, c.y + dy);
          if (r && !gap(c.x + dx, c.y + dy)) rooms.add(r.id);
        }
      }
      out.push({ cells, width: Math.max(bw, bh), rooms: [...rooms] });
    }
  }
  return out;
}

export interface Route {
  found: boolean;
  length: number;
  estTimeSec: number;
  path: Cell[];
}

/** Shortest start -> home route. `closedDoorsBlock` false treats every door as passable. */
export function computeRoute(level: LevelData, closedDoorsBlock = true): Route {
  const blocked = buildBlocked(level, { closedDoorsBlock });
  const res: PathResult = shortestPath(blocked, startCell(level), homeCells(level));
  return { found: res.found, length: res.length, estTimeSec: res.length / WALK_SPEED, path: res.path };
}

export function validateLevel(level: LevelData, opts: ValidateOptions = {}): Report {
  const relaxed = opts.relaxed ?? level.id.startsWith("_");
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(m);
  const warn = (m: string) => warnings.push(m);
  const { w, h } = level.size;
  const hide: Record<string, number> = { total: 0 };
  for (const t of HIDE_TYPES) hide[t] = level.objects.filter((o) => o.type === t).length;
  hide.total = HIDE_TYPES.reduce((s, t) => s + (hide[t] as number), 0);
  const report: Report = {
    id: level.id,
    relaxed,
    ok: true,
    errors,
    warnings,
    info: { routeLength: null, estTimeSec: null, rooms: 0, doorways: 0, hideSpots: hide as Report["info"]["hideSpots"], startHomeDistance: null },
  };

  const walkableOpen = buildBlocked(level, { closedDoorsBlock: false });
  const sc = startCell(level);

  // (a) start / home walkable
  if (!isFree(walkableOpen, sc.x, sc.y)) err(`start (${level.start.x}, ${level.start.y}) is not on a walkable tile`);
  const hCells = homeCells(level);
  if (!hCells.some((c) => isFree(walkableOpen, c.x, c.y))) err("home rect has no walkable tile");

  // (b) reachability + timing
  const closedRoute = computeRoute(level, true);
  const openRoute = computeRoute(level, false);
  if (closedRoute.found) {
    report.info.routeLength = Math.round(closedRoute.length * 10) / 10;
    report.info.estTimeSec = Math.round(closedRoute.estTimeSec * 10) / 10;
    if (level.timeLimit < PACE_MARGIN * closedRoute.estTimeSec) {
      err(`timeLimit ${level.timeLimit}s is under ${PACE_MARGIN} x walk time ${closedRoute.estTimeSec.toFixed(1)}s`);
    }
  } else if (openRoute.found) {
    err("home is only reachable through closed door(s); the route is blocked");
  } else {
    err("home is not reachable from start");
  }
  const ratio = level.par / level.timeLimit;
  if (ratio < 0.4 || ratio > 0.7) warn(`par ${level.par}s is ${(ratio * 100).toFixed(0)}% of timeLimit (expected 40-70%)`);

  // (c) rooms
  const indoor = level.rooms.filter((r) => r.type !== "yard");
  report.info.rooms = indoor.length;
  const demote = (m: string) => (relaxed ? warn(m) : err(m));
  for (const room of level.rooms) {
    for (const r of room.rects) {
      if (r[0] < 0 || r[1] < 0 || r[0] + r[2] > w || r[1] + r[3] > h) err(`room ${room.id} rect [${r.join(",")}] leaves the map`);
    }
  }
  for (const room of indoor) {
    const area = roomArea(room);
    const max = room.type === "hall" ? 80 : 48;
    if (area < 8) demote(`room ${room.id} area ${area} is under 8 tiles`);
    else if (area < 12) warn(`room ${room.id} area ${area} is under 12 tiles`);
    if (area > max) warn(`room ${room.id} area ${area} is over ${max} tiles`);
    if (!MAX_SIDE_EXEMPT.has(room.type)) {
      for (const r of room.rects) {
        if (Math.max(r[2], r[3]) > 8) warn(`room ${room.id} has a side longer than 8 tiles (${r[2]}x${r[3]})`);
      }
    }
    if (room.type === "hall") {
      for (const r of room.rects) {
        if (Math.min(r[2], r[3]) < 2) err(`corridor ${room.id} is ${Math.min(r[2], r[3])} tile wide, needs >= 2`);
      }
    }
    // free floor
    let total = 0;
    let free = 0;
    for (const r of room.rects) {
      for (let y = Math.floor(r[1]); y < Math.ceil(r[1] + r[3]); y++) {
        for (let x = Math.floor(r[0]); x < Math.ceil(r[0] + r[2]); x++) {
          total++;
          if (isFree(walkableOpen, x, y)) free++;
        }
      }
    }
    if (total > 0 && free / total < 0.3) warn(`room ${room.id} has only ${Math.round((free / total) * 100)}% free floor (min 30%)`);
  }
  if (!relaxed && indoor.length < 4) err(`only ${indoor.length} rooms, houses need at least 4`);

  // every room reachable (closed doors count as passable: the player can open them)
  const reach = floodFill(walkableOpen, sc);
  for (const room of level.rooms) {
    const ok = room.rects.some((r) => {
      for (let y = Math.floor(r[1]); y < Math.ceil(r[1] + r[3]); y++) {
        for (let x = Math.floor(r[0]); x < Math.ceil(r[0] + r[2]); x++) if (reach.has(y * w + x)) return true;
      }
      return false;
    });
    if (!ok) err(`room ${room.id} is not reachable from start`);
  }

  // doorways
  const doorways = findDoorways(level);
  report.info.doorways = doorways.length;
  for (const d of doorways) {
    const at = `(${d.cells[0]?.x},${d.cells[0]?.y})`;
    if (d.width > 2) err(`opening at ${at} is ${d.width} tiles wide (doorways are 1-2)`);
    if (d.rooms.length < 2) warn(`opening at ${at} does not connect two rooms`);
  }

  // start / home distance
  const hx = level.home[0] + level.home[2] / 2;
  const hy = level.home[1] + level.home[3] / 2;
  const dist = Math.hypot(hx - level.start.x, hy - level.start.y);
  report.info.startHomeDistance = Math.round(dist * 10) / 10;
  if (!relaxed && dist <= 0.6 * Math.hypot(w, h)) {
    warn(`start-home distance ${dist.toFixed(1)} is under 60% of the footprint diagonal (${(0.6 * Math.hypot(w, h)).toFixed(1)})`);
  }

  // loops (room graph without the yard)
  const idx = levelIndex(level.id);
  if (!relaxed && idx !== null && idx >= 3) {
    const nodes = new Set(indoor.map((r) => r.id));
    const edges = doorways.map((d) => d.rooms.filter((id) => nodes.has(id))).filter((rs) => rs.length === 2);
    const parent = new Map<string, string>();
    const find = (a: string): string => {
      let r = a;
      while (parent.has(r) && parent.get(r) !== r) r = parent.get(r) as string;
      return r;
    };
    let loop = false;
    for (const [a, b] of edges as Array<[string, string]>) {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) loop = true;
      else parent.set(ra, rb);
    }
    if (!loop) err("no loop in the room graph (levels 3+ need two ways between some rooms)");
  }

  // (d) seekers
  for (const s of level.seekers) {
    const pts = [{ label: "position", x: s.x, y: s.y }, ...s.path.map((p, i) => ({ label: `waypoint ${i}`, x: p.x, y: p.y }))];
    for (const p of pts) {
      const cx = Math.floor(p.x);
      const cy = Math.floor(p.y);
      if (!isFree(walkableOpen, cx, cy)) err(`seeker ${s.id} ${p.label} (${p.x}, ${p.y}) is not walkable`);
      if (Math.hypot(p.x - level.start.x, p.y - level.start.y) < SAFE_ZONE) {
        err(`seeker ${s.id} ${p.label} is within ${SAFE_ZONE} tiles of start`);
      }
    }
  }

  // (e) object footprints
  for (const o of level.objects) {
    if (o.x < 0 || o.y < 0 || o.x + o.w > w || o.y + o.h > h) {
      err(`object ${o.id} footprint leaves the map`);
      continue;
    }
    if (o.type === "painting" || o.type === "lamp") continue;
    let hitsWall = false;
    for (let y = Math.floor(o.y); y < Math.ceil(o.y + o.h); y++) {
      for (let x = Math.floor(o.x); x < Math.ceil(o.x + o.w); x++) {
        if (!isWalkableChar(tileAt(level, x, y)) && cellOverlap(o, x, y) > 0.05) hitsWall = true;
      }
    }
    if (hitsWall) err(`object ${o.id} (${o.type}) overlaps a wall or blocked tile`);
  }

  // (f) hiding spots
  if (!relaxed && indoor.length > 0 && hide.total < Math.ceil(indoor.length / 3)) {
    warn(`only ${hide.total} hiding-capable objects for ${indoor.length} rooms (want 1 per 3 rooms)`);
  }

  report.ok = errors.length === 0;
  return report;
}

/** Cross-level rule: no two consecutive levels (sorted by id) share an archetype. Mutates reports. */
export function checkArchetypeSequence(entries: Array<{ level: LevelData; report: Report }>): void {
  const real = entries.filter((e) => !e.report.relaxed).sort((a, b) => a.level.id.localeCompare(b.level.id, undefined, { numeric: true }));
  for (let i = 1; i < real.length; i++) {
    const prev = real[i - 1] as { level: LevelData; report: Report };
    const cur = real[i] as { level: LevelData; report: Report };
    if (cur.level.archetype && cur.level.archetype === prev.level.archetype) {
      cur.report.errors.push(`archetype ${cur.level.archetype} repeats from previous level ${prev.level.id}`);
      cur.report.ok = false;
    }
  }
}
