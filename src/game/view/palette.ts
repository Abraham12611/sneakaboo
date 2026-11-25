/** Colour helpers with memoised string results (the draw path must not allocate colour strings per call). */

export type RGB = readonly [number, number, number];

const rgbCache = new Map<string, RGB>();

export function parseHex(hex: string): RGB {
  const hit = rgbCache.get(hex);
  if (hit) return hit;
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  const v: RGB = Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [128, 128, 128];
  rgbCache.set(hex, v);
  return v;
}

const c255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
export function rgbStr(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) | (c255(r) << 16) | (c255(g) << 8) | c255(b)).toString(16).slice(1);
}

const shadeCache = new Map<string, string>();
/** Multiply brightness (f < 1 darker, f > 1 lighter towards white). */
export function shade(hex: string, f: number): string {
  const key = `${hex}|s${f}`;
  const hit = shadeCache.get(key);
  if (hit) return hit;
  const [r, g, b] = parseHex(hex);
  const out = f <= 1 ? rgbStr(r * f, g * f, b * f) : rgbStr(r + (255 - r) * (f - 1), g + (255 - g) * (f - 1), b + (255 - b) * (f - 1));
  shadeCache.set(key, out);
  return out;
}

const mixCache = new Map<string, string>();
export function mixHex(a: string, b: string, t: number): string {
  const key = `${a}|${b}|${t}`;
  const hit = mixCache.get(key);
  if (hit) return hit;
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const out = rgbStr(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
  mixCache.set(key, out);
  return out;
}

/** Ids of the colour-transform cache entries must stay bounded; levels have few distinct colours. */
export function clearColorCaches(): void {
  shadeCache.clear();
  mixCache.clear();
}
