// Pure game simulation: flat 2D tile grid, fixed 60 Hz step. No DOM, no camera, no projection.
import { buildLevel, DOORWAY, type Level, type SeekerDef } from './level';

export const STEP = 1 / 60;
export type Gait = 'sneak' | 'walk' | 'run';
export const GAIT_SPEED: Record<Gait, number> = { sneak: 1.8, walk: 3.0, run: 4.6 };
/** Noise radius (tiles) emitted while moving at each gait. */
export const GAIT_NOISE: Record<Gait, number> = { sneak: 0, walk: 3, run: 6 };
export const PIP_RADIUS = 0.28;
export const MAX_RAYS = 48;

export interface SimInput { dx: number; dy: number; gait: Gait } // dir is a unit vector or 0

export interface NoiseRing { x: number; y: number; r: number; age: number; life: number }

export interface Seeker {
  def: SeekerDef;
  id: number;
  x: number; y: number; px: number; py: number;
  facing: number;       // radians, 0 = +x, pi/2 = +y (south on screen)
  wp: number; dir: 1 | -1; wait: number; lookT: number;
  meter: number;        // 0..1 detection
  sees: boolean;
  cone: number[];       // flat world coords [apexX, apexY, x1, y1, ...] (<= 1 + MAX_RAYS points)
}

export interface Pip {
  x: number; y: number; px: number; py: number;
  facing: number; gait: Gait; moving: boolean; noiseT: number;
}

/** Cast a ray through a grid with DDA (Amanatides-Woo). Returns distance to first blocked cell, or maxDist. */
export function raycast(blocked: Uint8Array, w: number, h: number, ox: number, oy: number, dx: number, dy: number, maxDist: number): number {
  let cx = Math.floor(ox), cy = Math.floor(oy);
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
  const tDX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  let tMX = dx > 0 ? (cx + 1 - ox) / dx : dx < 0 ? (ox - cx) / -dx : Infinity;
  let tMY = dy > 0 ? (cy + 1 - oy) / dy : dy < 0 ? (oy - cy) / -dy : Infinity;
  let t = 0;
  for (;;) {
    if (cx < 0 || cy < 0 || cx >= w || cy >= h || blocked[cy * w + cx]) return t;
    if (tMX < tMY) { t = tMX; tMX += tDX; cx += stepX; } else { t = tMY; tMY += tDY; cy += stepY; }
    if (t >= maxDist) return maxDist;
  }
}

