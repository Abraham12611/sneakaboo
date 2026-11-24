// Scene builder: turns sim state + camera + projection into renderer-agnostic draw commands.
import { DOORWAY } from '../sim/level';
import type { Pip, Seeker, Sim } from '../sim/sim';
import type { Camera } from './camera';
import { LOGICAL_H, LOGICAL_W, type Cmd, type Frame } from './cmds';
import { boxColors, Emitter, shade } from './emitter';
import { MANIFEST } from './manifest';
import type { Projection } from './projection';

export interface Joy { bx: number; by: number; kx: number; ky: number }
export interface UiState { joy: Joy | null; touch: boolean; showHints: boolean }
export interface Btn { id: string; x: number; y: number; r: number; label: string }
export const BUTTONS: Btn[] = [
  { id: 'zoomIn', x: 1234, y: 300, r: 26, label: '+' },
  { id: 'zoomOut', x: 1234, y: 366, r: 26, label: '-' },
  { id: 'proj', x: 1234, y: 432, r: 26, label: 'P' },
];

type RoomState = 'visible' | 'remembered' | 'unknown';
interface Stander {
  id: string; baseline: number; bx0: number; by0: number; bx1: number; by1: number;
  fx0: number; fy0: number; fx1: number; fy1: number; // footprint (tiles) for occlusion distance
  occludable: boolean;
  draw: (E: Emitter) => void;
}

const FLOOR = '#b07a4e';
const WALL_CAP = '#dcb892';
const WALL_FACE = '#a2735a';
const OCCLUDE_RADIUS = 2.2;
const OCCLUDE_ALPHA = 0.35;

export interface SpriteInfo { w: number; h: number }

export class Scene {
  occ = new Map<string, number>();
  spriteInfo = new Map<string, SpriteInfo>(); // key -> natural size, filled when ?sprites=1 loaded
  lastStats = { standers: 0, drawn: 0, cmds: 0, covered: false };

  constructor(public proj: Projection) {}

  roomStates(sim: Sim): RoomState[] {
    const pr = sim.roomAt(sim.pip.x, sim.pip.y);
    return sim.level.rooms.map((_, i): RoomState => (pr === i || pr === DOORWAY ? 'visible' : sim.visited[i] ? 'remembered' : 'unknown'));
  }

