/** Y-sorted "standing" layer: walls, objects, doors, Pip and seekers, plus occlusion fade. */
import type { LevelData } from "../sim/levelSchema";
import type { ObjectState } from "../sim/types";
import { BOUNDS_PAD, objectRect } from "./bounds";
import { characterBounds, drawPip, drawSeeker, drawSilhouette, seekerLook } from "./characters";
import type { Env } from "./env";
import { lerp } from "./env";
import { type FogState, fogColor, FOG_VISIBLE } from "./fog";
import { buildWallRuns, TALL_WALL, type WallRun, wallHeightAt } from "./levelStatic";
import { OCCLUDE_TIME_CONST, occlusionTarget, type Rect4, rectsOverlap, SILHOUETTE_MIN_COVER_ALPHA, silhouetteStrength, tweenAlpha } from "./occlusion";
import { HASH_SEED, mixHash, type Piece } from "./layers";
import { shade } from "./palette";
import { type Ctx, drawBox, ellipse, roundRectPath } from "./shapes";

export const OBJECT_COLORS: Record<string, string> = {
  bed: "#6f9bd6", wardrobe: "#7b5a3c", closet: "#8b6b4a", sofa: "#b5587e", armchair: "#a6506f", chair: "#a67c52",
  table: "#a97b4f", table_cloth: "#d9d3c0", desk: "#8f6a45", nightstand: "#8a6a4c", dresser: "#946f4b",
  bookshelf: "#6d4c33", fridge: "#dfe6ea", counter: "#c9c2b4", stove: "#8d9399", sink: "#b9c9d3", tub: "#e8eef2",
  toilet: "#f1f1f1", plant: "#3f8f4a", rug: "#b24a4a", chest: "#8a5a2b", box: "#b08a58", crate: "#a67c3d",
  barrel: "#7d5a35", painting: "#c9a34a", lamp: "#f0d98a", tv_unit: "#38404a", piano: "#26262c", car: "#5a7fb0",
  bench: "#8f7050", tree: "#2f7a3a", shed: "#9a6a43", door: "#8a5a35", other: "#a08060",
};
export const objectColor = (o: ObjectState): string => o.def.color ?? OBJECT_COLORS[o.def.type] ?? "#a08060";

const WALL_COLORS = {
  wall: { top: "#e2d8c8", face: "#a89a86", flat: "#5d5549" },
  partition: { top: "#d2bd9c", face: "#9a8468", flat: "#8a7a62" },
  window: { top: "#e2d8c8", face: "#a89a86", flat: "#7fc4e8" },
  hedge: { top: "#58a84d", face: "#33743a", flat: "#3f8a3f" },
} as const;

const K_WALL = 0;
const K_OBJ = 1;
const K_DOOR = 2;
const K_SEEKER = 3;
const K_PLAYER = 4;

interface Item {
  kind: number;
  base: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  idx: number;
  /** Walls: first tile and count drawn by this item; `u0`/`ulen` is the cached unit (same fog state) it is cut from. */
  tx: number;
  ty: number;
  len: number;
  u0: number;
  ulen: number;
  state: FogState;
  alpha: number;
  x: number;
  y: number;
  moving: boolean;
  canopy: boolean;
  /** Drawn directly every frame (characters, fading things) instead of from a cached piece. */
  dyn: boolean;
  /** Content signature of a static thing (what it looks like). */
  sig: number;
}
const newItem = (): Item => ({
  kind: 0, base: 0, x0: 0, y0: 0, x1: 0, y1: 0, idx: 0, tx: 0, ty: 0, len: 0, u0: 0, ulen: 0,
  state: FOG_VISIBLE, alpha: 1, x: 0, y: 0, moving: false, canopy: false, dyn: false, sig: 0,
});

/** One baseline of static things in the sorted list, with its resolved cached pieces. */
interface Group {
  i: number;
  j: number;
  /** All visible pieces are cached (else draw the baseline directly). */
  ok: boolean;
  /** Has a visible fading thing (drawn on top, so a band must end here). */
  hasDyn: boolean;
  pieces: Piece[];
}

/** A run of wall tiles with the same fog state: the unit that gets one cached sprite. */
interface WallUnit {
  ri: number;
  u0: number;
  len: number;
  state: FogState;
}

const byBaseKind = (a: Item, b: Item) => a.base - b.base || a.kind - b.kind;
const inView = (r: Rect4, v: Rect4) => !(r.x1 < v.x0 || r.x0 > v.x1 || r.y1 < v.y0 || r.y0 > v.y1);

