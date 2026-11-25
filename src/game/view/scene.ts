/** Y-sorted "standing" layer: walls, objects, doors, Pip and seekers, plus occlusion fade. */
import type { LevelData } from "../sim/levelSchema";
import type { ObjectState } from "../sim/types";
import { characterBounds, drawPip, drawSeeker, drawSilhouette, seekerLook } from "./characters";
import type { Env } from "./env";
import { lerp } from "./env";
import { type FogState, fogColor, FOG_VISIBLE } from "./fog";
import { buildWallRuns, TALL_WALL, type WallRun, wallHeightAt } from "./levelStatic";
import { OCCLUDE_RADIUS, occlusionTarget, rectsOverlap, tweenAlpha } from "./occlusion";
import { shade } from "./palette";
import { type Ctx, drawBox, ellipse, roundRectPath } from "./shapes";

const K_WALL = 0;
const K_OBJ = 1;
const K_DOOR = 2;
const K_SEEKER = 3;
const K_PLAYER = 4;

interface Item {
  kind: number;
  base: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  idx: number;
  tx: number;
  ty: number;
  len: number;
  state: FogState;
  alpha: number;
  x: number;
  y: number;
  moving: boolean;
}
const newItem = (): Item => ({ kind: 0, base: 0, x0: 0, y0: 0, x1: 0, y1: 0, idx: 0, tx: 0, ty: 0, len: 0, state: FOG_VISIBLE, alpha: 1, x: 0, y: 0, moving: false });

export const OBJECT_COLORS: Record<string, string> = {
  bed: "#6f9bd6", wardrobe: "#7b5a3c", closet: "#8b6b4a", sofa: "#b5587e", armchair: "#a6506f", chair: "#a67c52",
  table: "#a97b4f", table_cloth: "#d9d3c0", desk: "#8f6a45", nightstand: "#8a6a4c", dresser: "#946f4b",
  bookshelf: "#6d4c33", fridge: "#dfe6ea", counter: "#c9c2b4", stove: "#8d9399", sink: "#b9c9d3", tub: "#e8eef2",
  toilet: "#f1f1f1", plant: "#3f8f4a", rug: "#b24a4a", chest: "#8a5a2b", box: "#b08a58", crate: "#a67c3d",
  barrel: "#7d5a35", painting: "#c9a34a", lamp: "#f0d98a", tv_unit: "#38404a", piano: "#26262c", car: "#5a7fb0",
  bench: "#8f7050", tree: "#2f7a3a", shed: "#9a6a43", door: "#8a5a35", other: "#a08060",
};
export const objectColor = (o: ObjectState): string => o.def.color ?? OBJECT_COLORS[o.def.type] ?? "#a08060";

const WALL_COLORS = {
  wall: { top: "#e2d8c8", face: "#a89a86", flat: "#5d5549" },
  partition: { top: "#d2bd9c", face: "#9a8468", flat: "#8a7a62" },
  window: { top: "#e2d8c8", face: "#a89a86", flat: "#7fc4e8" },
  hedge: { top: "#58a84d", face: "#33743a", flat: "#3f8a3f" },
} as const;

export class Scene {
  private items: Item[] = [];
  private sortBuf: Item[] = [];
  private count = 0;
  private runs: WallRun[] = [];
  private wallFade: Float32Array = new Float32Array(0);
  private active = new Set<number>();
  private objFade = new Map<string, number>();
  private seekerOcc = new Map<string, number>();
  private pipOcc = 0;
  private level: LevelData | null = null;
  private tmpTargets = new Map<number, number>();
  /** Draw statistics for the debug overlay and benchmarks. */
  stats = { items: 0, wallSegs: 0 };

  setLevel(level: LevelData): void {
    this.level = level;
    this.runs = buildWallRuns(level);
    this.wallFade = new Float32Array(level.size.w * level.size.h).fill(1);
    this.active.clear();
    this.objFade.clear();
    this.seekerOcc.clear();
    this.pipOcc = 0;
  }

  get wallRunCount(): number {
    return this.runs.length;
  }

  /** 0..1 amount of cover currently over the player (drives his outline). */
  get playerCover(): number {
    return this.pipOcc;
  }

  private nextItem(): Item {
    let it = this.items[this.count];
    if (!it) {
      it = newItem();
      this.items[this.count] = it;
    }
    this.count++;
    return it;
  }

