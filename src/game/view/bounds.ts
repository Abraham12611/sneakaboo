/** Screen bounds (projected px) of what each standing thing really draws. Pure; shared by occlusion, culling and sprite caching. */
import type { ObjectState } from "../sim/types";
import type { Projection } from "./projection";
import type { Rect4 } from "./occlusion";

/** Extra pixels on every side to cover contact shadows, outlines and anti-aliasing. */
export const BOUNDS_PAD = 3;

/** Radius (px at zoom 1) of a tree canopy / plant crown in the projected plane. */
export function canopyRadius(proj: Projection, o: ObjectState): number {
  return Math.max(o.def.w, o.def.h) * proj.tileScreenW * 0.8;
}

/**
 * Bounding rect of an object or door exactly as `drawObject` / `drawDoor` paint it (generously padded).
 * `hgt` is the drawn height in tiles (open doors use at least 1.4).
 */
export function objectRect(proj: Projection, o: ObjectState, out: Rect4, hgt = o.height): Rect4 {
  const d = o.def;
  const T = proj.tileScreenW;
  const ob = proj.heightPx > 0;
  let x0 = proj.px(d.x);
  let x1 = proj.px(d.x + d.w);
  let y0 = proj.py(d.y, hgt);
  let y1 = proj.py(d.y + d.h, 0);
  if (d.type === "tree") {
    const cx = proj.px(d.x + d.w / 2);
    const r = canopyRadius(proj, o);
    const cy = proj.py(d.y + d.h / 2, Math.max(hgt, 1.4));
    x0 = Math.min(x0, cx - r);
    x1 = Math.max(x1, cx + r);
    y0 = Math.min(y0, cy - 0.78 * r);
    y1 = Math.max(y1, cy + 1.02 * r);
  } else if (d.type === "plant" || d.type === "barrel" || d.type === "lamp") {
    const cx = proj.px(d.x + d.w / 2);
    const r = (Math.min(d.w, d.h) * T) / 2;
    if (ob) {
      x0 = Math.min(x0, cx - 1.3 * r);
      x1 = Math.max(x1, cx + 1.3 * r);
      y0 = Math.min(y0, proj.py(d.y + d.h / 2, hgt) - 1.9 * r);
    }
  } else if (d.type === "door") {
    y0 -= 0.1 * T;
  }
  out.x0 = Math.floor(x0 - BOUNDS_PAD);
  out.x1 = Math.ceil(x1 + BOUNDS_PAD);
  out.y0 = Math.floor(y0 - BOUNDS_PAD);
  out.y1 = Math.ceil(y1 + BOUNDS_PAD);
  return out;
}
