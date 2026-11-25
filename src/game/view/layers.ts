/**
 * Cached pieces of pre-painted world layers (projected px, device-pixel aligned).
 *
 * Used for:
 * - stand layers: every static standing thing (wall units, furniture, doors) that shares a baseline is
 *   painted once into a wide horizontal strip; the scene blits one strip per baseline and interleaves the
 *   characters between baselines, so y-sorting stays exact;
 * - floor composites (floor chunks + fog overlay + rugs) and the debug world overlay.
 *
 * Measured in Chromium at 4x CPU throttle, one `drawImage` costs about as much as 10 `fillRect`s, so the
 * win comes from few, large blits. Pieces are ImageBitmaps where available (cheaper to blit than canvases).
 * A piece is repainted only when its content signature changes or the projection / device scale changes.
 * Repaints are budgeted per frame; over budget the caller draws directly, so nothing causes a long frame.
 */
import type { CanvasFactory, OffscreenLike } from "./chunks";

/** Max piece width in device px. */
export const PIECE_DEV = 4096;
/** Default max device px kept before the least recently used pieces are dropped (~48 MB). */
export const DEFAULT_MAX_AREA = 12_000_000;

export interface Piece {
  canvas: OffscreenLike;
  img: CanvasImageSource;
  sig: number;
  /** Top-left in projected px (aligned to the device pixel grid) and size in projected px. */
  x: number;
  y: number;
  w: number;
  h: number;
  pw: number;
  ph: number;
  used: number;
}

/** FNV-1a style mix of one integer into a running 32-bit hash. */
export function mixHash(h: number, v: number): number {
  return Math.imul(h ^ (v | 0), 16777619) >>> 0;
}
export const HASH_SEED = 2166136261;

export class PieceCache {
  private map = new Map<number, Piece>();
  private tag = "";
  private frame = 0;
  private area = 0;
  /** Device px per projected px of the cached pieces. */
  step = 1;
  /** Piece repaints over the lifetime / this frame. */
  repaints = 0;
  frameRepaints = 0;

  constructor(
    private readonly factory: CanvasFactory,
    /** Max repaints per frame. */
    public budget = 4,
    /** Max device px kept (least recently used pieces are dropped beyond it). */
    private readonly maxArea = DEFAULT_MAX_AREA,
  ) {}

  get size(): number {
    return this.map.size;
  }

  /** Projected px width of one piece column at the current step. */
  get pieceW(): number {
    return PIECE_DEV / this.step;
  }

  begin(tag: string, step: number): void {
    this.frame++;
    this.frameRepaints = 0;
    if (tag !== this.tag || step !== this.step) {
      this.clear();
      this.tag = tag;
      this.step = step;
    }
  }

  clear(): void {
    for (const p of this.map.values()) closeImg(p);
    this.map.clear();
    this.area = 0;
  }

  /** The cached piece when it has this signature and these bounds, else null (needs painting). */
  ready(key: number, sig: number, x0: number, y0: number, x1: number, y1: number): Piece | null {
    const p = this.map.get(key);
    if (!p || p.sig !== sig) return null;
    const step = this.step;
    const x = Math.floor(x0 * step) / step;
    const y = Math.floor(y0 * step) / step;
    if (p.x !== x || p.y !== y || p.pw !== Math.max(1, Math.ceil((x1 - x) * step)) || p.ph !== Math.max(1, Math.ceil((y1 - y) * step))) return null;
    p.used = this.frame;
    return p;
  }

  /** Whether another piece may be painted this frame. */
  canPaint(): boolean {
    return this.frameRepaints < this.budget;
  }

