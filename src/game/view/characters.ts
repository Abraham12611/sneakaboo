/** Procedural greybox characters: Pip (yellow hoodie) and seekers. Feet are at (fx, fy) in projected px. */
import type { Gait } from "../sim/types";
import { shade } from "./palette";
import type { Projection } from "./projection";
import { type Ctx, ellipse, roundRectPath, triangle } from "./shapes";

export const PIP_YELLOW = "#f2c230";
export const PIP_HOOD = "#d9a91c";
const SKIN = "#f0c9a0";
const PANTS = "#3b4a6b";

const GAIT_RATE: Record<Gait, number> = { sneak: 6, walk: 10, run: 15 };

interface SeekerLook {
  body: string;
  hair: string;
  scale: number;
}
const SEEKER_LOOK: Record<string, SeekerLook> = {
  grandma: { body: "#8e5fb0", hair: "#cfcfd6", scale: 0.9 },
  uncle: { body: "#3b7dd8", hair: "#4a3322", scale: 1.1 },
  twin: { body: "#e07ab0", hair: "#e2b23c", scale: 0.85 },
  dog: { body: "#a9743c", hair: "#6e4720", scale: 1 },
  sprinter: { body: "#e8603c", hair: "#2a2a2a", scale: 1 },
  watcher: { body: "#3a3f4c", hair: "#1d1d22", scale: 1.15 },
  guard: { body: "#2f5d8a", hair: "#2a2a2a", scale: 1.1 },
  other: { body: "#7a7f8a", hair: "#3a2a1a", scale: 1 },
};
export const seekerLook = (type: string): SeekerLook => SEEKER_LOOK[type] ?? SEEKER_LOOK["other"]!;

export interface CharRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Screen bounds (projected px) of a standing character with feet at (fx, fy). */
export function characterBounds(proj: Projection, fx: number, fy: number, scale = 1, out?: CharRect): CharRect {
  const u = proj.tileScreenW / 64;
  const r = out ?? { x0: 0, y0: 0, x1: 0, y1: 0 };
  const height = proj.heightPx > 0 ? 58 * u * scale : 20 * u * scale;
  const half = (proj.heightPx > 0 ? 17 : 20) * u * scale;
  r.x0 = fx - half;
  r.x1 = fx + half;
  r.y0 = proj.heightPx > 0 ? fy - height : fy - half;
  r.y1 = fy + (proj.heightPx > 0 ? 4 * u : half);
  return r;
}

function shadow(ctx: Ctx, fx: number, fy: number, u: number, s: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ellipse(ctx, fx, fy + 2 * u, 19 * u * s, 7.5 * u * s);
  ctx.fill();
}

export function drawPip(
  ctx: Ctx,
  proj: Projection,
  fx: number,
  fy: number,
  facing: number,
  moving: boolean,
  gait: Gait,
  t: number,
  alpha = 1,
): void {
  const u = proj.tileScreenW / 64;
  const cf = Math.cos(facing);
  const sf = Math.sin(facing);
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (proj.heightPx === 0) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ellipse(ctx, fx + 1.5 * u, fy + 2 * u, 18 * u, 18 * u);
    ctx.fill();
    ctx.fillStyle = PIP_YELLOW;
    ellipse(ctx, fx, fy, 18 * u, 18 * u);
    ctx.fill();
    ctx.fillStyle = PIP_HOOD;
    ellipse(ctx, fx - cf * 3 * u, fy - sf * 3 * u, 11 * u, 11 * u);
    ctx.fill();
    ctx.fillStyle = SKIN;
    triangle(ctx, fx + cf * 22 * u, fy + sf * 22 * u, fx + cf * 8 * u - sf * 7 * u, fy + sf * 8 * u + cf * 7 * u, fx + cf * 8 * u + sf * 7 * u, fy + sf * 8 * u - cf * 7 * u);
    ctx.fill();
    if (alpha < 1) ctx.globalAlpha = 1;
    return;
  }
  const phase = t * GAIT_RATE[gait];
  const sw = moving ? Math.sin(phase) : 0;
  const bob = moving ? -Math.abs(Math.sin(phase)) * 3 * u : 0;
  shadow(ctx, fx, fy, u, 1);
  // legs
  ctx.fillStyle = PANTS;
  ctx.fillRect(fx - 9 * u, fy - 11 * u - Math.max(0, sw) * 3 * u, 7 * u, 12 * u);
  ctx.fillRect(fx + 2 * u, fy - 11 * u - Math.max(0, -sw) * 3 * u, 7 * u, 12 * u);
  // hoodie body + pocket
  ctx.fillStyle = PIP_YELLOW;
  roundRectPath(ctx, fx - 14 * u, fy - 36 * u + bob, 28 * u, 28 * u, 8 * u);
  ctx.fill();
  ctx.fillStyle = PIP_HOOD;
  ctx.fillRect(fx - 8 * u, fy - 20 * u + bob, 16 * u, 7 * u);
  // arms
  ctx.fillStyle = shade(PIP_YELLOW, 0.88);
  ellipse(ctx, fx - 16 * u, fy - 24 * u + bob + sw * 2 * u, 4 * u, 8 * u);
  ctx.fill();
  ellipse(ctx, fx + 16 * u, fy - 24 * u + bob - sw * 2 * u, 4 * u, 8 * u);
  ctx.fill();
  // hood (back of head)
  const hy = fy - 44 * u + bob;
  ctx.fillStyle = PIP_HOOD;
  ellipse(ctx, fx, hy, 14 * u, 13 * u);
  ctx.fill();
  if (sf > -0.35) {
    const fxo = cf * 4 * u;
    ctx.fillStyle = SKIN;
    ellipse(ctx, fx + fxo, hy + 1.5 * u + Math.max(0, sf) * 1.5 * u, 9.5 * u, 9 * u);
    ctx.fill();
    ctx.fillStyle = "#2a2230";
    ctx.fillRect(fx + fxo - 4.5 * u + cf * 2.5 * u, hy + 0.5 * u, 2.2 * u, 3.2 * u);
    ctx.fillRect(fx + fxo + 2.3 * u + cf * 2.5 * u, hy + 0.5 * u, 2.2 * u, 3.2 * u);
    ctx.strokeStyle = PIP_YELLOW;
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.arc(fx, hy, 12 * u, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  } else {
    ctx.fillStyle = PIP_YELLOW;
    ellipse(ctx, fx, hy, 12 * u, 11 * u);
    ctx.fill();
  }
  if (alpha < 1) ctx.globalAlpha = 1;
}

