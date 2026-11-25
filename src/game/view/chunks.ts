/**
 * Static floor layer cached to offscreen canvases per chunk (CHUNK x CHUNK tiles).
 * A chunk is rebuilt only when the projection or the quantised cache scale changes.
 */
import type { ProjectionKind } from "../contracts";
import type { LevelData } from "../sim/levelSchema";
import type { Grid } from "../sim/types";
import { doorwayAxis, tileAt } from "./levelStatic";
import { mixHex, shade } from "./palette";
import type { Projection } from "./projection";

export const CHUNK = 8;
export const CACHE_STEPS = [0.5, 0.75, 1, 1.5, 2] as const;

export type OffscreenLike = HTMLCanvasElement | OffscreenCanvas;
export type CanvasFactory = (w: number, h: number) => OffscreenLike;

/** Smallest cache step that is at least `effectiveScale` (device px per projected px), capped at 2. */
export function cacheScaleStep(effectiveScale: number): number {
  for (const s of CACHE_STEPS) if (s >= effectiveScale - 1e-9) return s;
  return CACHE_STEPS[CACHE_STEPS.length - 1]!;
}

export function chunkKey(cx: number, cy: number, proj: ProjectionKind, step: number): string {
  return `${proj}:${step}:${cx},${cy}`;
}

/** Inclusive chunk range intersecting a tile rect. */
export function chunkRange(tx0: number, ty0: number, tx1: number, ty1: number, w: number, h: number) {
  const clampI = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return {
    cx0: clampI(Math.floor(tx0 / CHUNK), 0, Math.ceil(w / CHUNK) - 1),
    cy0: clampI(Math.floor(ty0 / CHUNK), 0, Math.ceil(h / CHUNK) - 1),
    cx1: clampI(Math.floor(tx1 / CHUNK), 0, Math.ceil(w / CHUNK) - 1),
    cy1: clampI(Math.floor(ty1 / CHUNK), 0, Math.ceil(h / CHUNK) - 1),
  };
}

export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const VOID_COLOR = "#0a0c12";
export const DEFAULT_FLOOR = "#9a8a74";
export const GRASS_BASE = "#5f9a4a";

export class FloorChunks {
  private cache = new Map<string, CanvasImageSource>();
  builds = 0;
  constructor(
    private level: LevelData,
    private grid: Grid,
    private factory: CanvasFactory,
  ) {}

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  /** Drop everything not matching the current projection/step. */
  prune(proj: ProjectionKind, step: number): void {
    const prefix = `${proj}:${step}:`;
    for (const k of this.cache.keys()) if (!k.startsWith(prefix)) this.cache.delete(k);
  }

  get(cx: number, cy: number, proj: Projection, step: number): CanvasImageSource {
    const key = chunkKey(cx, cy, proj.name, step);
    let c = this.cache.get(key);
    if (!c) {
      c = this.build(cx, cy, proj, step);
      this.cache.set(key, c);
      this.builds++;
    }
    return c;
  }

  private build(cx: number, cy: number, proj: Projection, step: number): CanvasImageSource {
    const tx0 = cx * CHUNK;
    const ty0 = cy * CHUNK;
    const w = Math.min(CHUNK, this.level.size.w - tx0);
    const h = Math.min(CHUNK, this.level.size.h - ty0);
    const pw = w * proj.tileScreenW;
    const ph = h * proj.tileScreenH;
    const canvas = this.factory(Math.ceil(pw * step), Math.ceil(ph * step));
    const ctx = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D | null;
    if (!ctx) return canvas as CanvasImageSource;
    ctx.fillStyle = VOID_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(step, step);
    const tw = proj.tileScreenW;
    const th = proj.tileScreenH;
    for (let ty = ty0; ty < ty0 + h; ty++) {
      for (let tx = tx0; tx < tx0 + w; tx++) {
        const c = tileAt(this.level, tx, ty);
        if (c === " ") continue;
        const x = (tx - tx0) * tw;
        const y = (ty - ty0) * th;
        if (c === ",") this.grass(ctx, tx, ty, x, y, tw, th);
        else if (c === ".") this.indoor(ctx, tx, ty, x, y, tw, th);
        else this.indoorUnder(ctx, tx, ty, x, y, tw, th);
        const axis = c === "." ? doorwayAxis(this.level, tx, ty) : null;
        if (axis) this.threshold(ctx, x, y, tw, th, axis === "ew");
      }
    }
    // An ImageBitmap blits much faster than a canvas element (no per-frame snapshot of the source).
    const oc = canvas as OffscreenCanvas;
    return typeof oc.transferToImageBitmap === "function" ? oc.transferToImageBitmap() : canvas;
  }