  /** Paint (or repaint) a piece. `paint` draws in absolute projected px. Returns null without a 2D context. */
  paint(key: number, sig: number, x0: number, y0: number, x1: number, y1: number, paint: (ctx: CanvasRenderingContext2D) => void): Piece | null {
    const step = this.step;
    const x = Math.floor(x0 * step) / step;
    const y = Math.floor(y0 * step) / step;
    const pw = Math.max(1, Math.ceil((x1 - x) * step));
    const ph = Math.max(1, Math.ceil((y1 - y) * step));
    let p = this.map.get(key);
    if (p && (p.pw !== pw || p.ph !== ph)) {
      closeImg(p);
      this.map.delete(key);
      this.area -= p.pw * p.ph;
      p = undefined;
    }
    if (!p) {
      this.evict(pw * ph);
      const canvas = this.factory(pw, ph);
      p = { canvas, img: canvas as CanvasImageSource, sig: 0, x, y, w: pw / step, h: ph / step, pw, ph, used: this.frame };
      this.map.set(key, p);
      this.area += pw * ph;
    }
    const ctx = p.canvas.getContext("2d") as CanvasRenderingContext2D | null;
    if (!ctx) return null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pw, ph);
    ctx.setTransform(step, 0, 0, step, -x * step, -y * step);
    paint(ctx);
    const oc = p.canvas as OffscreenCanvas;
    if (typeof oc.transferToImageBitmap === "function") {
      closeImg(p);
      p.img = oc.transferToImageBitmap();
    }
    p.sig = sig;
    p.x = x;
    p.y = y;
    p.used = this.frame;
    this.repaints++;
    this.frameRepaints++;
    return p;
  }

  private evict(need: number): void {
    if (this.area + need <= this.maxArea) return;
    const old = [...this.map.entries()].filter(([, p]) => p.used < this.frame).sort((a, b) => a[1].used - b[1].used);
    for (const [k, p] of old) {
      if (this.area + need <= this.maxArea) break;
      closeImg(p);
      this.map.delete(k);
      this.area -= p.pw * p.ph;
    }
  }
}

function closeImg(p: Piece): void {
  if (p.img !== (p.canvas as unknown)) (p.img as { close?: () => void }).close?.();
}


interface Label {
  img: CanvasImageSource;
  /** Size in label units (before the device scale). */
  w: number;
  h: number;
}

/**
 * Small text labels (HOME badge, room-name hints) pre-rendered into bitmaps per device scale, so a frame
 * blits them instead of running save/translate/scale/fillText/restore every time.
 */
export class LabelCache {
  private map = new Map<string, Label>();
  constructor(private readonly factory: CanvasFactory) {}

  clear(): void {
    for (const l of this.map.values()) (l.img as { close?: () => void }).close?.();
    this.map.clear();
  }

  /**
   * Draw `text` centred at (cx, cy) in the current transform, `unit` projected px per label px,
   * `devScale` device px per projected px. `bg` paints a badge of `bgW` x `bgH` label px behind the text.
   */
  draw(ctx: CanvasRenderingContext2D, text: string, font: string, color: string, cx: number, cy: number, unit: number, devScale: number, bg?: { color: string; w: number; h: number }): void {
    const k = Math.max(0.25, Math.round(unit * devScale * 100) / 100);
    const key = `${text}|${font}|${color}|${bg ? bg.color : ""}|${k}`;
    let l = this.map.get(key);
    if (!l) {
      const probe = this.factory(1, 1).getContext("2d") as CanvasRenderingContext2D | null;
      if (!probe) return;
      probe.font = font;
      const tw = Math.ceil(probe.measureText(text).width ?? 0) + 4;
      const size = Number(/(\d+)px/.exec(font)?.[1] ?? 14);
      const w = Math.max(tw, bg?.w ?? 0);
      const h = Math.max(size + 6, bg?.h ?? 0);
      const canvas = this.factory(Math.ceil(w * k), Math.ceil(h * k));
      const c = canvas.getContext("2d") as CanvasRenderingContext2D | null;
      if (!c) return;
      c.setTransform(k, 0, 0, k, 0, 0);
      if (bg) {
        c.fillStyle = bg.color;
        c.fillRect((w - bg.w) / 2, (h - bg.h) / 2, bg.w, bg.h);
      }
      c.font = font;
      c.fillStyle = color;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(text, w / 2, h / 2);
      const oc = canvas as OffscreenCanvas;
      const img = typeof oc.transferToImageBitmap === "function" ? oc.transferToImageBitmap() : (canvas as CanvasImageSource);
      l = { img, w, h };
      if (this.map.size > 64) this.clear();
      this.map.set(key, l);
    }
    ctx.drawImage(l.img, cx - (l.w * unit) / 2, cy - (l.h * unit) / 2, l.w * unit, l.h * unit);
  }
}