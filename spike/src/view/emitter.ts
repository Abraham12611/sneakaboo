import type { Cmd } from './cmds';
import type { Projection } from './projection';

export interface BoxColors { top: string; front: string }

export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
export function boxColors(base: string): BoxColors { return { top: shade(base, 1.18), front: shade(base, 0.78) }; }

/** Projects world geometry into draw commands. `alpha` multiplies everything emitted (used for occlusion fade). */
export class Emitter {
  cmds: Cmd[] = [];
  alpha = 1;
  constructor(public proj: Projection) {}
  get flat() { return this.proj.wallHeightPx === 0; }
  get T() { return this.proj.tileScreenW; }
  get K() { return this.proj.tileScreenH / this.proj.tileScreenW; }
  get H() { return this.flat ? 0 : this.proj.wallHeightPx / 1.6; } // px per tile of height

  private pts(arr: ReadonlyArray<readonly [number, number, number]>): number[] {
    const out: number[] = [];
    for (const [x, y, z] of arr) { const q = this.proj.worldToScreen(x, y, z); out.push(q.sx, q.sy); }
    return out;
  }
  poly(arr: ReadonlyArray<readonly [number, number, number]>, f: string | undefined, a = 1, s?: string, sw = 1, open = false) {
    this.cmds.push({ t: 'poly', p: this.pts(arr), f, a: a * this.alpha, s, sw, open });
  }
  floorRect(x0: number, y0: number, x1: number, y1: number, f: string, a = 1, s?: string, sw = 1) {
    this.poly([[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], f, a, s, sw);
  }
  floorEll(cx: number, cy: number, rxT: number, ryT: number, f: string | undefined, a: number, s?: string, sw = 1) {
    const c = this.proj.worldToScreen(cx, cy, 0);
    this.cmds.push({ t: 'ell', x: c.sx, y: c.sy, rx: rxT * this.T, ry: ryT * this.proj.tileScreenH, f, a: a * this.alpha, s, sw });
  }
  /** Ellipse in screen px around a world point lifted by z tiles. */
  blob(x: number, y: number, z: number, rx: number, ry: number, f: string | undefined, a = 1, s?: string, sw = 1) {
    const c = this.proj.worldToScreen(x, y, z);
    this.cmds.push({ t: 'ell', x: c.sx, y: c.sy, rx, ry, f, a: a * this.alpha, s, sw });
  }
  line(arr: ReadonlyArray<readonly [number, number, number]>, s: string, sw = 1, a = 1) {
    this.cmds.push({ t: 'poly', p: this.pts(arr), a: a * this.alpha, s, sw, open: true });
  }
  /** Axis-aligned box: footprint [x0,x1]x[y0,y1], from height z0 up to z1 (tiles). */
  box(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, c: BoxColors, outline?: string) {
    if (!this.flat) {
      this.poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], c.front, 1, outline, 1);
    }
    this.poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c.top, 1, this.flat ? shade(c.top, 0.55) : outline, 1);
  }
  sprite(key: string, px: number, py: number, w: number, h: number, ax: number, ay: number) {
    this.cmds.push({ t: 'sprite', key, x: px, y: py, w, h, ax, ay, a: this.alpha });
  }
}