  build(sim: Sim, cam: Camera, alpha: number, dt: number, ui: UiState, now: number): Frame {
    const proj = this.proj, E = new Emitter(proj), L = sim.level;
    const T = proj.tileScreenW, TH = proj.tileScreenH, flat = E.flat;
    const camPx = proj.worldToScreen(cam.x, cam.y, 0);
    const vx0 = camPx.sx - LOGICAL_W / 2 / cam.zoom - 40, vx1 = camPx.sx + LOGICAL_W / 2 / cam.zoom + 40;
    const vy0 = camPx.sy - LOGICAL_H / 2 / cam.zoom - 40, vy1 = camPx.sy + LOGICAL_H / 2 / cam.zoom + 40;
    const rs = this.roomStates(sim);
    const lerp = (a: number, b: number) => a + (b - a) * alpha;
    const pip = sim.pip;
    const pipX = lerp(pip.px, pip.x), pipY = lerp(pip.py, pip.y);
    const seekerRoomVisible = (s: Seeker) => {
      const r = sim.roomAt(s.x, s.y);
      return r === DOORWAY || (r >= 0 && rs[r] === 'visible');
    };

    // ---- 1. floor
    for (const r of L.rooms) {
      const { x0, y0, x1, y1 } = r.rect;
      E.floorRect(x0, y0, x1, y1, FLOOR);
      for (let y = y0; y < y1; y++) if (y & 1) E.floorRect(x0, y, x1, y + 1, '#000000', 0.07);
    }
    for (const d of L.doors) E.floorRect(d.x, d.y, d.x + d.w, d.y + d.h, shade(FLOOR, 0.85));

    // ---- 2. decals: rugs, prop shadows, character shadows
    for (const g of L.rugs) {
      E.floorRect(g.x, g.y, g.x + g.w, g.y + g.h, g.color, 0.95, g.border, 3);
      E.floorRect(g.x + 0.25, g.y + 0.25, g.x + g.w - 0.25, g.y + g.h - 0.25, shade(g.color, 0.85), 0.8, g.border, 1);
    }
    const standers: Stander[] = [];
    const inView = (a: number, b: number, c: number, d: number) => !(c < vx0 || a > vx1 || d < vy0 || b > vy1);

    // walls
    for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < L.w; tx++) {
      if (!L.walls[ty * L.w + tx]) continue;
      const cut = ty === L.h - 1; // front (south) outer wall is a low cutaway so it doesn't hide the room
      const topZ = flat ? 0 : cut ? 0.45 : proj.wallHeightPx / E.H;
      const bx0 = tx * T, bx1 = (tx + 1) * T;
      const by0 = proj.worldToScreen(tx, ty, topZ).sy, by1 = proj.worldToScreen(tx, ty + 1, 0).sy;
      if (!inView(bx0, by0, bx1, by1)) continue;
      const below = cut ? true : ty + 1 < L.h ? (L.roomOf[(ty + 1) * L.w + tx] !== -1 || ty + 2 === L.h) : false;
      standers.push({
        id: `w${tx},${ty}`, baseline: ty + 1, bx0, by0, bx1, by1, fx0: tx, fy0: ty, fx1: tx + 1, fy1: ty + 1, occludable: true,
        draw: (e) => {
          if (!e.flat && below) {
            e.poly([[tx, ty + 1, 0], [tx + 1, ty + 1, 0], [tx + 1, ty + 1, topZ], [tx, ty + 1, topZ]], WALL_FACE);
            e.poly([[tx, ty + 1, 0], [tx + 1, ty + 1, 0], [tx + 1, ty + 1, 0.2], [tx, ty + 1, 0.2]], '#6e4a3a');
          }
          e.poly([[tx, ty, topZ], [tx + 1, ty, topZ], [tx + 1, ty + 1, topZ], [tx, ty + 1, topZ]], WALL_CAP, 1, e.flat ? '#8a6a55' : '#b99571', 1.5);
        },
      });
    }
    // doors (open leaf against the north jamb)
    for (const d of L.doors) {
      const lx0 = d.x + 0.05, lx1 = d.x + 0.95, ly0 = d.y + 0.02, ly1 = d.y + 0.14;
      const h = 1.25;
      standers.push({
        id: `door${d.x},${d.y}`, baseline: ly1, occludable: false,
        bx0: lx0 * T, bx1: lx1 * T, by0: proj.worldToScreen(lx0, ly0, h).sy, by1: proj.worldToScreen(lx1, ly1, 0).sy,
        fx0: lx0, fy0: ly0, fx1: lx1, fy1: ly1,
        draw: (e) => e.box(lx0, ly0, lx1, ly1, 0, h, boxColors('#5e3a24'), '#2e1a10'),
      });
    }
    // props
    for (const p of L.props) {
      const vis = MANIFEST[p.kind];
      const bx0 = p.x * T, bx1 = (p.x + p.w) * T;
      const by0 = proj.worldToScreen(p.x, p.y, p.height).sy, by1 = proj.worldToScreen(p.x, p.y + p.h, 0).sy;
      if (!inView(bx0 - 20, by0 - 20, bx1 + 20, by1 + 20)) continue;
      if (!flat && p.height > 0.5) { // soft shadow, two layers
        E.floorRect(p.x - 0.05, p.y + 0.05, p.x + p.w + 0.2, p.y + p.h + 0.22, '#000000', 0.12);
        E.floorRect(p.x + 0.02, p.y + 0.1, p.x + p.w + 0.1, p.y + p.h + 0.12, '#000000', 0.12);
      }
      const si = this.spriteInfo.get(p.kind);
      standers.push({
        id: p.id, baseline: p.y + p.h, bx0, by0, bx1, by1, fx0: p.x, fy0: p.y, fx1: p.x + p.w, fy1: p.y + p.h, occludable: true,
        draw: (e) => {
          if (si && vis) {
            const sp = vis.sprite, w = sp.widthTiles * T, h = (w * si.h) / si.w;
            const c = proj.worldToScreen(p.x + p.w / 2, p.y + p.h + sp.dyTiles, 0);
            e.sprite(p.kind, c.sx, c.sy, w, h, sp.ax, sp.ay);
          } else vis?.draw(e, p);
        },
      });
    }