  private roomTint(tx: number, ty: number): string {
    const ri = this.grid.roomIndex[ty * this.level.size.w + tx] ?? -1;
    return ri >= 0 ? (this.level.rooms[ri]?.floorTint ?? DEFAULT_FLOOR) : DEFAULT_FLOOR;
  }

  /** Floor drawn beneath wall tiles (visible through low walls / window glass edges). */
  private indoorUnder(ctx: CanvasRenderingContext2D, tx: number, ty: number, x: number, y: number, tw: number, th: number): void {
    ctx.fillStyle = shade(this.nearestTint(tx, ty), 0.75);
    ctx.fillRect(x, y, tw + 0.5, th + 0.5);
  }

  private nearestTint(tx: number, ty: number): string {
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const c = tileAt(this.level, tx + dx, ty + dy);
      if (c === ".") return this.roomTint(tx + dx, ty + dy);
      if (c === ",") return GRASS_BASE;
    }
    return DEFAULT_FLOOR;
  }

  private indoor(ctx: CanvasRenderingContext2D, tx: number, ty: number, x: number, y: number, tw: number, th: number): void {
    const ri = this.grid.roomIndex[ty * this.level.size.w + tx] ?? -1;
    const room = ri >= 0 ? this.level.rooms[ri] : undefined;
    const tint = room?.floorTint ?? DEFAULT_FLOOR;
    const surface = room?.surface ?? "wood";
    const n = hash2(tx, ty, 7);
    ctx.fillStyle = shade(tint, 0.97 + n * 0.06);
    ctx.fillRect(x, y, tw + 0.5, th + 0.5);
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    if (surface === "wood" || surface === "creaky") {
      // planks: three horizontal seams, staggered end joints
      for (let i = 1; i < 3; i++) ctx.fillRect(x, y + (th * i) / 3, tw, 1);
      const joint = x + tw * (0.25 + 0.5 * hash2(tx, ty, 3));
      ctx.fillRect(joint, y, 1, th / 3);
      if (surface === "creaky") {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(x + tw * 0.2, y + th * 0.5, 2, 2);
        ctx.fillRect(x + tw * 0.8, y + th * 0.5, 2, 2);
      }
    } else if (surface === "tile") {
      ctx.fillRect(x, y, tw, 1);
      ctx.fillRect(x, y, 1, th);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(x + 3, y + 3, tw - 6, 2);
    } else if (surface === "carpet") {
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 4; i++) ctx.fillRect(x + hash2(tx, ty, 10 + i) * (tw - 3), y + hash2(tx, ty, 20 + i) * (th - 3), 2, 2);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      for (let i = 0; i < 4; i++) ctx.fillRect(x + hash2(tx, ty, 30 + i) * tw, y + hash2(tx, ty, 40 + i) * th, 1.5, 1.5);
    }
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(x, y + th - 1, tw, 1);
    ctx.fillRect(x + tw - 1, y, 1, th);
  }

  private grass(ctx: CanvasRenderingContext2D, tx: number, ty: number, x: number, y: number, tw: number, th: number): void {
    const n = hash2(tx, ty, 1);
    ctx.fillStyle = shade(GRASS_BASE, 0.93 + n * 0.14);
    ctx.fillRect(x, y, tw + 0.5, th + 0.5);
    // blades
    ctx.fillStyle = shade(GRASS_BASE, 0.82);
    for (let i = 0; i < 5; i++) {
      const bx = x + hash2(tx, ty, 50 + i) * (tw - 3);
      const by = y + hash2(tx, ty, 60 + i) * (th - 5) + 3;
      ctx.fillRect(bx, by, 1.5, 4);
    }
    ctx.fillStyle = shade(GRASS_BASE, 1.18);
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + hash2(tx, ty, 70 + i) * (tw - 3), y + hash2(tx, ty, 80 + i) * (th - 4), 1.5, 3);
    }
    if (hash2(tx, ty, 99) > 0.93) {
      ctx.fillStyle = hash2(tx, ty, 98) > 0.5 ? "#f4e27a" : "#f6f0f0";
      ctx.fillRect(x + tw * 0.4, y + th * 0.45, 3, 3);
    }
  }

  private threshold(ctx: CanvasRenderingContext2D, x: number, y: number, tw: number, th: number, vertical: boolean): void {
    ctx.fillStyle = mixHex("#b08a58", "#d9bf8a", 0.4);
    if (vertical) ctx.fillRect(x + tw * 0.1, y, tw * 0.8, th);
    else ctx.fillRect(x, y + th * 0.1, tw, th * 0.8);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    if (vertical) {
      ctx.fillRect(x + tw * 0.1, y, 1.5, th);
      ctx.fillRect(x + tw * 0.9 - 1.5, y, 1.5, th);
    } else {
      ctx.fillRect(x, y + th * 0.1, tw, 1.5);
      ctx.fillRect(x, y + th * 0.9 - 1.5, tw, 1.5);
    }
  }
}