export class Scene {
  private items: Item[] = [];
  private sortBuf: Item[] = [];
  private count = 0;
  private runs: WallRun[] = [];
  private units: WallUnit[] = [];
  private unitsVersion = -1;
  private wallFade: Float32Array = new Float32Array(0);
  private active = new Set<number>();
  private objFade: Float32Array = new Float32Array(0);
  private objFading = 0;
  private seekerOcc = new Map<string, number>();
  private pipOcc = 0;
  private level: LevelData | null = null;
  private tmpTargets = new Map<number, number>();
  private readonly pRect: Rect4 = { x0: 0, y0: 0, x1: 0, y1: 0 };
  private readonly tRect: Rect4 = { x0: 0, y0: 0, x1: 0, y1: 0 };
  /** Draw statistics for the debug overlay and benchmarks. */
  stats = { items: 0, wallSegs: 0, pieces: 0, direct: 0 };

  setLevel(level: LevelData): void {
    this.level = level;
    this.runs = buildWallRuns(level);
    this.units = [];
    this.unitsVersion = -1;
    this.wallFade = new Float32Array(level.size.w * level.size.h).fill(1);
    this.objFade = new Float32Array(level.objects.length).fill(1);
    this.objFading = 0;
    this.active.clear();
    this.seekerOcc.clear();
    this.pipOcc = 0;
  }

  get wallRunCount(): number {
    return this.runs.length;
  }

  /** 0..1 strength of the marker on the player (how much of a cover is over him). */
  get playerCover(): number {
    return this.pipOcc;
  }

  /** Current fade alpha of an object (1 = opaque). For tests and debugging. */
  objectAlpha(index: number): number {
    return this.objFade[index] ?? 1;
  }

  /** Current fade alpha of a wall tile. */
  wallAlpha(tx: number, ty: number): number {
    return this.level ? (this.wallFade[ty * this.level.size.w + tx] ?? 1) : 1;
  }

  private nextItem(): Item {
    let it = this.items[this.count];
    if (!it) {
      it = newItem();
      this.items[this.count] = it;
    }
    this.count++;
    return it;
  }

  /**
   * Update fade tweens. Everything that sorts after the player (baseline further south) and whose screen rect
   * overlaps his rect fades, however far away it stands. Walls and low furniture only count in the oblique
   * view; tree canopies count in both.
   */
  updateOcclusion(env: Env, dt: number): void {
    const { proj, level, world } = env;
    if (!this.level) return;
    const px = env.pip.x;
    const py = env.pip.y;
    const ob = proj.heightPx > 0;
    const pr = characterBounds(proj, proj.px(px), proj.py(py), 1, this.pRect);
    let minAlpha = 1;
    // wall tiles
    const targets = this.tmpTargets;
    targets.clear();
    if (ob) {
      const w = level.size.w;
      const T = proj.tileScreenW;
      const th = proj.tileScreenH;
      const bx0 = Math.max(0, Math.floor(pr.x0 / T));
      const bx1 = Math.min(w - 1, Math.floor(pr.x1 / T));
      const by0 = Math.max(0, Math.floor(py));
      const by1 = Math.min(level.size.h - 1, Math.floor((pr.y1 + TALL_WALL * proj.heightPx) / th));
      const tr = this.tRect;
      for (let ty = by0; ty <= by1; ty++) {
        for (let tx = bx0; tx <= bx1; tx++) {
          const h = wallHeightAt(level, tx, ty);
          if (h <= 0) continue;
          tr.x0 = proj.px(tx);
          tr.x1 = proj.px(tx + 1);
          tr.y0 = proj.py(ty, h);
          tr.y1 = proj.py(ty + 1, 0);
          targets.set(ty * w + tx, occlusionTarget(ty + 1 > py, rectsOverlap(tr, pr)));
        }
      }
    }
    for (const k of this.active) if (!targets.has(k)) targets.set(k, 1);
    for (const [k, tgt] of targets) {
      const cur = this.wallFade[k] ?? 1;
      const v = tweenAlpha(cur, tgt, dt);
      this.wallFade[k] = v;
      if (v < 1) {
        this.active.add(k);
        if (v < minAlpha) minAlpha = v;
      } else this.active.delete(k);
    }
    // objects (index = position in world.objects)
    const rect = this.tRect;
    let fading = 0;
    for (let i = 0; i < world.objects.length; i++) {
      const o = world.objects[i]!;
      const d = o.def;
      const isDoor = d.type === "door";
      if (o.height <= 0.02 && !isDoor) continue;
      if (!ob && d.type !== "tree") continue;
      const cur = this.objFade[i] ?? 1;
      let tgt = 1;
      if (d.y + d.h > py) {
        objectRect(proj, o, rect, isDoor ? Math.max(o.height, 1.4) : o.height);
        tgt = occlusionTarget(true, rectsOverlap(rect, pr));
      }
      if (tgt === 1 && cur === 1) continue;
      const v = tweenAlpha(cur, tgt, dt);
      this.objFade[i] = v;
      if (v < 1) {
        fading++;
        if (v < minAlpha) minAlpha = v;
      }
    }
    this.objFading = fading;
    this.pipOcc = silhouetteStrength(minAlpha);
  }

