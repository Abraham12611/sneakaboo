/** Test fixtures for the view: a hand-built level/world (no sim dependency) and a recording canvas mock. */
import type { LevelData } from "../../src/game/sim/levelSchema";
import { parseLevel } from "../../src/game/sim/levelSchema";
import type { ObjectState, WorldState } from "../../src/game/sim/types";

export const DRAW_OPS = new Set(["fill", "stroke", "fillRect", "strokeRect", "drawImage", "fillText", "strokeText", "clearRect"]);

export interface MockCtx {
  ctx: CanvasRenderingContext2D;
  calls: Map<string, number>;
  /** Number of "draw ops" (fill/stroke/fillRect/...) since the last reset. */
  drawOps(): number;
  total(): number;
  reset(): void;
}

/** A Proxy that records every method call. Method results are the proxy itself (so gradients chain). */
export function makeMockCtx(): MockCtx {
  const calls = new Map<string, number>();
  const props = new Map<string | symbol, unknown>();
  const fns = new Map<string | symbol, unknown>();
  // eslint-disable-next-line prefer-const
  let proxy: unknown;
  const target = function () {
    return proxy;
  };
  proxy = new Proxy(target, {
    get(_t, prop) {
      if (props.has(prop)) return props.get(prop);
      let f = fns.get(prop);
      if (!f) {
        const name = String(prop);
        f = () => {
          calls.set(name, (calls.get(name) ?? 0) + 1);
          return proxy;
        };
        fns.set(prop, f);
      }
      return f;
    },
    set(_t, prop, v) {
      props.set(prop, v);
      return true;
    },
  });
  return {
    ctx: proxy as CanvasRenderingContext2D,
    calls,
    drawOps() {
      let n = 0;
      for (const [k, v] of calls) if (DRAW_OPS.has(k)) n += v;
      return n;
    },
    total() {
      let n = 0;
      for (const v of calls.values()) n += v;
      return n;
    },
    reset() {
      calls.clear();
    },
  };
}

export function makeFakeCanvas(w = 1280, h = 720) {
  const main = makeMockCtx();
  const offscreen: MockCtx[] = [];
  const canvas = {
    width: w,
    height: h,
    clientWidth: w,
    clientHeight: h,
    style: {} as Record<string, string>,
    getContext: () => main.ctx,
  } as unknown as HTMLCanvasElement;
  const createCanvas = (cw: number, ch: number) => {
    const m = makeMockCtx();
    offscreen.push(m);
    return { width: cw, height: ch, getContext: () => m.ctx } as unknown as HTMLCanvasElement;
  };
  return { canvas, main, offscreen, createCanvas };
}