  /** Update fade tweens for things in front of the player. Oblique only. */
  updateOcclusion(env: Env, dt: number): void {
    const { proj, level, world } = env;
    if (!this.level) return;
    const px = env.pip.x;
    const py = env.pip.y;
    let minAlpha = 1;
    if (proj.heightPx === 0) {
      for (const k of this.active) this.wallFade[k] = 1;
      this.active.clear();
      this.objFade.clear();
      this.pipOcc = 0;
      return;
    }
    const T = proj.tileScreenW;
    const u = T / 64;
    const pr = { x0: proj.px(px) - 17 * u, x1: proj.px(px) + 17 * u, y0: proj.py(py) - 58 * u, y1: proj.py(py) + 4 * u };
    // wall tiles in front of the player
    const targets = this.tmpTargets;
    targets.clear();
    const w = level.size.w;
    const bx0 = Math.max(0, Math.floor(px - OCCLUDE_RADIUS - 1));
    const bx1 = Math.min(w - 1, Math.ceil(px + OCCLUDE_RADIUS + 1));
    const by0 = Math.max(0, Math.floor(py));
    const by1 = Math.min(level.size.h - 1, Math.ceil(py + OCCLUDE_RADIUS + 1));
    const tr = { x0: 0, y0: 0, x1: 0, y1: 0 };
    for (let ty = by0; ty <= by1; ty++) {
      for (let tx = bx0; tx <= bx1; tx++) {
        const h = wallHeightAt(level, tx, ty);
        if (h <= 0) continue;
        tr.x0 = proj.px(tx);
        tr.x1 = proj.px(tx + 1);
        tr.y0 = proj.py(ty, h);
        tr.y1 = proj.py(ty + 1, 0);
        const nx = Math.max(tx, Math.min(px, tx + 1));
        const ny = Math.max(ty, Math.min(py, ty + 1));
        const dist = Math.hypot(nx - px, ny - py);
        targets.set(ty * w + tx, occlusionTarget(dist, ty + 1 > py, rectsOverlap(tr, pr)));
      }
    }
    for (const k of this.active) if (!targets.has(k)) targets.set(k, 1);
    for (const [k, tgt] of targets) {
      const cur = this.wallFade[k] ?? 1;
      const v = tweenAlpha(cur, tgt, dt);
      this.wallFade[k] = v;
      if (v < 1) {
        this.active.add(k);
        if (v < minAlpha) minAlpha = v;
      } else this.active.delete(k);
    }
    // objects
    for (const o of world.objects) {
      const hgt = o.height;
      if (hgt <= 0.02) continue;
      const d = o.def;
      const orect = { x0: proj.px(d.x), x1: proj.px(d.x + d.w), y0: proj.py(d.y, hgt), y1: proj.py(d.y + d.h, 0) };
      const nx = Math.max(d.x, Math.min(px, d.x + d.w));
      const ny = Math.max(d.y, Math.min(py, d.y + d.h));
      const dist = Math.hypot(nx - px, ny - py);
      const tgt = occlusionTarget(dist, d.y + d.h > py, rectsOverlap(orect, pr));
      const cur = this.objFade.get(o.id) ?? 1;
      const v = tweenAlpha(cur, tgt, dt);
      this.objFade.set(o.id, v);
      if (v < minAlpha) minAlpha = v;
    }
    const cover = (1 - minAlpha) / 0.65;
    this.pipOcc = Math.max(0, Math.min(1, cover));
  }

