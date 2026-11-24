import { LOGICAL_H, LOGICAL_W } from './cmds';
import type { Projection } from './projection';

export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 1.8;

export class Camera {
  x = 0; y = 0;            // world tile position the camera looks at
  zoom = 1; zoomTarget = 1;
  private look = { x: 0, y: 0 };
  readonly timeConst = 0.15;
  readonly lookAhead = 1.5;
  readonly deadzone = 1.5;
  readonly zoomTimeConst = 0.07; // ~0.2 s to settle

  setZoom(z: number) { this.zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)); }
  snap(px: number, py: number, w: number, h: number, proj: Projection) {
    this.zoom = this.zoomTarget; this.x = px; this.y = py; this.clamp(w, h, proj);
  }

  update(dt: number, px: number, py: number, moveX: number, moveY: number, w: number, h: number, proj: Projection) {
    this.zoom += (this.zoomTarget - this.zoom) * (1 - Math.exp(-dt / this.zoomTimeConst));
    // look-ahead direction eases toward the move direction (or back to zero when idle)
    const k = 1 - Math.exp(-dt / 0.3);
    this.look.x += (moveX - this.look.x) * k; this.look.y += (moveY - this.look.y) * k;
    const gx = px + this.look.x * this.lookAhead, gy = py + this.look.y * this.lookAhead;
    // deadzone: only chase once the goal is farther than `deadzone` tiles from the camera
    let tx = this.x, ty = this.y;
    const dx = gx - this.x, dy = gy - this.y, d = Math.hypot(dx, dy);
    if (d > this.deadzone) { tx = this.x + dx * (1 - this.deadzone / d); ty = this.y + dy * (1 - this.deadzone / d); }
    const kk = 1 - Math.exp(-dt / this.timeConst);
    this.x += (tx - this.x) * kk; this.y += (ty - this.y) * kk;
    this.clamp(w, h, proj);
  }

  /** Clamp to the level rectangle plus a margin; center when the level fits. */
  clamp(w: number, h: number, proj: Projection) {
    const halfW = LOGICAL_W / 2 / (proj.tileScreenW * this.zoom);
    const halfH = LOGICAL_H / 2 / (proj.tileScreenH * this.zoom);
    const mTop = Math.max(1, proj.wallHeightPx / proj.tileScreenH); // show full top wall cap in oblique
    const mx = 1, mBot = 1;
    const minX = -mx + halfW, maxX = w + mx - halfW;
    const minY = -mTop + halfH, maxY = h + mBot - halfH;
    this.x = minX > maxX ? (w) / 2 : Math.max(minX, Math.min(maxX, this.x));
    this.y = minY > maxY ? (h + mBot - mTop) / 2 : Math.max(minY, Math.min(maxY, this.y));
  }
}
