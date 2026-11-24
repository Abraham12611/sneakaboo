// Prop visual manifest. Each kind has a procedural placeholder (boxes with top + front faces) AND a sprite
// spec (anchor / width) so real art can be swapped in later without touching sim or scene code.
// Sprite anchor: (ax, ay) is a fraction of the image; placed at the bottom-centre of the prop footprint.
import type { PropInst } from '../sim/level';
import { boxColors, type Emitter } from './emitter';

export interface SpriteSpec { widthTiles: number; ax: number; ay: number; dyTiles: number }
export interface PropVisual { draw: (E: Emitter, p: PropInst) => void; sprite: SpriteSpec }

const WOOD = '#8a5a3a';

const bed = (E: Emitter, p: PropInst) => {
  const { x, y } = p, x1 = x + p.w, y1 = y + p.h;
  E.box(x, y, x1, y1, 0, 0.38, boxColors(WOOD));
  E.box(x + 0.06, y + 0.08, x1 - 0.04, y1 - 0.06, 0.38, 0.56, { top: '#f3e6d2', front: '#d6c1a3' });
  E.box(x + 0.75, y + 0.08, x1 - 0.04, y1 - 0.06, 0.56, 0.62, { top: '#b8404a', front: '#8c2f38' });
  E.box(x + 0.12, y + 0.2, x + 0.62, y1 - 0.2, 0.56, 0.7, { top: '#fff7ea', front: '#e6d8c0' });
  E.box(x, y, x + 0.12, y1, 0, p.height, boxColors('#6e4128'));
};

const wardrobe = (E: Emitter, p: PropInst) => {
  const { x, y } = p, x1 = x + p.w, y1 = y + p.h;
  E.box(x, y, x1, y1, 0, p.height, boxColors('#7c4a30'));
  if (!E.flat) {
    const mid = x + p.w / 2;
    E.line([[mid, y1, 0.08], [mid, y1, p.height - 0.1]], '#3d2415', 2);
    E.line([[x + 0.1, y1, p.height - 0.12], [x1 - 0.1, y1, p.height - 0.12]], '#5a3322', 2);
    E.blob(mid - 0.12, y1, 0.75, 3, 3, '#e6b84a');
    E.blob(mid + 0.12, y1, 0.75, 3, 3, '#e6b84a');
  } else E.line([[x + p.w / 2, y + 0.1, 0], [x + p.w / 2, y1 - 0.1, 0]], '#3d2415', 2);
};

const table = (E: Emitter, p: PropInst) => {
  const { x, y } = p, x1 = x + p.w, y1 = y + p.h;
  E.box(x + 0.04, y + 0.04, x1 - 0.04, y1 - 0.04, 0, p.height, { top: '#f6f0e2', front: '#e7dfca' });
  if (!E.flat) E.poly([[x + 0.04, y1 - 0.04, 0], [x1 - 0.04, y1 - 0.04, 0], [x1 - 0.04, y1 - 0.04, 0.14], [x + 0.04, y1 - 0.04, 0.14]], '#c8553d');
  E.box(x + p.w / 2 - 0.12, y + p.h / 2 - 0.12, x + p.w / 2 + 0.12, y + p.h / 2 + 0.12, p.height, p.height + 0.28, { top: '#4f9bd1', front: '#3a78a6' });
};

const sofa = (E: Emitter, p: PropInst) => {
  const { x, y } = p, x1 = x + p.w, y1 = y + p.h;
  const c = boxColors('#4f8a86');
  E.box(x, y, x1, y1, 0, 0.4, c);
  E.box(x, y, x1, y + 0.32, 0.4, p.height, boxColors('#437a76'));
  E.box(x, y + 0.32, x + 0.26, y1, 0.4, 0.62, boxColors('#437a76'));
  E.box(x1 - 0.26, y + 0.32, x1, y1, 0.4, 0.62, boxColors('#437a76'));
  E.box(x + 0.32, y + 0.4, x1 - 0.32, y1 - 0.04, 0.4, 0.5, { top: '#6aa8a2', front: '#4f8a86' });
};

const plant = (E: Emitter, p: PropInst) => {
  const cx = p.x + 0.5, cy = p.y + 0.5;
  E.box(cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, 0, 0.32, boxColors('#b8643c'));
  if (E.flat) { E.blob(cx, cy, 0, E.T * 0.42, E.T * 0.42, '#3f9a52', 0.95, '#2b6e3a', 1.5); return; }
  const H = E.H;
  E.blob(cx, cy, 0.55, 0.3 * E.T, 0.26 * H, '#2f7d44');
  E.blob(cx - 0.12, cy, 0.8, 0.26 * E.T, 0.24 * H, '#3f9a52');
  E.blob(cx + 0.1, cy, 0.95, 0.22 * E.T, 0.2 * H, '#58b565');
};

const simpleBox = (base: string, bright = 0): ((E: Emitter, p: PropInst) => void) => (E, p) => {
  E.box(p.x + 0.12, p.y + 0.12, p.x + p.w - 0.12, p.y + p.h - 0.12, 0, p.height, boxColors(base));
  if (bright && !E.flat) E.line([[p.x + 0.12, p.y + p.h - 0.12, p.height * 0.55], [p.x + p.w - 0.12, p.y + p.h - 0.12, p.height * 0.55]], '#3a2a1a', 2);
};

const spr = (widthTiles: number, ax = 0.5, ay = 1, dyTiles = 0): SpriteSpec => ({ widthTiles, ax, ay, dyTiles });

export const MANIFEST: Record<string, PropVisual> = {
  bed: { draw: bed, sprite: spr(2.0) },
  wardrobe: { draw: wardrobe, sprite: spr(1.0) },
  table: { draw: table, sprite: spr(2.0) },
  sofa: { draw: sofa, sprite: spr(2.0) },
  plant: { draw: plant, sprite: spr(1.0) },
  crate: { draw: simpleBox('#b08a52', 1), sprite: spr(1.0) },
  pot: { draw: simpleBox('#b8643c'), sprite: spr(1.0) },
  box: { draw: simpleBox('#c9a36b', 1), sprite: spr(0.9) },
  stool: { draw: simpleBox('#7a5a3c'), sprite: spr(1.1) },
};
