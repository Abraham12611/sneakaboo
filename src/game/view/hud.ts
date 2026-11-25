/** Screen-space overlays: threat arrows, minimap, vignette. Drawn after the world, inside the letterbox clip. */
import type { LevelData } from "../sim/levelSchema";
import type { WorldState } from "../sim/types";
import { type CanvasFactory, type OffscreenLike } from "./chunks";
import { FOG_VISIBLE, type FogMap, type FogState, fogColor } from "./fog";
import { tileAt } from "./levelStatic";
import type { Projection } from "./projection";
import { type Ctx, roundRectPath, triangle } from "./shapes";
import { type CamPose, worldToLogical } from "./transform";
import { LOGICAL_H, LOGICAL_W, type Viewport } from "./viewport";

export const THREAT_RANGE = 10;
const EDGE_INSET = 38;

export interface ThreatArrow {
  x: number;
  y: number;
  angle: number;
  strength: number;
}

/**
 * Arrow placement in logical px for a seeker, or null when none is needed.
 * Needed when the seeker is within THREAT_RANGE tiles and is hidden by fog or off-screen.
 */
export function threatArrow(
  sx: number,
  sy: number,
  px: number,
  py: number,
  drawn: boolean,
  screenX: number,
  screenY: number,
  out: ThreatArrow,
): boolean {
  const dist = Math.hypot(sx - px, sy - py);
  if (dist > THREAT_RANGE) return false;
  const onScreen = screenX >= 0 && screenX <= LOGICAL_W && screenY >= 0 && screenY <= LOGICAL_H;
  if (drawn && onScreen) return false;
  const dx = screenX - LOGICAL_W / 2;
  const dy = screenY - LOGICAL_H / 2;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return false;
  const k = Math.min((LOGICAL_W / 2 - EDGE_INSET) / Math.max(1e-6, Math.abs(dx)), (LOGICAL_H / 2 - EDGE_INSET) / Math.max(1e-6, Math.abs(dy)));
  out.x = LOGICAL_W / 2 + dx * k;
  out.y = LOGICAL_H / 2 + dy * k;
  out.angle = Math.atan2(dy, dx);
  out.strength = 0.45 + 0.55 * (1 - dist / THREAT_RANGE);
  return true;
}

const arrowTmp: ThreatArrow = { x: 0, y: 0, angle: 0, strength: 0 };
const ptTmp = { x: 0, y: 0 };

export function drawThreatArrows(ctx: Ctx, proj: Projection, cam: CamPose, world: WorldState, fog: FogMap, pip: { x: number; y: number }, alpha: number): void {
  for (const s of world.seekers) {
    const x = s.px + (s.x - s.px) * alpha;
    const y = s.py + (s.y - s.py) * alpha;
    const drawn = fog.at(Math.floor(x), Math.floor(y)) === FOG_VISIBLE;
    worldToLogical(proj, cam, x, y, ptTmp);
    if (!threatArrow(x, y, pip.x, pip.y, drawn, ptTmp.x, ptTmp.y, arrowTmp)) continue;
    ctx.save();
    ctx.translate(arrowTmp.x, arrowTmp.y);
    ctx.rotate(arrowTmp.angle);
    ctx.globalAlpha = arrowTmp.strength;
    triangle(ctx, 16, 0, -10, -11, -10, 11);
    ctx.fillStyle = "#ff4a3a";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------ minimap ------------------------------ */

export const MINI_W = 160;
export const MINI_H = 100;
const MINI_PAD = 5;

export interface MiniLayout {
  ts: number;
  ox: number;
  oy: number;
}
/** Aspect-correct tile size and origin for a level inside the minimap box. */
export function miniLayout(levelW: number, levelH: number): MiniLayout {
  const ts = Math.min((MINI_W - 2 * MINI_PAD) / levelW, (MINI_H - 2 * MINI_PAD) / levelH);
  return { ts, ox: (MINI_W - ts * levelW) / 2, oy: (MINI_H - ts * levelH) / 2 };
}

export class Minimap {
  private canvas: OffscreenLike | null = null;
  private key = "";
  constructor(private factory: CanvasFactory) {}

  invalidate(): void {
    this.key = "";
  }

  private rebuild(level: LevelData, fog: FogMap, roomIndex: Int16Array, dpr: number): void {
    const w = Math.ceil(MINI_W * dpr);
    const h = Math.ceil(MINI_H * dpr);
    if (!this.canvas || this.canvas.width !== w || this.canvas.height !== h) this.canvas = this.factory(w, h);
    const ctx = this.canvas.getContext("2d") as Ctx | null;
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, MINI_W, MINI_H);
    ctx.fillStyle = "rgba(8,10,16,0.82)";
    roundRectPath(ctx, 0, 0, MINI_W, MINI_H, 8);
    ctx.fill();
    const lay = miniLayout(level.size.w, level.size.h);
    for (let y = 0; y < level.size.h; y++) {
      for (let x = 0; x < level.size.w; x++) {
        const c = tileAt(level, x, y);
        if (c === " ") continue;
        const st = fog.at(x, y) as FogState;
        if (st === 0) continue;
        let col: string;
        if (c === "#" || c === "=" || c === "w" || c === "h") col = c === "h" ? "#3f7a3a" : c === "w" ? "#7ab8d8" : "#8a8f98";
        else if (c === ",") col = "#4c7f3e";
        else {
          const ri = roomIndex[y * level.size.w + x] ?? -1;
          col = ri >= 0 ? (level.rooms[ri]?.floorTint ?? "#9a8a74") : "#9a8a74";
        }
        ctx.fillStyle = fogColor(col, st);
        ctx.fillRect(lay.ox + x * lay.ts, lay.oy + y * lay.ts, lay.ts + 0.4, lay.ts + 0.4);
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    roundRectPath(ctx, 0.5, 0.5, MINI_W - 1, MINI_H - 1, 8);
    ctx.stroke();
  }

  /** Draw in CSS px space (ctx must be set to dpr scale). `x`,`y` = top-left of the minimap in CSS px. */
  draw(ctx: Ctx, x: number, y: number, dpr: number, level: LevelData, fog: FogMap, roomIndex: Int16Array, pip: { x: number; y: number }, t: number): void {
    const key = `${level.id}|${fog.version}|${dpr}`;
    if (key !== this.key) {
      this.rebuild(level, fog, roomIndex, dpr);
      this.key = key;
    }
    if (!this.canvas) return;
    ctx.drawImage(this.canvas as CanvasImageSource, x, y, MINI_W, MINI_H);
    const lay = miniLayout(level.size.w, level.size.h);
    const [hx, hy, hw, hh] = level.home;
    ctx.fillStyle = "#46dc78";
    ctx.fillRect(x + lay.ox + hx * lay.ts - 1, y + lay.oy + hy * lay.ts - 1, Math.max(4, hw * lay.ts) + 2, Math.max(4, hh * lay.ts) + 2);
    const pulse = 3.2 + Math.sin(t * 5) * 0.6;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + lay.ox + pip.x * lay.ts, y + lay.oy + pip.y * lay.ts, pulse + 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2c230";
    ctx.beginPath();
    ctx.arc(x + lay.ox + pip.x * lay.ts, y + lay.oy + pip.y * lay.ts, pulse, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Top-left CSS px of the minimap for a viewport (top-right of the letterboxed area). */
export function minimapOrigin(vp: Viewport): { x: number; y: number } {
  return { x: vp.offX + LOGICAL_W * vp.scale - MINI_W - 10, y: vp.offY + 10 };
}
