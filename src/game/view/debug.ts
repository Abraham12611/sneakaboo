/** Debug overlay. Nothing here runs unless `setDebug(true)`. */
import type { CanvasFactory, OffscreenLike } from "./chunks";
import type { Env } from "./env";
import { type Ctx, ellipse } from "./shapes";

export interface DebugStats {
  fps: number;
  frameMs: number;
  drawOps: number;
  projection: string;
  zoom: number;
  items: number;
  chunks: number;
  chunkBuilds: number;
}

/** Tile grid, collision tint, sight blockers, room ids, noise radii over the visible range. In projected px space. */
export function drawDebugWorld(env: Env): void {
  const { proj, level, view } = env;
  const tw = proj.tileScreenW;
  const th = proj.tileScreenH;
  debugWorldStatic(
    env,
    Math.max(0, Math.floor(view.x0 / tw)),
    Math.max(0, Math.floor(view.y0 / th)),
    Math.min(level.size.w, Math.ceil(view.x1 / tw)),
    Math.min(level.size.h, Math.ceil(view.y1 / th)),
  );
  drawDebugNoise(env);
}

/** The static part of the debug overlay for tiles [x0, x1) x [y0, y1) (cacheable: changes with fog and doors). */
export function debugWorldStatic(env: Env, x0: number, y0: number, x1: number, y1: number): void {
  const { ctx, proj, level, world } = env;
  const tw = proj.tileScreenW;
  const th = proj.tileScreenH;
  const g = world.grid;
  ctx.fillStyle = "rgba(255,40,40,0.2)";
  ctx.beginPath();
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (g.blocksMove[y * g.w + x]) ctx.rect(proj.px(x), proj.py(y), tw, th);
  ctx.fill();
  ctx.strokeStyle = "rgba(60,160,255,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (g.blocksSight[y * g.w + x]) ctx.rect(proj.px(x) + 3, proj.py(y) + 3, tw - 6, th - 6);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = x0; x <= x1; x++) {
    ctx.moveTo(proj.px(x), proj.py(y0));
    ctx.lineTo(proj.px(x), proj.py(y1));
  }
  for (let y = y0; y <= y1; y++) {
    ctx.moveTo(proj.px(x0), proj.py(y));
    ctx.lineTo(proj.px(x1), proj.py(y));
  }
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  for (const r of level.rooms) {
    const rc = r.rects[0]!;
    ctx.fillText(`${r.id} (${world.roomVis[r.id] ?? "unknown"})`, proj.px(rc[0] + rc[2] / 2), proj.py(rc[1] + 0.6));
  }
  ctx.textAlign = "start";
}

/** Noise radii (dynamic part of the debug overlay). */
export function drawDebugNoise(env: Env): void {
  const { ctx, proj, world } = env;
  if (world.noise.length === 0) return;
  ctx.strokeStyle = "rgba(255,200,60,0.8)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  for (const n of world.noise) {
    ellipse(ctx, proj.px(n.x), proj.py(n.y), n.radius * proj.tileScreenW, n.radius * proj.tileScreenH);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}
export function drawDebugText(ctx: Ctx, x: number, y: number, s: DebugStats): void {
  const lines = [
    `FPS ${s.fps.toFixed(0)}  frame ${s.frameMs.toFixed(2)} ms`,
    `proj ${s.projection}  zoom ${s.zoom.toFixed(2)}`,
    `draw ops ${s.drawOps}  items ${s.items}`,
    `chunks ${s.chunks} (builds ${s.chunkBuilds})`,
  ];
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(x, y, TEXT_W, lines.length * 16 + 8);
  ctx.fillStyle = "#9dffb0";
  ctx.font = "12px monospace";
  ctx.textBaseline = "top";
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i]!, x + 6, y + 5 + i * 16);
  ctx.textBaseline = "alphabetic";
}

const TEXT_W = 230;
const TEXT_H = 4 * 16 + 8;

/** The debug text block painted into a small bitmap and refreshed 4 times a second (text is expensive to draw). */
export class DebugTextCache {
  private canvas: OffscreenLike | null = null;
  private img: CanvasImageSource | null = null;
  private last = -Infinity;
  private dpr = 0;
  constructor(private readonly factory: CanvasFactory) {}

  /** `ctx` in CSS px (dpr transform); `now` in ms. */
  draw(ctx: Ctx, x: number, y: number, s: DebugStats, now: number, dpr: number): void {
    if (!this.img || now - this.last >= 250 || now < this.last || dpr !== this.dpr) {
      const pw = Math.ceil(TEXT_W * dpr);
      const ph = Math.ceil(TEXT_H * dpr);
      if (!this.canvas || this.canvas.width !== pw || this.canvas.height !== ph) this.canvas = this.factory(pw, ph);
      const c = this.canvas.getContext("2d") as Ctx | null;
      if (!c) return;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, pw, ph);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawDebugText(c, 0, 0, s);
      const oc = this.canvas as OffscreenCanvas;
      (this.img as { close?: () => void } | null)?.close?.();
      this.img = typeof oc.transferToImageBitmap === "function" ? oc.transferToImageBitmap() : (this.canvas as CanvasImageSource);
      this.last = now;
      this.dpr = dpr;
    }
    ctx.drawImage(this.img, x, y, TEXT_W, TEXT_H);
  }
}

const COUNTED = new Set(["fill", "stroke", "fillRect", "strokeRect", "drawImage", "fillText", "strokeText", "clearRect"]);

/** Wraps a context in a Proxy that counts draw calls. Only used while debug is on. */
export function countingContext(ctx: Ctx, counter: { ops: number }): Ctx {
  const wrappers = new Map<string | symbol, unknown>();
  return new Proxy(ctx, {
    get(target, prop) {
      const v = Reflect.get(target, prop, target) as unknown;
      if (typeof v !== "function") return v;
      let w = wrappers.get(prop);
      if (!w) {
        const counted = typeof prop === "string" && COUNTED.has(prop);
        w = (...args: unknown[]) => {
          if (counted) counter.ops++;
          return (v as (...a: unknown[]) => unknown).apply(target, args);
        };
        wrappers.set(prop, w);
      }
      return w;
    },
    set(target, prop, value) {
      return Reflect.set(target, prop, value, target);
    },
  });
}
