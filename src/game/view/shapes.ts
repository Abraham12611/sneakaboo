import type { Projection } from "./projection";

export type Ctx = CanvasRenderingContext2D;

/** Rounded-rect path (arcTo; works in every browser). */
export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

/**
 * Extruded box on the floor footprint (x, y, w, h in tiles) with height `z` tiles.
 * Oblique: front face + top cap. Top-down: top only. Returns the screen rect via `out`.
 */
export function drawBox(
  ctx: Ctx,
  proj: Projection,
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  topColor: string,
  frontColor: string,
): void {
  const x0 = proj.px(x);
  const x1 = proj.px(x + w);
  const yTop0 = proj.py(y, z);
  const yTop1 = proj.py(y + h, z);
  const yBase = proj.py(y + h, 0);
  if (yBase > yTop1 + 0.01) {
    ctx.fillStyle = frontColor;
    ctx.fillRect(x0, yTop1, x1 - x0, yBase - yTop1);
  }
  ctx.fillStyle = topColor;
  ctx.fillRect(x0, yTop0, x1 - x0, yTop1 - yTop0);
}

export function triangle(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
}
