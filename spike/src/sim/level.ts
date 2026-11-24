// Level data. Pure data + derived grids. No DOM, no view knowledge.

export interface Rect { x0: number; y0: number; x1: number; y1: number } // x1,y1 exclusive
export interface RoomDef { id: string; name: string; rect: Rect }
export interface PropInst {
  id: string;
  kind: string;        // key into the view manifest
  x: number; y: number; w: number; h: number; // footprint in tiles (top-left + size)
  height: number;      // tiles (view uses it for extrusion; sim uses blocksSight)
  collides: boolean;   // blocks movement
  blocksSight: boolean;// blocks vision cones
  cloth?: boolean;
}
export interface RugDef { x: number; y: number; w: number; h: number; color: string; border: string }
export interface DoorDef { x: number; y: number; w: number; h: number }
export interface WaypointDef { x: number; y: number; wait: number }
export interface SeekerDef {
  name: string;
  points: WaypointDef[];
  mode: 'loop' | 'pingpong';
  speed: number;
  range: number;
  angleDeg: number;
}

export interface Level {
  w: number; h: number;
  walls: Uint8Array;      // 1 = wall tile
  solid: Uint8Array;      // walls + colliding props
  sight: Uint8Array;      // walls + sight-blocking props
  roomOf: Int8Array;      // room index, -1 none (wall/outside), -2 doorway
  rooms: RoomDef[];
  doors: DoorDef[];
  props: PropInst[];
  rugs: RugDef[];
  spawn: { x: number; y: number };
  seekers: SeekerDef[];
}

export const DOORWAY = -2;

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Two rooms joined by a 2-tile doorway in the divider wall at x=16. */
export function buildLevel(stress: boolean): Level {
  const w = 34, h = 14;
  const walls = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) { walls[x] = 1; walls[(h - 1) * w + x] = 1; }
  for (let y = 0; y < h; y++) { walls[y * w] = 1; walls[y * w + w - 1] = 1; walls[y * w + 16] = 1; }
  const doors: DoorDef[] = [{ x: 16, y: 6, w: 1, h: 2 }];
  for (const d of doors) for (let y = d.y; y < d.y + d.h; y++) walls[y * w + d.x] = 0;

  const rooms: RoomDef[] = [
    { id: 'A', name: 'Bedroom', rect: { x0: 1, y0: 1, x1: 16, y1: 13 } },
    { id: 'B', name: 'Living room', rect: { x0: 17, y0: 1, x1: 33, y1: 13 } },
  ];

  let n = 0;
  const P = (kind: string, x: number, y: number, pw: number, ph: number, height: number,
    collides = true, blocksSight = false, cloth = false): PropInst =>
    ({ id: `${kind}${n++}`, kind, x, y, w: pw, h: ph, height, collides, blocksSight, cloth });

  const props: PropInst[] = [
    // Room A
    P('bed', 2, 1, 2, 1, 0.95),
    P('wardrobe', 6, 1, 2, 1, 1.5, true, true),
    P('table', 6, 6, 2, 2, 0.62, true, false, true),
    P('sofa', 2, 10, 3, 1, 0.85),
    P('plant', 14, 1, 1, 1, 1.0),
    P('plant', 14, 11, 1, 1, 1.0),
    // Room B
    P('bed', 28, 1, 2, 1, 0.95),
    P('wardrobe', 22, 1, 2, 1, 1.5, true, true),
    P('table', 24, 6, 2, 1, 0.62, true, false, true),
    P('sofa', 20, 10, 3, 1, 0.85),
    P('plant', 31, 11, 1, 1, 1.0),
    P('plant', 17, 1, 1, 1, 1.0),
  ];

  const rugs: RugDef[] = [
    { x: 3, y: 4, w: 4, h: 3, color: '#b0463f', border: '#e0b66a' },
    { x: 22, y: 4, w: 6, h: 4, color: '#3f6f8a', border: '#e0b66a' },
  ];

  const seekers: SeekerDef[] = [
    { name: 'Gus', mode: 'loop', speed: 1.6, range: 5, angleDeg: 70,
      points: [{ x: 12.5, y: 3.5, wait: 1 }, { x: 12.5, y: 10.5, wait: 1 }, { x: 9.5, y: 10.5, wait: 0.5 }, { x: 9.5, y: 3.5, wait: 1 }] },
    { name: 'Marlo', mode: 'loop', speed: 2.0, range: 6, angleDeg: 60,
      points: [{ x: 19.5, y: 3.5, wait: 1 }, { x: 30.5, y: 3.5, wait: 1 }, { x: 30.5, y: 9.5, wait: 1 }, { x: 19.5, y: 9.5, wait: 1 }] },
    { name: 'Sprinter', mode: 'pingpong', speed: 2.4, range: 7, angleDeg: 35,
      points: [{ x: 11.5, y: 7.0, wait: 1.5 }, { x: 21.5, y: 7.0, wait: 1.5 }] },
  ];

  const level: Level = {
    w, h, walls,
    solid: new Uint8Array(w * h), sight: new Uint8Array(w * h), roomOf: new Int8Array(w * h).fill(-1),
    rooms, doors, props, rugs, spawn: { x: 4.5, y: 8.0 }, seekers,
  };
  deriveGrids(level);

  if (stress) addStress(level);
  deriveGrids(level);
  return level;
}