    // character shadows (floor layer)
    const shadow = (x: number, y: number, r: number) => {
      E.floorEll(x, y + 0.04, r * 1.1, r * 1.1, '#000000', 0.13);
      E.floorEll(x, y + 0.04, r * 0.8, r * 0.8, '#000000', 0.2);
    };
    shadow(pipX, pipY, 0.3);
    const seekerPos = (s: Seeker) => ({ x: lerp(s.px, s.x), y: lerp(s.py, s.y) });
    let drawnSeekers = 0;
    for (const s of sim.seekers) {
      if (!seekerRoomVisible(s)) continue;
      const q = seekerPos(s);
      const sp = proj.worldToScreen(q.x, q.y, 0);
      if (!inView(sp.sx - 60, sp.sy - 150, sp.sx + 60, sp.sy + 30) && !inView(sp.sx - s.def.range * T, sp.sy - s.def.range * T, sp.sx + s.def.range * T, sp.sy + s.def.range * T)) continue;
      shadow(q.x, q.y, 0.32);
    }

    // ---- 3. cones, then noise rings (floor plane, under characters)
    const coneR = (s: Seeker) => s.def.range * (T + TH) / 2;
    for (const s of sim.seekers) {
      if (!seekerRoomVisible(s)) continue;
      const sp = proj.worldToScreen(s.x, s.y, 0);
      if (!inView(sp.sx - s.def.range * T, sp.sy - s.def.range * T, sp.sx + s.def.range * T, sp.sy + s.def.range * T)) continue;
      const pts: number[] = [];
      for (let i = 0; i < s.cone.length; i += 2) { const q = proj.worldToScreen(s.cone[i], s.cone[i + 1], 0); pts.push(q.sx, q.sy); }
      const col = s.meter >= 0.85 ? '#ff3b30' : s.meter > 0.35 ? '#ff9a2a' : '#ffd94a';
      E.cmds.push({ t: 'cone', p: pts, x: sp.sx, y: sp.sy, r: coneR(s), c: col, a: 0.55 });
      E.cmds.push({ t: 'poly', p: pts, a: 0.45, s: col, sw: 1.5 });
    }
    for (const n of sim.noise) {
      const k = n.age / n.life;
      E.floorEll(n.x, n.y, n.r * k, n.r * k, undefined, 0.7 * (1 - k), '#dff3ff', 2.5);
    }

    // ---- 4. standers sorted by baseline y (walls, doors, props, then characters)
    // characters
    const covers: { x0: number; y0: number; x1: number; y1: number } = {
      x0: pipX * T - 0.3 * T, x1: pipX * T + 0.3 * T,
      y0: proj.worldToScreen(pipX, pipY, 1.05).sy, y1: proj.worldToScreen(pipX, pipY, 0).sy,
    };
    for (const s of sim.seekers) {
      if (!seekerRoomVisible(s)) continue;
      drawnSeekers++;
      const q = seekerPos(s);
      const c = proj.worldToScreen(q.x, q.y, 0);
      if (!inView(c.sx - 40, c.sy - 130, c.sx + 40, c.sy + 20)) continue;
      standers.push({
        id: `s${s.id}`, baseline: q.y, occludable: false,
        bx0: c.sx - 30, bx1: c.sx + 30, by0: c.sy - 120, by1: c.sy, fx0: q.x, fy0: q.y, fx1: q.x, fy1: q.y,
        draw: (e) => this.drawCharacter(e, q.x, q.y, s.facing, 'seeker', false, s.meter, 'walk'),
      });
    }
    standers.push({
      id: 'pip', baseline: pipY, occludable: false,
      bx0: covers.x0, bx1: covers.x1, by0: covers.y0, by1: covers.y1, fx0: pipX, fy0: pipY, fx1: pipX, fy1: pipY,
      draw: (e) => this.drawCharacter(e, pipX, pipY, pip.facing, 'pip', false, 0, pip.gait),
    });
    standers.sort((a, b) => a.baseline - b.baseline);