  /** Wall units (same-fog runs), rebuilt only when the fog changed. */
  private refreshUnits(env: Env): void {
    if (this.unitsVersion === env.fog.version) return;
    this.unitsVersion = env.fog.version;
    const units = this.units;
    units.length = 0;
    const fog = env.fog;
    for (let ri = 0; ri < this.runs.length; ri++) {
      const run = this.runs[ri]!;
      const end = run.x + run.len;
      let s = run.x;
      while (s < end) {
        const st = fog.at(s, run.y);
        let e = s;
        while (e + 1 < end && fog.at(e + 1, run.y) === st) e++;
        units.push({ ri, u0: s, len: e - s + 1, state: st });
        s = e + 1;
      }
    }
  }

  /**
   * Collect, sort and draw all standing things. Static things (alpha 1) are blitted from cached baseline
   * strips (`env.layers`); characters and fading things are drawn directly between them in y order.
   */
  draw(env: Env, dt: number): void {
    const { ctx, proj, world, level, fog, view } = env;
    this.count = 0;
    const st = this.stats;
    st.wallSegs = 0;
    st.pieces = 0;
    st.direct = 0;
    const w = level.size.w;
    const anyWallFade = this.active.size > 0;
    // walls: every unit (static things are not culled one by one; their cached pieces are)
    this.refreshUnits(env);
    for (let ui = 0; ui < this.units.length; ui++) {
      const u = this.units[ui]!;
      const run = this.runs[u.ri]!;
      const ry0 = proj.py(run.y, run.height);
      const ry1 = proj.py(run.y + 1, 0);
      const first = this.count;
      let faded = false;
      let s = u.u0;
      const end = u.u0 + u.len;
      while (s < end) {
        const fd = anyWallFade ? (this.wallFade[run.y * w + s] ?? 1) : 1;
        let e = s;
        if (anyWallFade) while (e + 1 < end && (this.wallFade[run.y * w + e + 1] ?? 1) === fd) e++;
        else e = end - 1;
        if (fd < 1) faded = true;
        const it = this.nextItem();
        it.kind = K_WALL;
        it.base = run.y + 1;
        it.x0 = proj.px(s) - BOUNDS_PAD;
        it.x1 = proj.px(e + 1) + BOUNDS_PAD;
        it.y0 = ry0 - BOUNDS_PAD;
        it.y1 = ry1 + BOUNDS_PAD;
        it.idx = u.ri;
        it.tx = s;
        it.ty = run.y;
        it.len = e - s + 1;
        it.u0 = u.u0;
        it.ulen = u.len;
        it.state = u.state;
        it.alpha = fd;
        it.canopy = false;
        it.dyn = false;
        it.sig = mixHash(mixHash(mixHash(HASH_SEED, 1 + u.ri), u.u0), u.state);
        st.wallSegs++;
        s = e + 1;
      }
      if (faded) for (let k = first; k < this.count; k++) this.items[k]!.dyn = true;
    }
    // objects and doors
    const rect = this.tRect;
    for (let i = 0; i < world.objects.length; i++) {
      const o = world.objects[i]!;
      const d = o.def;
      if (o.height <= 0.02 && d.type !== "door") continue; // rugs: floor layer
      const isDoor = d.type === "door";
      objectRect(proj, o, rect, isDoor ? Math.max(o.height, 1.4) : o.height);
      const it = this.nextItem();
      it.kind = isDoor ? K_DOOR : K_OBJ;
      it.base = d.y + d.h;
      it.x0 = rect.x0;
      it.x1 = rect.x1;
      it.y0 = rect.y0;
      it.y1 = rect.y1;
      it.idx = i;
      it.state = fog.at(Math.floor(d.x + d.w / 2), Math.floor(d.y + d.h / 2));
      it.alpha = this.objFade[i] ?? 1;
      it.canopy = d.type === "tree";
      it.dyn = it.alpha < 1;
      it.sig = mixHash(mixHash(mixHash(HASH_SEED, 100000 + i), it.state), o.state === "open" ? 1 : o.state === "closed" ? 2 : 0);
    }
    // seekers (only in visible tiles)
    const cr = this.pRect; // scratch (the player's rect is rebuilt below)
    for (let i = 0; i < world.seekers.length; i++) {
      const s = world.seekers[i]!;
      const x = lerp(s.px, s.x, env.alpha);
      const y = lerp(s.py, s.y, env.alpha);
      if (fog.at(Math.floor(x), Math.floor(y)) !== FOG_VISIBLE) continue;
      characterBounds(proj, proj.px(x), proj.py(y), seekerLook(s.type).scale, cr);
      if (cr.x1 < view.x0 || cr.x0 > view.x1 || cr.y1 < view.y0 || cr.y0 > view.y1) continue;
      const it = this.nextItem();
      it.kind = K_SEEKER;
      it.base = y;
      it.x0 = cr.x0;
      it.y0 = cr.y0;
      it.x1 = cr.x1;
      it.y1 = cr.y1;
      it.idx = i;
      it.x = x;
      it.y = y;
      it.moving = Math.hypot(s.x - s.px, s.y - s.py) > 0.0005;
      it.state = FOG_VISIBLE;
      it.alpha = 1;
      it.canopy = false;
      it.dyn = true;
    }
    // player
    {
      characterBounds(proj, proj.px(env.pip.x), proj.py(env.pip.y), 1, cr);
      const it = this.nextItem();
      it.kind = K_PLAYER;
      it.base = env.pip.y;
      it.x0 = cr.x0;
      it.y0 = cr.y0;
      it.x1 = cr.x1;
      it.y1 = cr.y1;
      it.idx = 0;
      it.x = env.pip.x;
      it.y = env.pip.y;
      it.moving = world.player.moving;
      it.state = FOG_VISIBLE;
      it.alpha = 1;
      it.canopy = false;
      it.dyn = true;
    }
    const list = this.sortBuf;
    list.length = this.count;
    for (let i = 0; i < this.count; i++) list[i] = this.items[i]!;
    list.sort(byBaseKind);
    st.items = this.count;
    // draw: static baselines from cached pieces / bands, characters and fading things directly, in y order
    const groups = this.groups;
    const seq = this.seq; // >= 0: group index, < 0: -(list index + 1) of a character
    seq.length = 0;
    let gn = 0;
    let i = 0;
    while (i < this.count) {
      const it = list[i]!;
      if (it.kind >= K_SEEKER) {
        seq.push(-(i + 1));
        i++;
        continue;
      }
      let j = i + 1;
      while (j < this.count && list[j]!.kind <= K_DOOR && list[j]!.base === it.base) j++;
      let g = groups[gn];
      if (!g) {
        g = { i: 0, j: 0, ok: false, hasDyn: true, pieces: [] };
        groups[gn] = g;
      }
      g.i = i;
      g.j = j;
      if (env.layers) g.ok = this.prepareBaseline(env, list, i, j, g);
      else {
        g.ok = false;
        g.hasDyn = true;
        g.pieces.length = 0;
      }
      seq.push(gn++);
      i = j;
    }
    let s = 0;
    while (s < seq.length) {
      const e = seq[s]!;
      if (e < 0) {
        this.drawCharacter(env, list[-e - 1]!);
        s++;
        continue;
      }
      let t = s;
      while (t + 1 < seq.length && seq[t + 1]! >= 0 && !groups[seq[t]!]!.hasDyn) t++;
      this.drawBand(env, list, groups, seq[s]!, seq[t]!);
      s = t + 1;
    }
    // markers for covered characters (drawn over everything)
    for (let k = 0; k < this.count; k++) {
      const it = list[k]!;
      if (it.kind !== K_SEEKER && it.kind !== K_PLAYER) continue;
      let strength: number;
      let fill = "#fff2b8";
      let scale = 1;
      let dogDir = 0;
      if (it.kind === K_PLAYER) strength = this.pipOcc;
      else {
        const s = world.seekers[it.idx]!;
        let covered = 0;
        for (let m = k + 1; m < this.count; m++) {
          const o = list[m]!;
          if (o.kind > K_DOOR || o.base <= it.base || o.alpha <= SILHOUETTE_MIN_COVER_ALPHA) continue;
          if (proj.heightPx === 0 && !o.canopy) continue;
          if (rectsOverlap(o, it)) {
            covered = 1;
            break;
          }
        }
        const cur = this.seekerOcc.get(s.id) ?? 0;
        strength = cur + (covered - cur) * (1 - Math.exp(-dt / OCCLUDE_TIME_CONST));
        if (Math.abs(strength - covered) < 0.01) strength = covered;
        this.seekerOcc.set(s.id, strength);
        const look = seekerLook(s.type);
        fill = look.body;
        scale = look.scale;
        dogDir = s.type === "dog" ? (Math.cos(s.facing) >= 0 ? 1 : -1) : 0;
      }
      if (strength > 0.02) drawSilhouette(ctx, proj, proj.px(it.x), proj.py(it.y), scale, Math.min(1, strength), fill, dogDir);
    }
  }

