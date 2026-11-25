/** Coordinate chain: world tiles -> projected px -> logical 1280x720 -> CSS px (canvas). Pure math. */
import type { Camera } from "./camera";
import type { Projection } from "./projection";
import { LOGICAL_H, LOGICAL_W, type Viewport } from "./viewport";

export interface CamPose {
  x: number;
  y: number;
  zoom: number;
}

export function worldToLogical(proj: Projection, cam: CamPose, x: number, y: number, out: { x: number; y: number }): void {
  out.x = (proj.px(x) - proj.px(cam.x)) * cam.zoom + LOGICAL_W / 2;
  out.y = (proj.py(y) - proj.py(cam.y)) * cam.zoom + LOGICAL_H / 2;
}

export function logicalToWorld(proj: Projection, cam: CamPose, lx: number, ly: number): { x: number; y: number } {
  const sx = proj.px(cam.x) + (lx - LOGICAL_W / 2) / cam.zoom;
  const sy = proj.py(cam.y) + (ly - LOGICAL_H / 2) / cam.zoom;
  return proj.screenToWorld(sx, sy);
}

/** CSS px relative to the canvas -> flat world tiles. */
export function cssToWorld(proj: Projection, cam: CamPose, vp: Viewport, sx: number, sy: number): { x: number; y: number } {
  return logicalToWorld(proj, cam, (sx - vp.offX) / vp.scale, (sy - vp.offY) / vp.scale);
}

export function worldToCss(proj: Projection, cam: CamPose, vp: Viewport, x: number, y: number): { x: number; y: number } {
  const o = { x: 0, y: 0 };
  worldToLogical(proj, cam, x, y, o);
  return { x: o.x * vp.scale + vp.offX, y: o.y * vp.scale + vp.offY };
}

/** Visible rect in projected px at the camera pose. */
export function visibleRect(proj: Projection, cam: Camera | CamPose, pad = 0) {
  const cx = proj.px(cam.x);
  const cy = proj.py(cam.y);
  const hw = LOGICAL_W / 2 / cam.zoom + pad;
  const hh = LOGICAL_H / 2 / cam.zoom + pad;
  return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh };
}