  /** Collect, sort and draw all standing things. */
  draw(env: Env, dt: number): void {
    const { ctx, proj, world, level, fog, view } = env;
    this.count = 0;
    this.stats.wallSegs = 0;
    const T = proj.tileScreenW;
    const w = level.size.w;
    // walls
    const tx0 = Math.max(0, Math.floor(view.x0 / T) - 1);
    const tx1 = Math.min(w - 1, Math.ceil(view.x1 / T) + 1);
    for (let ri = 0; ri < this.runs.length; ri++) {
      const run = this.runs[ri]!;
      const rx0 = proj.px(run.x);
      const rx1 = proj.px(run.x + run.len);
      const ry0 = proj.py(run.y, run.height);
      const ry1 = proj.py(run.y + 1, 0);
      if (rx1 < view.x0 || rx0 > view.x1 || ry1 < view.y0 || ry0 > view.y1) continue;
      const a = Math.max(run.x, tx0);
      const b = Math.min(run.x + run.len - 1, tx1);
      let s = a;
      while (s <= b) {
        const st = fog.at(s, run.y);
        const fd = this.active.size ? (this.wallFade[run.y * w + s] ?? 1) : 1;
        let e = s;
        while (e + 1 <= b && fog.at(e + 1, run.y) === st && (this.active.size ? (this.wallFade[run.y * w + e + 1] ?? 1) : 1) === fd) e++;
        const it = this.nextItem();
        it.kind = K_WALL;
        it.base = run.y + 1;
        it.x0 = proj.px(s);
        it.x1 = proj.px(e + 1);
        it.y0 = ry0;
        it.y1 = ry1;
        it.idx = ri;
        it.tx = s;
        it.ty = run.y;
        it.len = e - s + 1;
        it.state = st;
        it.alpha = fd;
        this.stats.wallSegs++;
        s = e + 1;
      }
    }
    // objects and doors
    for (let i = 0; i < world.objects.length; i++) {
      const o = world.objects[i]!;
      const d = o.def;
      if (o.height <= 0.02 && d.type !== "door") continue; // rugs: floor layer
      const isDoor = d.type === "door";
      const hgt = isDoor && o.state === "open" ? Math.max(o.height, 1.4) : o.height;
      const extra = d.type === "tree" ? Math.max(d.w, d.h) * 0.9 : 0;
      const x0 = proj.px(d.x) - extra * T * 0.2;
      const x1 = proj.px(d.x + d.w) + extra * T * 0.2;
      const y0 = proj.py(d.y, hgt) - extra * T;
      const y1 = proj.py(d.y + d.h, 0);
      if (x1 < view.x0 || x0 > view.x1 || y1 < view.y0 || y0 > view.y1) continue;
      const it = this.nextItem();
      it.kind = isDoor ? K_DOOR : K_OBJ;
      it.base = d.y + d.h;
      it.x0 = x0;
      it.x1 = x1;
      it.y0 = y0;
      it.y1 = y1;
      it.idx = i;
      it.state = fog.at(Math.floor(d.x + d.w / 2), Math.floor(d.y + d.h / 2));
      it.alpha = this.objFade.get(o.id) ?? 1;
    }
    // seekers (only in visible tiles)
    const rect = { x0: 0, y0: 0, x1: 0, y1: 0 };
    for (let i = 0; i < world.seekers.length; i++) {
      const s = world.seekers[i]!;
      const x = lerp(s.px, s.x, env.alpha);
      const y = lerp(s.py, s.y, env.alpha);
      if (fog.at(Math.floor(x), Math.floor(y)) !== FOG_VISIBLE) continue;
      const fx = proj.px(x);
      const fy = proj.py(y);
      characterBounds(proj, fx, fy, seekerLook(s.type).scale, rect);
      if (rect.x1 < view.x0 || rect.x0 > view.x1 || rect.y1 < view.y0 || rect.y0 > view.y1) continue;
      const it = this.nextItem();
      it.kind = K_SEEKER;
      it.base = y;
      it.x0 = rect.x0;
      it.y0 = rect.y0;
      it.x1 = rect.x1;
      it.y1 = rect.y1;
      it.idx = i;
      it.x = x;
      it.y = y;
      it.moving = Math.hypot(s.x - s.px, s.y - s.py) > 0.0005;
      it.state = FOG_VISIBLE;
      it.alpha = 1;
    }
    // player
    {
      const fx = proj.px(env.pip.x);
      const fy = proj.py(env.pip.y);
      characterBounds(proj, fx, fy, 1, rect);
      const it = this.nextItem();
      it.kind = K_PLAYER;
      it.base = env.pip.y;
      it.x0 = rect.x0;
      it.y0 = rect.y0;
      it.x1 = rect.x1;
      it.y1 = rect.y1;
      it.idx = 0;
      it.x = env.pip.x;
      it.y = env.pip.y;
      it.moving = world.player.moving;
      it.state = FOG_VISIBLE;
      it.alpha = 1;
    }
    const list = this.sortBuf;
    list.length = this.count;
    for (let i = 0; i < this.count; i++) list[i] = this.items[i]!;
    list.sort((a, b) => a.base - b.base || a.kind - b.kind);
    this.stats.items = this.count;
    for (let i = 0; i < this.count; i++) {
      const it = list[i]!;
      const ia = it.alpha;
      if (ia < 0.999) ctx.globalAlpha = ia;
      switch (it.kind) {
        case K_WALL:
          this.drawWall(env, this.runs[it.idx]!, it.tx, it.len, it.state);
          break;
        case K_OBJ:
          drawObject(env, world.objects[it.idx]!, it.state);
          break;
        case K_DOOR:
          drawDoor(env, world.objects[it.idx]!, it.state);
          break;
        case K_SEEKER: {
          const s = world.seekers[it.idx]!;
          drawSeeker(ctx, proj, proj.px(it.x), proj.py(it.y), s.type, s.facing, it.moving, s.state === "sleep", env.t);
          break;
        }
        default:
          drawPip(ctx, proj, proj.px(it.x), proj.py(it.y), world.player.facing, it.moving, world.player.gait, env.t);
      }
      if (ia < 0.999) ctx.globalAlpha = 1;
    }
    // outlines for covered characters
    for (let i = 0; i < this.count; i++) {
      const it = list[i]!;
      if (it.kind !== K_SEEKER && it.kind !== K_PLAYER) continue;
      let cover: number;
      if (it.kind === K_PLAYER) cover = this.pipOcc;
      else {
        const id = world.seekers[it.idx]!.id;
        let covered = 0;
        for (let j = i + 1; j < this.count; j++) {
          const o = list[j]!;
          if (o.kind > K_DOOR || o.base <= it.base) continue;
          if (rectsOverlap(o, it)) {
            covered = 1;
            break;
          }
        }
        const cur = this.seekerOcc.get(id) ?? 0;
        cover = cur + (covered - cur) * (1 - Math.exp(-dt / 0.07));
        this.seekerOcc.set(id, cover);
      }
      if (cover > 0.05 && proj.heightPx > 0) {
        const scale = it.kind === K_SEEKER ? seekerLook(world.seekers[it.idx]!.type).scale : 1;
        drawSilhouette(ctx, proj, proj.px(it.x), proj.py(it.y), scale, Math.min(0.85, cover));
      }
    }
  }

