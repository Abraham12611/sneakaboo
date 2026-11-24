// Renderer-agnostic draw commands. The scene builder emits these; each Renderer consumes them.
// World-layer coordinates are projected pixels at zoom 1 (the renderer applies camera + zoom).
// HUD-layer coordinates are logical 1280x720 pixels.
export type Cmd =
  | { t: 'poly'; p: number[]; f?: string; a: number; s?: string; sw?: number; open?: boolean }
  | { t: 'ell'; x: number; y: number; rx: number; ry: number; f?: string; a: number; s?: string; sw?: number }
  | { t: 'cone'; p: number[]; x: number; y: number; r: number; c: string; a: number }
  | { t: 'text'; x: number; y: number; str: string; size: number; f: string; a: number; align: 'center' | 'left' | 'right'; bold?: boolean }
  | { t: 'sprite'; key: string; x: number; y: number; w: number; h: number; ax: number; ay: number; a: number };

export interface Frame {
  world: Cmd[];
  hud: Cmd[];
  camPx: { x: number; y: number };
  zoom: number;
}

export const LOGICAL_W = 1280;
export const LOGICAL_H = 720;

export interface RendererStats { drawCalls: number | null; objects: number }

export interface Renderer {
  readonly name: 'pixi' | 'canvas';
  readonly canvas: HTMLCanvasElement;
  init(parent: HTMLElement): Promise<void>;
  /** css size of the (16:9) canvas and device pixel ratio (already capped). */
  resize(cssW: number, cssH: number, dpr: number): void;
  addImage(key: string, img: HTMLImageElement): void;
  render(frame: Frame): void;
  stats(): RendererStats;
  destroy(): void;
}
