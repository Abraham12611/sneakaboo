import type { Projection } from "./projection";
import { LOGICAL_H, LOGICAL_W } from "./viewport";

export const ZOOM_NOTCH = 1.12;
export const DEFAULT_MIN_ZOOM = 0.6;
export const DEFAULT_MAX_ZOOM = 1.8;
export const FOLLOW_TIME_CONST = 0.15;
export const LOOK_AHEAD_TILES = 1.5;
export const DEADZONE_TILES = 1.5;
export const ZOOM_TIME_CONST = 0.07; // about 0.2 s to settle
export const PEEK_FACTOR = 0.75;
export const PEEK_MAX_S = 1;
export const PEEK_COOLDOWN_S = 4;
export const INTRO_S = 1.5;

export interface CameraBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** True when the level (plus margin) fits horizontally / vertically and is centred. */
  fitX: boolean;
  fitY: boolean;
}

export function clampZoom(z: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, z));
}

/** Half extent of the view in tiles at a given zoom. */
export function halfView(proj: Projection, zoom: number): { hw: number; hh: number } {
  return { hw: LOGICAL_W / 2 / (proj.tileScreenW * zoom), hh: LOGICAL_H / 2 / (proj.tileScreenH * zoom) };
}

/** Allowed camera centre range for a level of w x h tiles (plus a 1 tile margin; top margin shows tall walls). */
export function cameraBounds(w: number, h: number, proj: Projection, zoom: number): CameraBounds {
  const { hw, hh } = halfView(proj, zoom);
  const marginTop = Math.max(1, proj.wallHeightPx / proj.tileScreenH);
  const minX = -1 + hw;
  const maxX = w + 1 - hw;
  const minY = -marginTop + hh;
  const maxY = h + 1 - hh;
  return { minX, maxX, minY, maxY, fitX: minX > maxX, fitY: minY > maxY };
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  /** Zoom the player asked for (excludes peek). */
  zoomTarget = 1;
  minZoom = DEFAULT_MIN_ZOOM;
  maxZoom = DEFAULT_MAX_ZOOM;

  peekActive = false;
  peekTime = 0;
  peekCooldown = 0;

  introActive = false;
  private introT = 0;
  private introFrom = { x: 0, y: 0 };
  private introTo = { x: 0, y: 0 };

  private lookX = 0;
  private lookY = 0;

  setLimits(min: number, max: number): void {
    this.minZoom = min;
    this.maxZoom = Math.max(min, max);
    this.zoomTarget = clampZoom(this.zoomTarget, this.minZoom, this.maxZoom);
  }

  setZoomTarget(z: number): void {
    this.zoomTarget = clampZoom(Number.isFinite(z) ? z : 1, this.minZoom, this.maxZoom);
  }

  /** `notches`: +1 zooms in one notch (x1.12). Fractions allowed. */
  zoomBy(notches: number): void {
    if (!notches) return;
    this.setZoomTarget(this.zoomTarget * Math.pow(ZOOM_NOTCH, notches));
  }

  /** Zoom the smoothing is heading to (includes peek). */
  effectiveZoomTarget(): number {
    const t = this.peekActive ? this.zoomTarget * PEEK_FACTOR : this.zoomTarget;
    return clampZoom(t, this.minZoom, this.maxZoom);
  }

  updatePeek(dt: number, want: boolean): void {
    if (this.peekCooldown > 0) {
      this.peekCooldown = Math.max(0, this.peekCooldown - dt);
      this.peekActive = false;
      this.peekTime = 0;
      return;
    }
    if (want) {
      if (!this.peekActive) {
        this.peekActive = true;
        this.peekTime = 0;
      }
      this.peekTime += dt;
      if (this.peekTime >= PEEK_MAX_S) {
        this.peekActive = false;
        this.peekTime = 0;
        this.peekCooldown = PEEK_COOLDOWN_S;
      }
    } else if (this.peekActive) {
      this.peekActive = false;
      this.peekTime = 0;
      this.peekCooldown = PEEK_COOLDOWN_S;
    }
  }

  startIntro(from: { x: number; y: number }, to: { x: number; y: number }): void {
    this.introActive = true;
    this.introT = 0;
    this.introFrom = { ...from };
    this.introTo = { ...to };
    this.x = from.x;
    this.y = from.y;
  }

  skipIntro(): void {
    if (!this.introActive) return;
    this.introActive = false;
    this.x = this.introTo.x;
    this.y = this.introTo.y;
  }

  snap(tx: number, ty: number, w: number, h: number, proj: Projection): void {
    this.zoom = this.effectiveZoomTarget();
    this.x = tx;
    this.y = ty;
    this.lookX = 0;
    this.lookY = 0;
    this.clamp(w, h, proj);
  }

  update(dt: number, tx: number, ty: number, moveX: number, moveY: number, w: number, h: number, proj: Projection): void {
    this.zoom += (this.effectiveZoomTarget() - this.zoom) * (1 - Math.exp(-dt / ZOOM_TIME_CONST));
    if (this.introActive) {
      this.introT += dt;
      const t = Math.min(1, this.introT / INTRO_S);
      const e = smooth(t);
      this.x = this.introFrom.x + (this.introTo.x - this.introFrom.x) * e;
      this.y = this.introFrom.y + (this.introTo.y - this.introFrom.y) * e;
      if (t >= 1) this.introActive = false;
      this.clamp(w, h, proj);
      return;
    }
    const k = 1 - Math.exp(-dt / 0.3);
    this.lookX += (moveX - this.lookX) * k;
    this.lookY += (moveY - this.lookY) * k;
    const gx = tx + this.lookX * LOOK_AHEAD_TILES;
    const gy = ty + this.lookY * LOOK_AHEAD_TILES;
    const dx = gx - this.x;
    const dy = gy - this.y;
    const d = Math.hypot(dx, dy);
    let ax = this.x;
    let ay = this.y;
    if (d > DEADZONE_TILES) {
      const f = 1 - DEADZONE_TILES / d;
      ax += dx * f;
      ay += dy * f;
    }
    const kk = 1 - Math.exp(-dt / FOLLOW_TIME_CONST);
    this.x += (ax - this.x) * kk;
    this.y += (ay - this.y) * kk;
    this.clamp(w, h, proj);
  }

  clamp(w: number, h: number, proj: Projection): void {
    const b = cameraBounds(w, h, proj, this.zoom);
    const marginTop = Math.max(1, proj.wallHeightPx / proj.tileScreenH);
    this.x = b.fitX ? w / 2 : Math.max(b.minX, Math.min(b.maxX, this.x));
    this.y = b.fitY ? (h + 1 - marginTop) / 2 : Math.max(b.minY, Math.min(b.maxY, this.y));
  }
}