  private drawWall(env: Env, run: WallRun, tx: number, len: number, state: FogState): void {
    const { ctx, proj } = env;
    const pal = WALL_COLORS[run.kind];
    const T = proj.tileScreenW;
    if (proj.heightPx === 0) {
      drawBox(ctx, proj, tx, run.y, len, 1, 0, fogColor(pal.flat, state), fogColor(pal.flat, state));
      return;
    }
    const h = run.height;
    const top = fogColor(pal.top, state);
    const face = fogColor(pal.face, state);
    if (run.kind === "hedge") {
      const x0 = proj.px(tx) + 2;
      const yTop = proj.py(run.y, h);
      const yBase = proj.py(run.y + 1, 0);
      ctx.fillStyle = face;
      roundRectPath(ctx, x0, yTop, len * T - 4, yBase - yTop, 0.22 * T);
      ctx.fill();
      ctx.fillStyle = top;
      roundRectPath(ctx, x0, yTop, len * T - 4, (yBase - yTop) * 0.55, 0.22 * T);
      ctx.fill();
      ctx.fillStyle = fogColor(shade(pal.face, 0.8), state);
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const gx = proj.px(tx + i);
        ctx.rect(gx + 0.22 * T, yTop + 0.1 * T, 3, 3);
        ctx.rect(gx + 0.62 * T, yTop + 0.3 * T, 3, 3);
        ctx.rect(gx + 0.4 * T, yBase - 0.2 * T, 3, 3);
      }
      ctx.fill();
      return;
    }
    drawBox(ctx, proj, tx, run.y, len, 1, h, top, face);
    const x0 = proj.px(tx);
    const w = len * T;
    const yFront = proj.py(run.y + 1, h);
    const yBase = proj.py(run.y + 1, 0);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x0, yFront - 1.5, w, 1.5);
    if (h >= 1) {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x0, yBase - 0.12 * T, w, 0.12 * T);
    }
    if (run.kind === "window") {
      ctx.fillStyle = fogColor("#8fd0f0", state);
      if (h >= 1) {
        const fh = yBase - yFront;
        ctx.fillRect(x0 + 0.1 * T, yFront + fh * 0.2, w - 0.2 * T, fh * 0.5);
        ctx.fillStyle = fogColor("#d8f2ff", state);
        ctx.fillRect(x0 + 0.1 * T, yFront + fh * 0.2, w - 0.2 * T, fh * 0.1);
        ctx.fillStyle = fogColor("#cfc3b0", state);
        for (let i = 0; i <= len; i++) ctx.fillRect(proj.px(tx + i) - (i === 0 ? -0.06 * T : i === len ? 0.16 * T : 0.05 * T), yFront + fh * 0.2, 0.1 * T, fh * 0.5);
      } else {
        ctx.fillRect(x0 + 0.1 * T, proj.py(run.y, h) + 0.15 * T, w - 0.2 * T, proj.py(run.y + 1, h) - proj.py(run.y, h) - 0.3 * T);
      }
    } else if (run.kind === "wall" && h >= TALL_WALL - 0.01) {
      // faint brick/panel seam every tile on the tall face
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      for (let i = 1; i < len; i++) ctx.fillRect(proj.px(tx + i), yFront, 1, yBase - yFront);
    }
  }
}