export function drawSeeker(
  ctx: Ctx,
  proj: Projection,
  fx: number,
  fy: number,
  type: string,
  facing: number,
  moving: boolean,
  asleep: boolean,
  t: number,
): void {
  const look = seekerLook(type);
  const u = (proj.tileScreenW / 64) * look.scale;
  const cf = Math.cos(facing);
  const sf = Math.sin(facing);
  if (proj.heightPx === 0) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ellipse(ctx, fx + 1.5 * u, fy + 2 * u, 19 * u, 19 * u);
    ctx.fill();
    ctx.fillStyle = look.body;
    ellipse(ctx, fx, fy, 19 * u, 19 * u);
    ctx.fill();
    ctx.fillStyle = look.hair;
    ellipse(ctx, fx - cf * 4 * u, fy - sf * 4 * u, 11 * u, 11 * u);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    triangle(ctx, fx + cf * 26 * u, fy + sf * 26 * u, fx + cf * 14 * u - sf * 6 * u, fy + sf * 14 * u + cf * 6 * u, fx + cf * 14 * u + sf * 6 * u, fy + sf * 14 * u - cf * 6 * u);
    ctx.fill();
    return;
  }
  const phase = t * 9;
  const sw = moving ? Math.sin(phase) : 0;
  const bob = moving ? -Math.abs(Math.sin(phase)) * 2.5 * u : 0;
  shadow(ctx, fx, fy, u, 1.05);
  // facing wedge on the floor
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  const ax = fx + cf * 26 * u;
  const ay = fy + sf * 26 * u * (proj.tileScreenH / proj.tileScreenW);
  const bx = fx + cf * 15 * u;
  const by = fy + sf * 15 * u * (proj.tileScreenH / proj.tileScreenW);
  const px = -sf * 6 * u;
  const py = cf * 6 * u * (proj.tileScreenH / proj.tileScreenW);
  triangle(ctx, ax, ay, bx + px, by + py, bx - px, by - py);
  ctx.fill();
  if (type === "dog") {
    const dir = cf >= 0 ? 1 : -1;
    ctx.fillStyle = look.body;
    ellipse(ctx, fx, fy - 12 * u + bob, 17 * u, 9 * u);
    ctx.fill();
    ctx.fillRect(fx - 12 * u, fy - 7 * u + sw * 2 * u, 4 * u, 8 * u);
    ctx.fillRect(fx + 8 * u, fy - 7 * u - sw * 2 * u, 4 * u, 8 * u);
    ellipse(ctx, fx + dir * 16 * u, fy - 18 * u + bob, 8 * u, 7.5 * u);
    ctx.fill();
    ctx.fillStyle = look.hair;
    ellipse(ctx, fx + dir * 14 * u, fy - 24 * u + bob, 3 * u, 5 * u);
    ctx.fill();
    ctx.fillRect(fx - dir * 19 * u, fy - 20 * u + bob, 5 * u, 3 * u);
  } else {
    ctx.fillStyle = "#34323f";
    ctx.fillRect(fx - 9 * u, fy - 11 * u - Math.max(0, sw) * 3 * u, 7 * u, 12 * u);
    ctx.fillRect(fx + 2 * u, fy - 11 * u - Math.max(0, -sw) * 3 * u, 7 * u, 12 * u);
    ctx.fillStyle = look.body;
    roundRectPath(ctx, fx - 14 * u, fy - 38 * u + bob, 28 * u, 30 * u, 8 * u);
    ctx.fill();
    ctx.fillStyle = shade(look.body, 0.8);
    ctx.fillRect(fx - 14 * u, fy - 14 * u + bob, 28 * u, 5 * u);
    const hy = fy - 47 * u + bob;
    ctx.fillStyle = SKIN;
    ellipse(ctx, fx, hy, 10.5 * u, 10.5 * u);
    ctx.fill();
    ctx.fillStyle = look.hair;
    if (sf > -0.35) {
      ctx.beginPath();
      ctx.ellipse(fx, hy - 2 * u, 11.5 * u, 9 * u, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.fillRect(fx - 4.5 * u + cf * 3 * u, hy - 1 * u, 2.2 * u, 3 * u);
      ctx.fillRect(fx + 2.3 * u + cf * 3 * u, hy - 1 * u, 2.2 * u, 3 * u);
    } else {
      ellipse(ctx, fx, hy - 0.5 * u, 11.5 * u, 10.5 * u);
      ctx.fill();
    }
  }
  if (asleep) {
    ctx.fillStyle = "#cfe3ff";
    ctx.font = `bold ${14 * u}px sans-serif`;
    ctx.fillText("z", fx + 12 * u, fy - 52 * u);
    ctx.font = `bold ${10 * u}px sans-serif`;
    ctx.fillText("z", fx + 21 * u, fy - 62 * u);
  }
}