  private drawCharacter(env: Env, it: Item): void {
    const { ctx, proj, world } = env;
    if (it.kind === K_SEEKER) {
      const s = world.seekers[it.idx]!;
      drawSeeker(ctx, proj, proj.px(it.x), proj.py(it.y), s.type, s.facing, it.moving, s.state === "sleep", env.t);
    } else drawPip(ctx, proj, proj.px(it.x), proj.py(it.y), world.player.facing, it.moving, world.player.gait, env.t);
  }

  /**
   * Resolve the cached pieces of one baseline (list[i..j) = its static things in draw order).
   * Returns false when a piece needs painting but the budget is used up (draw the baseline directly).
   */
  private prepareBaseline(env: Env, list: Item[], i: number, j: number, g: Group): boolean {
    const { view } = env;
    const layers = env.layers!;
    g.pieces.length = 0;
    g.hasDyn = false;
    const pw = layers.pieceW;
    let kMin = Infinity;
    let kMax = -Infinity;
    for (let m = i; m < j; m++) {
      const it = list[m]!;
      if (it.dyn) {
        if (inView(it, view)) g.hasDyn = true;
        continue;
      }
      const k0 = Math.floor(it.x0 / pw);
      const k1 = Math.floor((it.x1 - 1e-6) / pw);
      if (k0 < kMin) kMin = k0;
      if (k1 > kMax) kMax = k1;
    }
    if (kMin > kMax) return true;
    const n = kMax - kMin + 1;
    const pc = this.pieceScratch(n);
    for (let m = i; m < j; m++) {
      const it = list[m]!;
      if (it.dyn) continue;
      const k0 = Math.floor(it.x0 / pw) - kMin;
      const k1 = Math.floor((it.x1 - 1e-6) / pw) - kMin;
      for (let k = k0; k <= k1; k++) {
        pc.sig[k] = mixHash(pc.sig[k]!, it.sig);
        if (it.y0 < pc.y0[k]!) pc.y0[k] = it.y0;
        if (it.y1 > pc.y1[k]!) pc.y1[k] = it.y1;
        const l = Math.max(it.x0, (k + kMin) * pw);
        const r = Math.min(it.x1, (k + kMin + 1) * pw);
        if (l < pc.x0[k]!) pc.x0[k] = l;
        if (r > pc.x1[k]!) pc.x1[k] = r;
      }
    }
    const baseKey = Math.round(list[i]!.base * 64) * 4096;
    for (let k = 0; k < n; k++) {
      if (pc.y1[k]! === -Infinity) continue;
      const x0 = pc.x0[k]!;
      const x1 = pc.x1[k]!;
      const y0 = pc.y0[k]!;
      const y1 = pc.y1[k]!;
      if (x1 < view.x0 || x0 > view.x1 || y1 < view.y0 || y0 > view.y1) continue;
      const key = baseKey + (k + kMin + 2048);
      const sig = mixHash(pc.sig[k]!, j - i);
      let p = layers.ready(key, sig, x0, y0, x1, y1);
      if (!p) {
        if (!layers.canPaint()) return false;
        const col = k + kMin;
        p = layers.paint(key, sig, x0, y0, x1, y1, (c) => this.paintStatics(env, c, list, i, j, col * pw, (col + 1) * pw));
        if (!p) return false;
      }
      g.pieces.push(p);
    }
    return true;
  }