    // occlusion fade targets
    let covered = false;
    const seen = new Set<string>();
    for (const s of standers) {
      if (!s.occludable) continue;
      let target = 1;
      if (!flat && s.baseline > pipY + 0.001 &&
        !(s.bx1 < covers.x0 || s.bx0 > covers.x1 || s.by1 < covers.y0 || s.by0 > covers.y1)) {
        const dx = Math.max(s.fx0 - pipX, 0, pipX - s.fx1), dy = Math.max(s.fy0 - pipY, 0, pipY - s.fy1);
        if (Math.hypot(dx, dy) <= OCCLUDE_RADIUS) target = OCCLUDE_ALPHA;
      }
      const cur = this.occ.get(s.id) ?? 1;
      const nv = cur + (target - cur) * (1 - Math.exp(-dt * 14));
      if (target < 1 || nv < 0.999) this.occ.set(s.id, nv); else this.occ.delete(s.id);
      seen.add(s.id);
      if (nv < 0.9 && target < 1) covered = true;
    }
    let drawn = 0;
    for (const s of standers) {
      E.alpha = s.occludable ? (this.occ.get(s.id) ?? 1) : 1;
      s.draw(E);
      drawn++;
    }
    E.alpha = 1;
    this.lastStats = { standers: standers.length, drawn, cmds: 0, covered };
    // silhouette outline for Pip when covered
    if (covered) this.drawCharacter(E, pipX, pipY, pip.facing, 'pip', true, 0, pip.gait);

    // ---- 5. detection bubbles (above heads)
    for (const s of sim.seekers) {
      if (!seekerRoomVisible(s) || s.meter < 0.02) continue;
      const q = seekerPos(s);
      const c = proj.worldToScreen(q.x, q.y, flat ? 0 : 1.5);
      const yy = flat ? c.sy - 0.5 * T : c.sy - 4;
      E.cmds.push({ t: 'poly', p: [c.sx - 22, yy - 3, c.sx + 22, yy - 3, c.sx + 22, yy + 3, c.sx - 22, yy + 3], f: '#000000', a: 0.6 });
      const col = s.meter >= 0.85 ? '#ff3b30' : s.meter > 0.35 ? '#ff9a2a' : '#ffe14a';
      E.cmds.push({ t: 'poly', p: [c.sx - 21, yy - 2, c.sx - 21 + 42 * s.meter, yy - 2, c.sx - 21 + 42 * s.meter, yy + 2, c.sx - 21, yy + 2], f: col, a: 1 });
      if (s.meter > 0.35) E.cmds.push({ t: 'text', x: c.sx, y: yy - 20, str: s.meter >= 0.85 ? '!' : '?', size: 26, f: col, a: 1, align: 'center', bold: true });
    }

    // ---- 6. fog of war overlays (dim / dark the rooms Pip is not in)
    const wallZ = flat ? 0 : proj.wallHeightPx / E.H;
    L.rooms.forEach((r, i) => {
      if (rs[i] === 'visible') return;
      const xL = r.rect.x0 === 1 ? 0 : r.rect.x0, xR = r.rect.x1 === L.w - 1 ? L.w : r.rect.x1;
      const yT = r.rect.y0 - 1, yB = r.rect.y1 + 1;
      const top = proj.worldToScreen(0, yT, wallZ).sy, bot = proj.worldToScreen(0, yB, 0).sy;
      const pr = [xL * T, top, xR * T, top, xR * T, bot, xL * T, bot];
      if (rs[i] === 'remembered') {
        E.cmds.push({ t: 'poly', p: pr, f: '#10121c', a: 0.45 });
        E.cmds.push({ t: 'poly', p: pr, f: '#7a8190', a: 0.22 });
      } else {
        E.cmds.push({ t: 'poly', p: pr, f: '#06070d', a: 0.96 });
        const cx = ((r.rect.x0 + r.rect.x1) / 2) * T, cy = proj.worldToScreen(0, (r.rect.y0 + r.rect.y1) / 2, 0).sy;
        E.cmds.push({ t: 'text', x: cx, y: cy, str: '? ' + r.name + ' ?', size: 34, f: '#8a92a8', a: 0.7, align: 'center', bold: true });
      }
    });

