/** Debug overlay. Nothing here runs unless `setDebug(true)`. */
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

/** Tile grid, collision tint, sight blockers, room ids, noise radii. In projected px space. */
export function drawDebugWorld(env: Env): void {
  const { ctx, proj, level, world, view } = env;
  const tw = proj.tileScreenW;
  const th = proj.tileScreenH;
  const x0 = Math.max(0, Math.floor(view.x0 / tw));
  const x1 = Math.min(level.size.w, Math.ceil(view.x1 / tw));
  const y0 = Math.max(0, Math.floor(view.y0 / th));
  const y1 = Math.min(level.size.h, Math.ceil(view.y1 / th));
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
  ctx.strokeStyle = "rgba(255,200,60,0.8)";
  ctx.setLineDash([6, 6]);
  for (const n of world.noise) {
    ellipse(ctx, proj.px(n.x), proj.py(n.y), n.radius * tw, n.radius * th);
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
  ctx.fillRect(x, y, 230, lines.length * 16 + 8);
  ctx.fillStyle = "#9dffb0";
  ctx.font = "12px monospace";
  ctx.textBaseline = "top";
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i]!, x + 6, y + 5 + i * 16);
  ctx.textBaseline = "alphabetic";
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