/** 40x24 level: yard ring, house with 3 rooms, doorways, windows, hedges. */
export function makeTestLevel(): LevelData {
  const W = 40;
  const H = 24;
  const g: string[][] = [];
  for (let y = 0; y < H; y++) g.push(Array.from({ length: W }, () => ","));
  const set = (x: number, y: number, c: string) => {
    g[y]![x] = c;
  };
  for (let y = 4; y <= 19; y++)
    for (let x = 4; x <= 35; x++) set(x, y, y === 4 || y === 19 || x === 4 || x === 35 ? "#" : ".");
  for (let y = 5; y <= 18; y++) set(20, y, "=");
  set(20, 8, ".");
  set(20, 9, ".");
  for (let x = 5; x <= 19; x++) set(x, 12, "=");
  set(10, 12, ".");
  set(8, 4, "w");
  set(9, 4, "w");
  set(28, 4, "w");
  set(30, 19, ".");
  for (let x = 6; x <= 12; x++) set(x, 1, "h");
  const tiles = g.map((r) => r.join(""));
  return parseLevel({
    v: 1,
    id: "test-house",
    name: "Test House",
    timeLimit: 120,
    par: 60,
    size: { w: W, h: H },
    tiles,
    rooms: [
      { id: "hall", type: "hall", rects: [[5, 5, 15, 7]], floorTint: "#c0564b", surface: "wood" },
      { id: "bedroom", type: "bedroom", rects: [[5, 13, 15, 6]], floorTint: "#e0a050", surface: "carpet" },
      { id: "living", type: "living", rects: [[21, 5, 14, 14]], floorTint: "#6fae6a", surface: "tile" },
    ],
    objects: [
      { id: "bed", type: "bed", x: 6, y: 14, w: 2, h: 1, height: 0.6 },
      { id: "wardrobe", type: "wardrobe", x: 12, y: 13, w: 2, h: 1, height: 1.7 },
      { id: "rug", type: "rug", x: 8, y: 7, w: 4, h: 2, height: 0, color: "#a03a3a" },
      { id: "sofa", type: "sofa", x: 24, y: 6, w: 3, h: 1, height: 0.7 },
      { id: "table", type: "table", x: 24, y: 10, w: 2, h: 2, height: 0.7 },
      { id: "plant", type: "plant", x: 33, y: 6, w: 1, h: 1, height: 1 },
      { id: "fridge", type: "fridge", x: 33, y: 16, w: 1, h: 1, height: 1.6 },
      { id: "chest", type: "chest", x: 14, y: 8, w: 1, h: 1, height: 0.6 },
      { id: "desk", type: "desk", x: 16, y: 6, w: 2, h: 1, height: 0.7 },
      { id: "door1", type: "door", x: 20, y: 10, w: 1, h: 1, height: 1.6, state: "closed" },
      { id: "door2", type: "door", x: 10, y: 12, w: 1, h: 1, height: 1.6, state: "open" },
      { id: "tree", type: "tree", x: 37, y: 10, w: 1, h: 1, height: 2 },
    ],
    seekers: [
      { id: "s1", type: "grandma", x: 25, y: 8, facing: 180 },
      { id: "s2", type: "uncle", x: 8, y: 9, facing: 0 },
      { id: "s3", type: "dog", x: 10, y: 16, facing: 90 },
    ],
    start: { x: 7, y: 8 },
    home: [1, 21, 3, 2],
    camera: { defaultZoom: 1, minZoom: 0.6, maxZoom: 1.8 },
  });
}

export function makeWorld(level: LevelData, vis?: Record<string, "unknown" | "remembered" | "visible">): WorldState {
  const { w, h } = level.size;
  const blocksMove = new Uint8Array(w * h);
  const blocksSight = new Uint8Array(w * h);
  const roomIndex = new Int16Array(w * h).fill(-1);
  const surface = new Uint8Array(w * h);
  level.rooms.forEach((r, ri) => {
    for (const [rx, ry, rw, rh] of r.rects)
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) roomIndex[y * w + x] = ri;
  });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = level.tiles[y]!.charAt(x);
      const i = y * w + x;
      if (c === "#" || c === "=" || c === "w" || c === "h" || c === " ") blocksMove[i] = 1;
      if (c === "#" || c === "=" || c === "h") blocksSight[i] = 1;
    }
  const objects: ObjectState[] = level.objects.map((def) => ({
    id: def.id,
    def,
    height: def.height ?? 1,
    blocksMove: def.type !== "rug",
    blocksSight: (def.height ?? 1) >= 1.2 || (def.type === "door" && def.state === "closed"),
    state: def.type === "door" ? (def.state ?? "closed") : "static",
  }));
  for (const o of objects)
    if (o.blocksSight) {
      for (let y = Math.floor(o.def.y); y < o.def.y + o.def.h; y++)
        for (let x = Math.floor(o.def.x); x < o.def.x + o.def.w; x++) blocksSight[y * w + x] = 1;
    }
  return {
    level,
    grid: { w, h, blocksMove, blocksSight, roomIndex, surface },
    tick: 0,
    t: 0,
    status: "playing",
    timeLeft: level.timeLimit,
    timerStarted: false,
    player: {
      x: level.start.x, y: level.start.y, px: level.start.x, py: level.start.y,
      facing: 0, gait: "walk", moving: false, radius: 0.3, hidden: false,
    },
    seekers: level.seekers.map((s) => ({
      id: s.id, type: s.type, x: s.x, y: s.y, px: s.x, py: s.y,
      facing: (s.facing * Math.PI) / 180, state: "patrol" as const,
      coneRange: 5, coneAngle: 1.1, detection: 0,
    })),
    objects,
    noise: [],
    roomVis: vis ?? { hall: "visible", bedroom: "remembered", living: "unknown" },
    currentRoom: "hall",
    rngState: 1,
    nextNoiseId: 1,
  };
}