  /**
   * Draw a run of baselines that has nothing dynamic between them. With two or more cached baselines the run is
   * merged into one cached band (one blit instead of one per baseline); fading things of the last baseline go on top.
   */
  private drawBand(env: Env, list: Item[], groups: Group[], a: number, b: number): void {
    const { ctx } = env;
    const st = this.stats;
    const bands = env.bands;
    let allCached = true;
    let pieces = 0;
    for (let g = a; g <= b; g++) {
      if (!groups[g]!.ok) allCached = false;
      pieces += groups[g]!.pieces.length;
    }
    if (bands && allCached && pieces > 1) {
      let sig = HASH_SEED;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let g = a; g <= b; g++)
        for (const p of groups[g]!.pieces) {
          sig = mixHash(mixHash(mixHash(sig, p.sig), Math.round(p.x)), Math.round(p.y));
          if (p.x < x0) x0 = p.x;
          if (p.y < y0) y0 = p.y;
          if (p.x + p.w > x1) x1 = p.x + p.w;
          if (p.y + p.h > y1) y1 = p.y + p.h;
        }
      const key = Math.round(list[groups[a]!.i]!.base * 64) * 65536 + Math.round(list[groups[b]!.i]!.base * 64);
      let band = bands.ready(key, sig, x0, y0, x1, y1);
      if (!band && bands.canPaint())
        band = bands.paint(key, sig, x0, y0, x1, y1, (c) => {
          for (let g = a; g <= b; g++) for (const p of groups[g]!.pieces) c.drawImage(p.img, p.x, p.y, p.w, p.h);
        });
      if (band) {
        ctx.drawImage(band.img, band.x, band.y, band.w, band.h);
        st.pieces++;
        this.drawFading(env, list, groups[b]!.i, groups[b]!.j);
        return;
      }
    }
    for (let g = a; g <= b; g++) {
      const gr = groups[g]!;
      if (gr.ok)
        for (const p of gr.pieces) {
          ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
          st.pieces++;
        }
      else this.paintStatics(env, ctx, list, gr.i, gr.j, -Infinity, Infinity, true);
      this.drawFading(env, list, gr.i, gr.j);
    }
  }

  /** Fading things of list[i..j), drawn directly with their alpha. */
  private drawFading(env: Env, list: Item[], i: number, j: number): void {
    const { ctx, view } = env;
    let curAlpha = 1;
    for (let m = i; m < j; m++) {
      const it = list[m]!;
      if (!it.dyn || !inView(it, view)) continue;
      if (it.alpha !== curAlpha) {
        ctx.globalAlpha = it.alpha;
        curAlpha = it.alpha;
      }
      this.paintItem(env, it, true);
      this.stats.direct++;
    }
    if (curAlpha !== 1) ctx.globalAlpha = 1;
  }

  /** Paint the non-fading things of list[i..j) that overlap [colX0, colX1) into `c`. `direct` = main canvas (cull by view). */
  private paintStatics(env: Env, c: Ctx, list: Item[], i: number, j: number, colX0: number, colX1: number, direct = false): void {
    const e = c === env.ctx ? env : { ...env, ctx: c };
    for (let m = i; m < j; m++) {
      const it = list[m]!;
      if (it.dyn || it.x1 <= colX0 || it.x0 >= colX1) continue;
      if (direct) {
        if (!inView(it, env.view)) continue;
        this.stats.direct++;
      }
      this.paintItem(e, it, false);
    }
  }

  private paintItem(env: Env, it: Item, segment: boolean): void {
    if (it.kind === K_WALL) {
      if (segment) this.drawWall(env, this.runs[it.idx]!, it.tx, it.len, it.state);
      else this.drawWall(env, this.runs[it.idx]!, it.u0, it.ulen, it.state);
      return;
    }
    const o = env.world.objects[it.idx]!;
    if (it.kind === K_DOOR) drawDoor(env, o, it.state);
    else drawObject(env, o, it.state);
  }

  private scratch = { sig: new Uint32Array(0), x0: new Float64Array(0), x1: new Float64Array(0), y0: new Float64Array(0), y1: new Float64Array(0) };
  private groups: Group[] = [];
  private seq: number[] = [];
  private pieceScratch(n: number) {
    let s = this.scratch;
    if (s.sig.length < n) {
      s = { sig: new Uint32Array(n * 2), x0: new Float64Array(n * 2), x1: new Float64Array(n * 2), y0: new Float64Array(n * 2), y1: new Float64Array(n * 2) };
      this.scratch = s;
    }
    s.sig.fill(HASH_SEED, 0, n);
    s.x0.fill(Infinity, 0, n);
    s.y0.fill(Infinity, 0, n);
    s.x1.fill(-Infinity, 0, n);
    s.y1.fill(-Infinity, 0, n);
    return s;
  }

  private drawWall(env: Env, run: WallRun, tx: number, len: number, state: FogState): void {
    const { ctx, proj } = env;
    const pal = WALL_COLORS[run.kind];
    const T = proj.tileScreenW;
    if (proj.heightPx === 0) {
      drawBox(ctx, proj, tx, run.y, len, 1, 0, fogColor(pal.flat, state), fogColor(pal.flat, state));
      return;
    }
    const h = run.height;
    const top = fogColor(pal.top, state);
    const face = fogColor(pal.face, state);
    if (run.kind === "hedge") {
      const x0 = proj.px(tx) + 2;
      const yTop = proj.py(run.y, h);
      const yBase = proj.py(run.y + 1, 0);
      ctx.fillStyle = face;
      roundRectPath(ctx, x0, yTop, len * T - 4, yBase - yTop, 0.22 * T);
      ctx.fill();
      ctx.fillStyle = top;
      roundRectPath(ctx, x0, yTop, len * T - 4, (yBase - yTop) * 0.55, 0.22 * T);
      ctx.fill();
      ctx.fillStyle = fogColor(shade(pal.face, 0.8), state);
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const gx = proj.px(tx + i);
        ctx.rect(gx + 0.22 * T, yTop + 0.1 * T, 3, 3);
        ctx.rect(gx + 0.62 * T, yTop + 0.3 * T, 3, 3);
        ctx.rect(gx + 0.4 * T, yBase - 0.2 * T, 3, 3);
      }
      ctx.fill();
      return;
    }
    drawBox(ctx, proj, tx, run.y, len, 1, h, top, face);
    const x0 = proj.px(tx);
    const w = len * T;
    const yFront = proj.py(run.y + 1, h);
    const yBase = proj.py(run.y + 1, 0);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x0, yFront - 1.5, w, 1.5);
    if (h >= 1) {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x0, yBase - 0.12 * T, w, 0.12 * T);
    }
    if (run.kind === "window") {
      ctx.fillStyle = fogColor("#8fd0f0", state);
      if (h >= 1) {
        const fh = yBase - yFront;
        ctx.fillRect(x0 + 0.1 * T, yFront + fh * 0.2, w - 0.2 * T, fh * 0.5);
        ctx.fillStyle = fogColor("#d8f2ff", state);
        ctx.fillRect(x0 + 0.1 * T, yFront + fh * 0.2, w - 0.2 * T, fh * 0.1);
        ctx.fillStyle = fogColor("#cfc3b0", state);
        for (let i = 0; i <= len; i++) ctx.fillRect(proj.px(tx + i) - (i === 0 ? -0.06 * T : i === len ? 0.16 * T : 0.05 * T), yFront + fh * 0.2, 0.1 * T, fh * 0.5);
      } else {
        ctx.fillRect(x0 + 0.1 * T, proj.py(run.y, h) + 0.15 * T, w - 0.2 * T, proj.py(run.y + 1, h) - proj.py(run.y, h) - 0.3 * T);
      }
    } else if (run.kind === "wall" && h >= TALL_WALL - 0.01) {
      // faint brick/panel seam every tile on the tall face
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      for (let i = 1; i < len; i++) ctx.fillRect(proj.px(tx + i), yFront, 1, yBase - yFront);
    }
  }
}