/* ------------------------------ objects ------------------------------ */

export function drawObject(env: Env, o: ObjectState, state: FogState): void {
  const { ctx, proj } = env;
  const d = o.def;
  const base = objectColor(o);
  const top = fogColor(shade(base, 1.14), state);
  const face = fogColor(shade(base, 0.76), state);
  const T = proj.tileScreenW;
  const h = o.height;
  const ob = proj.heightPx > 0;
  // soft contact shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(proj.px(d.x) - 2, proj.py(d.y + d.h) - 3, d.w * T + 4, 6);
  if (d.type === "tree") {
    const cx = proj.px(d.x + d.w / 2);
    const trunkTop = proj.py(d.y + d.h / 2, 0.9);
    ctx.fillStyle = fogColor("#6b4a2b", state);
    ctx.fillRect(cx - 0.1 * T, trunkTop, 0.2 * T, proj.py(d.y + d.h * 0.7, 0) - trunkTop);
    const r = Math.max(d.w, d.h) * T * 0.8;
    const cy = proj.py(d.y + d.h / 2, Math.max(h, 1.4));
    ctx.fillStyle = face;
    ellipse(ctx, cx, cy + 0.12 * r, r, r * 0.9);
    ctx.fill();
    ctx.fillStyle = top;
    ellipse(ctx, cx - 0.08 * r, cy - 0.1 * r, r * 0.85, r * 0.75);
    ctx.fill();
    return;
  }
  if (d.type === "plant" || d.type === "barrel" || d.type === "lamp") {
    const cx = proj.px(d.x + d.w / 2);
    const r = (Math.min(d.w, d.h) * T) / 2;
    const yb = proj.py(d.y + d.h, 0);
    const pot = fogColor(d.type === "plant" ? "#a5603a" : shade(base, 0.7), state);
    if (!ob) {
      ctx.fillStyle = face;
      ellipse(ctx, cx, proj.py(d.y + d.h / 2), r, r);
      ctx.fill();
      ctx.fillStyle = top;
      ellipse(ctx, cx, proj.py(d.y + d.h / 2), r * 0.7, r * 0.7);
      ctx.fill();
      return;
    }
    const topY = proj.py(d.y + d.h / 2, h);
    ctx.fillStyle = d.type === "plant" ? pot : face;
    ctx.fillRect(cx - r, topY, r * 2, yb - r * 0.3 - topY);
    ellipse(ctx, cx, yb - r * 0.3, r, r * 0.45);
    ctx.fill();
    ctx.fillStyle = d.type === "plant" ? fogColor("#3f9a4c", state) : top;
    ellipse(ctx, cx, topY - (d.type === "plant" ? r * 0.7 : 0), d.type === "plant" ? r * 1.3 : r, d.type === "plant" ? r * 1.1 : r * 0.45);
    ctx.fill();
    return;
  }
  drawBox(ctx, proj, d.x, d.y, d.w, d.h, h, top, face);
  const x0 = proj.px(d.x);
  const w = d.w * T;
  const yTop0 = proj.py(d.y, h);
  const yTop1 = proj.py(d.y + d.h, h);
  const yBase = proj.py(d.y + d.h, 0);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(x0, yTop1 - 1.5, w, 1.5);
  switch (d.type) {
    case "bed":
      ctx.fillStyle = fogColor("#f2f2ee", state);
      if (d.w >= d.h) ctx.fillRect(x0 + 0.08 * T, yTop0 + 0.12 * (yTop1 - yTop0), 0.4 * T, (yTop1 - yTop0) * 0.76);
      else ctx.fillRect(x0 + 0.1 * w, yTop0 + 0.06 * (yTop1 - yTop0), w * 0.8, 0.28 * (yTop1 - yTop0));
      break;
    case "wardrobe":
    case "closet":
    case "dresser":
    case "fridge":
    case "bookshelf":
      if (ob && yBase > yTop1) {
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(x0 + w / 2 - 0.75, yTop1 + 3, 1.5, yBase - yTop1 - 5);
        ctx.fillStyle = fogColor("#e9d9a0", state);
        ctx.fillRect(x0 + w / 2 - 6, yTop1 + (yBase - yTop1) * 0.5, 3, 6);
        ctx.fillRect(x0 + w / 2 + 3, yTop1 + (yBase - yTop1) * 0.5, 3, 6);
      }
      break;
    case "sofa":
    case "armchair":
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(x0, yTop0, w, (yTop1 - yTop0) * 0.35);
      break;
    case "table":
    case "table_cloth":
    case "desk":
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(x0 + 4, yTop0 + 4, w - 8, (yTop1 - yTop0) * 0.3);
      break;
    default:
      break;
  }
}