/** Path of the covered-character marker: the body, head and legs as one shape (feet at fx, fy). */
function silhouettePath(ctx: Ctx, proj: Projection, fx: number, fy: number, u: number, dogDir: number): void {
  ctx.beginPath();
  if (proj.heightPx === 0) {
    ctx.moveTo(fx + 19 * u, fy);
    ctx.arc(fx, fy, 19 * u, 0, Math.PI * 2);
  } else if (dogDir !== 0) {
    ctx.ellipse(fx, fy - 12 * u, 17 * u, 9 * u, 0, 0, Math.PI * 2);
    ctx.moveTo(fx + dogDir * 24 * u, fy - 18 * u);
    ctx.ellipse(fx + dogDir * 16 * u, fy - 18 * u, 8 * u, 7.5 * u, 0, 0, Math.PI * 2);
    ctx.rect(fx - 12 * u, fy - 7 * u, 4 * u, 8 * u);
    ctx.rect(fx + 8 * u, fy - 7 * u, 4 * u, 8 * u);
  } else {
    ctx.rect(fx - 9 * u, fy - 11 * u, 7 * u, 12 * u);
    ctx.rect(fx + 2 * u, fy - 11 * u, 7 * u, 12 * u);
    const r = 8 * u;
    const x = fx - 14 * u;
    const y = fy - 37 * u;
    const w = 28 * u;
    const h = 29 * u;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.moveTo(fx + 12 * u, fy - 46 * u);
    ctx.ellipse(fx, fy - 46 * u, 12 * u, 12 * u, 0, 0, Math.PI * 2);
  }
}

/**
 * Marker for a character that something stands in front of: a 40% filled body with a thin light outline
 * on a darker keyline, so it reads on any background without competing with the scene.
 * `strength` 0..1 fades the whole marker. `dogDir` is +1/-1 for dogs (facing right/left) and 0 for people.
 */
export function drawSilhouette(ctx: Ctx, proj: Projection, fx: number, fy: number, scale: number, strength: number, fill = "#fff2b8", dogDir = 0): void {
  const u = (proj.tileScreenW / 64) * scale;
  silhouettePath(ctx, proj, fx, fy, u, dogDir);
  ctx.globalAlpha = 0.4 * strength;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.globalAlpha = 0.55 * strength;
  ctx.strokeStyle = "#1a1020";
  ctx.lineWidth = 3.2 * u;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.globalAlpha = 0.95 * strength;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5 * u;
  ctx.stroke();
  ctx.globalAlpha = 1;
}