/* ------------------------------ objects ------------------------------ */

export function drawObject(env: Env, o: ObjectState, state: FogState): void {
  const { ctx, proj } = env;
  const d = o.def;
  const base = objectColor(o);
  const top = fogColor(shade(base, 1.14), state);
  const face = fogColor(shade(base, 0.76), state);
  const T = proj.tileScreenW;
  const h = o.height;
  const ob = proj.heightPx > 0;
  // soft contact shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(proj.px(d.x) - 2, proj.py(d.y + d.h) - 3, d.w * T + 4, 6);
  if (d.type === "tree") {
    const cx = proj.px(d.x + d.w / 2);
    const trunkTop = proj.py(d.y + d.h / 2, 0.9);
    ctx.fillStyle = fogColor("#6b4a2b", state);
    ctx.fillRect(cx - 0.1 * T, trunkTop, 0.2 * T, proj.py(d.y + d.h * 0.7, 0) - trunkTop);
    const r = Math.max(d.w, d.h) * T * 0.8;
    const cy = proj.py(d.y + d.h / 2, Math.max(h, 1.4));
    ctx.fillStyle = face;
    ellipse(ctx, cx, cy + 0.12 * r, r, r * 0.9);
    ctx.fill();
    ctx.fillStyle = top;
    ellipse(ctx, cx - 0.08 * r, cy - 0.1 * r, r * 0.85, r * 0.75);
    ctx.fill();
    return;
  }
  if (d.type === "plant" || d.type === "barrel" || d.type === "lamp") {
    const cx = proj.px(d.x + d.w / 2);
    const r = (Math.min(d.w, d.h) * T) / 2;
    const yb = proj.py(d.y + d.h, 0);
    const pot = fogColor(d.type === "plant" ? "#a5603a" : shade(base, 0.7), state);
    if (!ob) {
      ctx.fillStyle = face;
      ellipse(ctx, cx, proj.py(d.y + d.h / 2), r, r);
      ctx.fill();
      ctx.fillStyle = top;
      ellipse(ctx, cx, proj.py(d.y + d.h / 2), r * 0.7, r * 0.7);
      ctx.fill();
      return;
    }
    const topY = proj.py(d.y + d.h / 2, h);
    ctx.fillStyle = d.type === "plant" ? pot : face;
    ctx.fillRect(cx - r, topY, r * 2, yb - r * 0.3 - topY);
    ellipse(ctx, cx, yb - r * 0.3, r, r * 0.45);
    ctx.fill();
    ctx.fillStyle = d.type === "plant" ? fogColor("#3f9a4c", state) : top;
    ellipse(ctx, cx, topY - (d.type === "plant" ? r * 0.7 : 0), d.type === "plant" ? r * 1.3 : r, d.type === "plant" ? r * 1.1 : r * 0.45);
    ctx.fill();
    return;
  }
  drawBox(ctx, proj, d.x, d.y, d.w, d.h, h, top, face);
  const x0 = proj.px(d.x);
  const w = d.w * T;
  const yTop0 = proj.py(d.y, h);
  const yTop1 = proj.py(d.y + d.h, h);
  const yBase = proj.py(d.y + d.h, 0);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(x0, yTop1 - 1.5, w, 1.5);
  switch (d.type) {
    case "bed":
      ctx.fillStyle = fogColor("#f2f2ee", state);
      if (d.w >= d.h) ctx.fillRect(x0 + 0.08 * T, yTop0 + 0.12 * (yTop1 - yTop0), 0.4 * T, (yTop1 - yTop0) * 0.76);
      else ctx.fillRect(x0 + 0.1 * w, yTop0 + 0.06 * (yTop1 - yTop0), w * 0.8, 0.28 * (yTop1 - yTop0));
      break;
    case "wardrobe":
    case "closet":
    case "dresser":
    case "fridge":
    case "bookshelf":
      if (ob && yBase > yTop1) {
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(x0 + w / 2 - 0.75, yTop1 + 3, 1.5, yBase - yTop1 - 5);
        ctx.fillStyle = fogColor("#e9d9a0", state);
        ctx.fillRect(x0 + w / 2 - 6, yTop1 + (yBase - yTop1) * 0.5, 3, 6);
        ctx.fillRect(x0 + w / 2 + 3, yTop1 + (yBase - yTop1) * 0.5, 3, 6);
      }
      break;
    case "sofa":
    case "armchair":
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(x0, yTop0, w, (yTop1 - yTop0) * 0.35);
      break;
    case "table":
    case "table_cloth":
    case "desk":
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(x0 + 4, yTop0 + 4, w - 8, (yTop1 - yTop0) * 0.3);
      break;
    default:
      break;
  }
}