    // ---- 7. HUD
    const hud: Cmd[] = [];
    this.buildHud(hud, sim, cam, camPx, ui, rs, seekerRoomVisible, now);
    this.lastStats.cmds = E.cmds.length + hud.length;
    void drawnSeekers;
    return { world: E.cmds, hud, camPx: { x: camPx.sx, y: camPx.sy }, zoom: cam.zoom };
  }

  /** Procedural character. mode 'outline' draws only a thin silhouette stroke (Pip behind props). */
  private drawCharacter(E: Emitter, x: number, y: number, facing: number, who: 'pip' | 'seeker', outline: boolean, meter: number, gait: string) {
    const flat = E.flat, T = E.T, H = E.H;
    const c = E.proj.worldToScreen(x, y, 0);
    const scale = who === 'pip' ? 1 : 1.15;
    const crouch = who === 'pip' && gait === 'sneak' ? 0.82 : 1;
    const body = who === 'pip' ? '#f2c230' : meter > 0.35 ? '#7a3a52' : '#34437a';
    const pants = who === 'pip' ? '#3a5a9a' : '#222c55';
    const skin = '#f0c39a', hair = who === 'pip' ? '#5a3a22' : '#1c2240';
    const ol = outline ? '#ffffff' : undefined;
    const f = (col: string) => (outline ? undefined : col);
    const ow = outline ? 2 : 0;
    const A = outline ? 0.95 : 1;
    if (flat) {
      const r = 0.3 * T * scale;
      E.cmds.push({ t: 'ell', x: c.sx, y: c.sy, rx: r, ry: r, f: f(body), a: A * E.alpha, s: outline ? '#ffffff' : shade(body, 0.55), sw: outline ? 2 : 2 });
      const fx = c.sx + Math.cos(facing) * r * 0.55, fy = c.sy + Math.sin(facing) * r * 0.55;
      E.cmds.push({ t: 'ell', x: fx, y: fy, rx: r * 0.4, ry: r * 0.4, f: f(skin), a: A * E.alpha, s: ol, sw: ow });
      return;
    }
    const h = H * scale * crouch;
    // legs/pants
    E.cmds.push({ t: 'ell', x: c.sx, y: c.sy - 0.1 * h, rx: 0.2 * T * scale, ry: 0.13 * h, f: f(pants), a: A * E.alpha, s: ol, sw: ow });
    // torso
    E.cmds.push({ t: 'ell', x: c.sx, y: c.sy - 0.38 * h, rx: 0.26 * T * scale, ry: 0.3 * h, f: f(body), a: A * E.alpha, s: ol, sw: ow });
    if (who === 'pip' && Math.sin(facing) < 0.3 && !outline) // backpack when facing away
      E.cmds.push({ t: 'ell', x: c.sx, y: c.sy - 0.4 * h, rx: 0.18 * T, ry: 0.2 * h, f: '#3a4a6a', a: E.alpha, s: undefined, sw: 0 });
    // head
    const hy = c.sy - 0.78 * h;
    E.cmds.push({ t: 'ell', x: c.sx, y: hy, rx: 0.2 * T * scale, ry: 0.19 * h, f: f(skin), a: A * E.alpha, s: ol, sw: ow });
    if (!outline) {
      const back = Math.sin(facing) < -0.3;
      E.cmds.push({ t: 'ell', x: c.sx, y: hy - (back ? 0 : 0.07 * h), rx: 0.21 * T * scale, ry: (back ? 0.2 : 0.12) * h, f: hair, a: E.alpha, sw: 0 });
      if (who === 'seeker') E.cmds.push({ t: 'ell', x: c.sx, y: hy - 0.12 * h, rx: 0.22 * T, ry: 0.07 * h, f: '#10162e', a: E.alpha, sw: 0 });
      if (!back) {
        const ex = Math.cos(facing) * 0.07 * T;
        E.cmds.push({ t: 'ell', x: c.sx - 0.07 * T + ex, y: hy + 0.02 * h, rx: 1.6, ry: 2.2, f: '#222', a: E.alpha, sw: 0 });
        E.cmds.push({ t: 'ell', x: c.sx + 0.07 * T + ex, y: hy + 0.02 * h, rx: 1.6, ry: 2.2, f: '#222', a: E.alpha, sw: 0 });
      }
    }
  }

  private buildHud(hud: Cmd[], sim: Sim, cam: Camera, camPx: { sx: number; sy: number }, ui: UiState, rs: RoomState[], visible: (s: Seeker) => boolean, now: number) {
    const proj = this.proj;
    const pip: Pip = sim.pip;
    // threat arrows
    for (const s of sim.seekers) {
      const d = Math.hypot(s.x - pip.x, s.y - pip.y);
      if (d > 10) continue;
      const sp = proj.worldToScreen(s.x, s.y, 0);
      const lx = LOGICAL_W / 2 + (sp.sx - camPx.sx) * cam.zoom, ly = LOGICAL_H / 2 + (sp.sy - camPx.sy) * cam.zoom;
      const off = lx < 0 || lx > LOGICAL_W || ly < 0 || ly > LOGICAL_H;
      if (!off && visible(s)) continue;
      const dx = lx - LOGICAL_W / 2, dy = ly - LOGICAL_H / 2, len = Math.hypot(dx, dy) || 1;
      const nx = dx / len, ny = dy / len;
      const k = Math.min((LOGICAL_W / 2 - 46) / Math.abs(nx || 1e-6), (LOGICAL_H / 2 - 46) / Math.abs(ny || 1e-6));
      const ax = LOGICAL_W / 2 + nx * k, ay = LOGICAL_H / 2 + ny * k;
      const sz = 22 + (10 - d) * 1.2;
      const px = -ny, py = nx;
      hud.push({ t: 'poly', p: [ax + nx * sz, ay + ny * sz, ax - nx * sz * 0.6 + px * sz * 0.7, ay - ny * sz * 0.6 + py * sz * 0.7, ax - nx * sz * 0.6 - px * sz * 0.7, ay - ny * sz * 0.6 - py * sz * 0.7],
        f: '#ff5a3c', a: 0.9, s: '#ffffff', sw: 2 });
    }
    // top bar: detection meter
    const m = sim.maxMeter();
    hud.push({ t: 'poly', p: [490, 18, 790, 18, 790, 34, 490, 34], f: '#000000', a: 0.5, s: '#ffffff', sw: 1 });
    hud.push({ t: 'poly', p: [492, 20, 492 + 296 * m, 20, 492 + 296 * m, 32, 492, 32], f: m > 0.85 ? '#ff3b30' : m > 0.35 ? '#ff9a2a' : '#ffd94a', a: 1 });
    hud.push({ t: 'text', x: 640, y: 48, str: 'DETECTION', size: 12, f: '#ffffff', a: 0.8, align: 'center', bold: true });
    // gait + zoom readout
    hud.push({ t: 'text', x: 1250, y: 18, str: `${sim.pip.gait.toUpperCase()}   zoom ${cam.zoom.toFixed(2)}   ${proj.name}`, size: 16, f: '#ffffff', a: 0.85, align: 'right', bold: true });
    // buttons
    for (const b of BUTTONS) {
      hud.push({ t: 'ell', x: b.x, y: b.y, rx: b.r, ry: b.r, f: '#14182a', a: 0.65, s: '#ffffff', sw: 2 });
      hud.push({ t: 'text', x: b.x, y: b.y, str: b.label, size: 26, f: '#ffffff', a: 1, align: 'center', bold: true });
    }
    // joystick
    if (ui.joy) {
      const j = ui.joy;
      hud.push({ t: 'ell', x: j.bx, y: j.by, rx: 70, ry: 70, f: '#ffffff', a: 0.12, s: '#ffffff', sw: 3 });
      hud.push({ t: 'ell', x: j.bx, y: j.by, rx: 70 * 0.4, ry: 70 * 0.4, s: '#ffffff', a: 0.25, sw: 1 });
      hud.push({ t: 'ell', x: j.bx, y: j.by, rx: 70 * 0.85, ry: 70 * 0.85, s: '#ffffff', a: 0.25, sw: 1 });
      hud.push({ t: 'ell', x: j.kx, y: j.ky, rx: 30, ry: 30, f: '#ffffff', a: 0.55 });
    }
    if (ui.showHints && sim.time < 12) {
      const t = ui.touch ? 'Left side: drag = floating joystick (small tilt sneak, mid walk, full run).  Pinch / + - to zoom.' : 'WASD / arrows move.  Shift sneak, Space run.  Wheel or +/- zoom.  P projection.  R retry.  ` debug';
      hud.push({ t: 'text', x: 640, y: 690, str: t, size: 16, f: '#ffffff', a: 0.8, align: 'center' });
    }
    if (sim.status === 'found') {
      hud.push({ t: 'poly', p: [0, 0, LOGICAL_W, 0, LOGICAL_W, LOGICAL_H, 0, LOGICAL_H], f: '#2a0000', a: 0.55 });
      hud.push({ t: 'text', x: 640, y: 290, str: 'FOUND YOU!', size: 96, f: '#ff4a3a', a: 1, align: 'center', bold: true });
      hud.push({ t: 'text', x: 640, y: 410, str: ui.touch ? 'Tap to retry' : 'Press R to retry', size: 30, f: '#ffffff', a: 0.9, align: 'center' });
    }
    void rs; void now;
  }
}