export function deriveGrids(l: Level): void {
  const { w, h } = l;
  l.solid.set(l.walls); l.sight.set(l.walls); l.roomOf.fill(-1);
  for (const p of l.props) {
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) {
      if (p.collides) l.solid[y * w + x] = 1;
      if (p.blocksSight) l.sight[y * w + x] = 1;
    }
  }
  l.rooms.forEach((r, i) => {
    for (let y = r.rect.y0; y < r.rect.y1; y++) for (let x = r.rect.x0; x < r.rect.x1; x++) {
      if (!l.walls[y * w + x]) l.roomOf[y * w + x] = i;
    }
  });
  for (const d of l.doors) for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) l.roomOf[y * w + x] = DOORWAY;
  void h;
}

function segmentClear(l: Level, ax: number, ay: number, bx: number, by: number): boolean {
  const d = Math.hypot(bx - ax, by - ay);
  const steps = Math.ceil(d / 0.25);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    for (const [ox, oy] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]]) {
      if (l.solid[Math.floor(y + oy) * l.w + Math.floor(x + ox)]) return false;
    }
  }
  return true;
}

/** Stress mode: +10 seekers on ping-pong patrols, +150 non-colliding clutter props. */
function addStress(l: Level): void {
  const rnd = mulberry32(1234);
  const free = (): { x: number; y: number } => {
    for (;;) {
      const x = 1 + Math.floor(rnd() * (l.w - 2)), y = 1 + Math.floor(rnd() * (l.h - 2));
      if (l.roomOf[y * l.w + x] >= 0 && !l.solid[y * l.w + x]) return { x: x + 0.5, y: y + 0.5 };
    }
  };
  for (let i = 0; i < 10; i++) {
    for (let tries = 0; tries < 200; tries++) {
      const a = free(), b = free();
      if (Math.hypot(a.x - b.x, a.y - b.y) < 3 || Math.hypot(a.x - b.x, a.y - b.y) > 9) continue;
      if (l.roomOf[Math.floor(a.y) * l.w + Math.floor(a.x)] !== l.roomOf[Math.floor(b.y) * l.w + Math.floor(b.x)]) continue;
      if (!segmentClear(l, a.x, a.y, b.x, b.y)) continue;
      // keep clear of the spawn so the benchmark bot isn't caught instantly
      if (Math.hypot(a.x - l.spawn.x, a.y - l.spawn.y) < 5) continue;
      l.seekers.push({ name: `S${i}`, mode: 'pingpong', speed: 1.5 + rnd() * 1.5, range: 4 + rnd() * 3, angleDeg: 40 + rnd() * 40,
        points: [{ x: a.x, y: a.y, wait: rnd() }, { x: b.x, y: b.y, wait: rnd() }] });
      break;
    }
  }
  const kinds = ['crate', 'pot', 'box', 'stool'];
  for (let i = 0; i < 150; i++) {
    const p = free();
    const kind = kinds[i % kinds.length];
    l.props.push({ id: `c${i}`, kind, x: Math.floor(p.x), y: Math.floor(p.y), w: 1, h: 1,
      height: kind === 'pot' ? 0.5 : kind === 'stool' ? 0.45 : 0.6, collides: false, blocksSight: false });
  }
}