export function drawRug(env: Env, o: ObjectState, state: FogState): void {
  const { ctx, proj } = env;
  const d = o.def;
  const base = objectColor(o);
  const x = proj.px(d.x);
  const y = proj.py(d.y);
  const w = d.w * proj.tileScreenW;
  const h = d.h * proj.tileScreenH;
  ctx.fillStyle = fogColor(shade(base, 0.85), state);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fogColor(base, state);
  ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
  ctx.fillStyle = fogColor(shade(base, 1.25), state);
  ctx.fillRect(x + 11, y + 11, w - 22, 2);
  ctx.fillRect(x + 11, y + h - 13, w - 22, 2);
}

export function drawDoor(env: Env, o: ObjectState, state: FogState): void {
  const { ctx, proj } = env;
  const d = o.def;
  const T = proj.tileScreenW;
  const base = objectColor(o);
  const hgt = Math.max(o.height, 1.4);
  const alongX = d.w >= d.h;
  if (o.state === "open") {
    const post = 0.12;
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(proj.px(d.x), proj.py(d.y + d.h) - 3, d.w * T, 5);
    const frame = fogColor(shade(base, 0.9), state);
    const topC = fogColor(shade(base, 1.2), state);
    if (alongX) {
      drawBox(ctx, proj, d.x, d.y, post, d.h, hgt, topC, frame);
      drawBox(ctx, proj, d.x + d.w - post, d.y, post, d.h, hgt, topC, frame);
    } else {
      drawBox(ctx, proj, d.x, d.y, d.w, post, hgt, topC, frame);
      drawBox(ctx, proj, d.x, d.y + d.h - post, d.w, post, hgt, topC, frame);
    }
    if (proj.heightPx > 0) {
      ctx.fillStyle = topC;
      ctx.fillRect(proj.px(d.x), proj.py(d.y + d.h, hgt) - 0.1 * T, d.w * T, 0.1 * T);
    }
    return;
  }
  const top = fogColor(shade(base, 1.15), state);
  const face = fogColor(shade(base, 0.8), state);
  drawBox(ctx, proj, d.x, d.y, d.w, d.h, hgt, top, face);
  if (proj.heightPx > 0) {
    const yTop1 = proj.py(d.y + d.h, hgt);
    const yBase = proj.py(d.y + d.h, 0);
    ctx.fillStyle = fogColor("#f1d98a", state);
    ctx.fillRect(proj.px(d.x + d.w) - 0.2 * T, yTop1 + (yBase - yTop1) * 0.5, 5, 5);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(proj.px(d.x) + 4, yTop1 + 5, d.w * T - 8, (yBase - yTop1) * 0.4);
  }
}

export type { Ctx };