function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Sim {
  level: Level;
  pip!: Pip;
  seekers: Seeker[] = [];
  noise: NoiseRing[] = [];
  visited: boolean[] = [];
  time = 0;
  status: 'playing' | 'found' = 'playing';
  god = false;

  constructor(public readonly stress: boolean) {
    this.level = buildLevel(stress);
    this.reset();
  }

  reset(): void {
    const l = this.level;
    this.time = 0; this.status = 'playing'; this.noise.length = 0;
    this.pip = { x: l.spawn.x, y: l.spawn.y, px: l.spawn.x, py: l.spawn.y, facing: Math.PI / 2, gait: 'walk', moving: false, noiseT: 0 };
    this.visited = l.rooms.map(() => false);
    this.seekers = l.seekers.map((def, id) => {
      const p0 = def.points[0], p1 = def.points[1] ?? p0;
      return { def, id, x: p0.x, y: p0.y, px: p0.x, py: p0.y, facing: Math.atan2(p1.y - p0.y, p1.x - p0.x),
        wp: 1 % def.points.length, dir: 1 as const, wait: p0.wait, lookT: 0, meter: 0, sees: false, cone: [] };
    });
    this.updateVisited();
    for (const s of this.seekers) this.computeCone(s);
  }

  /** Room index of a world position (-1 none, DOORWAY (-2) in the doorway). */
  roomAt(x: number, y: number): number {
    const l = this.level;
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= l.w || cy >= l.h) return -1;
    return l.roomOf[cy * l.w + cx];
  }

  private updateVisited(): void {
    const r = this.roomAt(this.pip.x, this.pip.y);
    if (r >= 0) this.visited[r] = true;
    else if (r === DOORWAY) this.visited.fill(true);
  }

  step(input: SimInput): void {
    if (this.status !== 'playing') return;
    const dt = STEP;
    this.time += dt;
    const p = this.pip;
    p.px = p.x; p.py = p.y;
    p.moving = input.dx !== 0 || input.dy !== 0;
    p.gait = input.gait;
    if (p.moving) {
      const sp = GAIT_SPEED[input.gait];
      p.facing = Math.atan2(input.dy, input.dx);
      this.moveCircle(p, PIP_RADIUS, input.dx * sp * dt, input.dy * sp * dt);
      p.noiseT -= dt;
      const nr = GAIT_NOISE[input.gait];
      if (nr > 0 && p.noiseT <= 0) {
        p.noiseT = input.gait === 'run' ? 0.3 : 0.45;
        this.noise.push({ x: p.x, y: p.y, r: nr, age: 0, life: 0.7 });
      }
    }
    for (const n of this.noise) n.age += dt;
    this.noise = this.noise.filter((n) => n.age < n.life);
    this.updateVisited();

    for (const s of this.seekers) this.updateSeeker(s, dt);
    if (!this.god && this.seekers.some((s) => s.meter >= 1)) this.status = 'found';
  }

  private updateSeeker(s: Seeker, dt: number): void {
    s.px = s.x; s.py = s.y;
    const pts = s.def.points;
    if (s.wait > 0) {
      s.wait -= dt;
      s.lookT += dt;
      // idle look left/right
      s.facing += Math.sin(s.lookT * 2.2) * 0.012;
    } else {
      const tgt = pts[s.wp];
      const dx = tgt.x - s.x, dy = tgt.y - s.y;
      const d = Math.hypot(dx, dy);
      const stepLen = s.def.speed * dt;
      const want = Math.atan2(dy, dx);
      s.facing += Math.max(-8 * dt, Math.min(8 * dt, angDiff(want, s.facing)));
      if (d <= stepLen) {
        s.x = tgt.x; s.y = tgt.y; s.wait = tgt.wait; s.lookT = 0;
        if (s.def.mode === 'loop') s.wp = (s.wp + 1) % pts.length;
        else {
          if (s.wp + s.dir >= pts.length || s.wp + s.dir < 0) s.dir = (s.dir * -1) as 1 | -1;
          s.wp += s.dir;
        }
      } else { s.x += (dx / d) * stepLen; s.y += (dy / d) * stepLen; }
    }
    this.computeCone(s);
    this.detect(s, dt);
  }

  private computeCone(s: Seeker): void {
    const l = this.level;
    const half = (s.def.angleDeg * Math.PI) / 360;
    const n = Math.min(MAX_RAYS, 2 + Math.ceil(s.def.angleDeg / 1.5));
    const c = s.cone;
    c.length = 0;
    c.push(s.x, s.y);
    for (let i = 0; i < n; i++) {
      const a = s.facing - half + (2 * half * i) / (n - 1);
      const dx = Math.cos(a), dy = Math.sin(a);
      const d = raycast(l.sight, l.w, l.h, s.x, s.y, dx, dy, s.def.range);
      c.push(s.x + dx * d, s.y + dy * d);
    }
  }

  private detect(s: Seeker, dt: number): void {
    const p = this.pip, l = this.level;
    const dx = p.x - s.x, dy = p.y - s.y;
    const dist = Math.hypot(dx, dy);
    let sees = false;
    const safe = this.time < 3 && Math.hypot(p.x - l.spawn.x, p.y - l.spawn.y) < 4; // start safe zone
    if (!safe && dist <= s.def.range && Math.abs(angDiff(Math.atan2(dy, dx), s.facing)) <= (s.def.angleDeg * Math.PI) / 360) {
      const d = raycast(l.sight, l.w, l.h, s.x, s.y, dx / (dist || 1), dy / (dist || 1), dist);
      sees = d >= dist - 0.001;
    }
    s.sees = sees;
    if (sees) {
      const secs = 0.6 + 1.0 * (dist / s.def.range); // never faster than 0.6 s even at point blank
      s.meter = Math.min(1, s.meter + dt / secs);
    } else s.meter = Math.max(0, s.meter - 0.5 * dt);
  }

  /** Circle vs tile grid, with wall sliding by push-out resolution. */
  private moveCircle(o: { x: number; y: number }, r: number, dx: number, dy: number): void {
    const l = this.level;
    o.x += dx; o.y += dy;
    for (let it = 0; it < 3; it++) {
      const x0 = Math.floor(o.x - r), x1 = Math.floor(o.x + r), y0 = Math.floor(o.y - r), y1 = Math.floor(o.y + r);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const solid = cx < 0 || cy < 0 || cx >= l.w || cy >= l.h || l.solid[cy * l.w + cx];
        if (!solid) continue;
        const nx = Math.max(cx, Math.min(o.x, cx + 1)), ny = Math.max(cy, Math.min(o.y, cy + 1));
        const ex = o.x - nx, ey = o.y - ny;
        const d2 = ex * ex + ey * ey;
        if (d2 >= r * r) continue;
        if (d2 > 1e-9) { const d = Math.sqrt(d2); o.x += (ex / d) * (r - d); o.y += (ey / d) * (r - d); }
        else { o.x -= dx; o.y -= dy; }
      }
    }
  }

  maxMeter(): number { let m = 0; for (const s of this.seekers) m = Math.max(m, s.meter); return m; }
}