export function drawRug(env: Env, o: ObjectState, state: FogState): void {
  const { ctx, proj } = env;
  const d = o.def;
  const base = objectColor(o);
  const x = proj.px(d.x);
  const y = proj.py(d.y);
  const w = d.w * proj.tileScreenW;
  const h = d.h * proj.tileScreenH;
  ctx.fillStyle = fogColor(shade(base, 0.85), state);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fogColor(base, state);
  ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
  ctx.fillStyle = fogColor(shade(base, 1.25), state);
  ctx.fillRect(x + 11, y + 11, w - 22, 2);
  ctx.fillRect(x + 11, y + h - 13, w - 22, 2);
}

export function drawDoor(env: Env, o: ObjectState, state: FogState): void {
  const { ctx, proj } = env;
  const d = o.def;
  const T = proj.tileScreenW;
  const base = objectColor(o);
  const hgt = Math.max(o.height, 1.4);
  const alongX = d.w >= d.h;
  if (o.state === "open") {
    const post = 0.12;
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(proj.px(d.x), proj.py(d.y + d.h) - 3, d.w * T, 5);
    const frame = fogColor(shade(base, 0.9), state);
    const topC = fogColor(shade(base, 1.2), state);
    if (alongX) {
      drawBox(ctx, proj, d.x, d.y, post, d.h, hgt, topC, frame);
      drawBox(ctx, proj, d.x + d.w - post, d.y, post, d.h, hgt, topC, frame);
    } else {
      drawBox(ctx, proj, d.x, d.y, d.w, post, hgt, topC, frame);
      drawBox(ctx, proj, d.x, d.y + d.h - post, d.w, post, hgt, topC, frame);
    }
    if (proj.heightPx > 0) {
      ctx.fillStyle = topC;
      ctx.fillRect(proj.px(d.x), proj.py(d.y + d.h, hgt) - 0.1 * T, d.w * T, 0.1 * T);
    }
    return;
  }
  const top = fogColor(shade(base, 1.15), state);
  const face = fogColor(shade(base, 0.8), state);
  drawBox(ctx, proj, d.x, d.y, d.w, d.h, hgt, top, face);
  if (proj.heightPx > 0) {
    const yTop1 = proj.py(d.y + d.h, hgt);
    const yBase = proj.py(d.y + d.h, 0);
    ctx.fillStyle = fogColor("#f1d98a", state);
    ctx.fillRect(proj.px(d.x + d.w) - 0.2 * T, yTop1 + (yBase - yTop1) * 0.5, 5, 5);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(proj.px(d.x) + 4, yTop1 + 5, d.w * T - 8, (yBase - yTop1) * 0.4);
  }
}

export type { Ctx };
