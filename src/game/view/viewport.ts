/** Logical 1280x720 viewport, letterboxed into the real canvas. */
export const LOGICAL_W = 1280;
export const LOGICAL_H = 720;
export const MAX_DPR = 2;

export interface Viewport {
  cssW: number;
  cssH: number;
  dpr: number;
  /** CSS px per logical px. */
  scale: number;
  /** CSS px offset of the logical viewport inside the canvas (letterbox bars). */
  offX: number;
  offY: number;
}

export function computeViewport(cssW: number, cssH: number, dpr: number): Viewport {
  const w = Math.max(1, cssW);
  const h = Math.max(1, cssH);
  const d = Math.max(1, Math.min(MAX_DPR, dpr || 1));
  const scale = Math.min(w / LOGICAL_W, h / LOGICAL_H);
  return {
    cssW: w,
    cssH: h,
    dpr: d,
    scale,
    offX: (w - LOGICAL_W * scale) / 2,
    offY: (h - LOGICAL_H * scale) / 2,
  };
}

/** Counter-scale for world-space UI (bubbles, rings): on-screen size follows zoom but stays within 0.8..1.4. */
export function worldUiScale(zoom: number): number {
  const eff = Math.max(0.8, Math.min(1.4, zoom));
  return eff / zoom;
}
