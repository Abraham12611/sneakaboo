import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { LOGICAL_H, LOGICAL_W, type Cmd, type Frame, type Renderer, type RendererStats } from './cmds';

interface Pool { g: Graphics[]; s: Sprite[]; t: Text[]; gi: number; si: number; ti: number; root: Container }

/**
 * PixiJS v8 renderer. Consumes the same Cmd list as the Canvas renderer.
 * Consecutive vector commands go into one pooled Graphics (rebuilt each frame); sprites and text break the run so
 * painter order stays correct. NOTE: rebuilding Graphics every frame is the naive path - a production version
 * would use pooled Sprites for props/characters and cache static geometry.
 */
export class PixiRenderer implements Renderer {
  readonly name = 'pixi' as const;
  canvas!: HTMLCanvasElement;
  private app!: Application;
  private world = this.mkPool();
  private hud = this.mkPool();
  private tex = new Map<string, Texture>();
  private calls = 0;
  private lastCalls = 0;
  private objects = 0;
  fillMs = 0; glMs = 0;

  private mkPool(): Pool { return { g: [], s: [], t: [], gi: 0, si: 0, ti: 0, root: new Container() }; }

  async init(parent: HTMLElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width: LOGICAL_W, height: LOGICAL_H, backgroundColor: 0x10101a, antialias: new URLSearchParams(location.search).get('aa') !== '0',
      resolution: 1, autoDensity: true, autoStart: false, preference: 'webgl', powerPreference: 'high-performance',
    });
    this.canvas = this.app.canvas as HTMLCanvasElement;
    parent.appendChild(this.canvas);
    this.app.stage.addChild(this.world.root, this.hud.root);
    const gl = (this.app.renderer as unknown as { gl?: WebGL2RenderingContext }).gl;
    if (gl) { // count real GL draw calls
      for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced'] as const) {
        const orig = (gl as any)[fn].bind(gl);
        (gl as any)[fn] = (...a: unknown[]) => { this.calls++; return orig(...a); };
      }
    }
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.app.renderer.resize(cssW, cssH, dpr);
    this.app.stage.scale.set(cssW / LOGICAL_W);
  }

  addImage(key: string, img: HTMLImageElement): void { this.tex.set(key, Texture.from(img)); }

  render(f: Frame): void {
    this.calls = 0;
    this.objects = 0;
    const z = f.zoom;
    this.world.root.scale.set(z);
    this.world.root.position.set(LOGICAL_W / 2 - f.camPx.x * z, LOGICAL_H / 2 - f.camPx.y * z);
    const t0 = performance.now();
    this.fill(this.world, f.world);
    this.fill(this.hud, f.hud);
    const t1 = performance.now();
    this.app.render();
    this.fillMs = t1 - t0; this.glMs = performance.now() - t1;
    this.lastCalls = this.calls;
  }

  private fill(pool: Pool, cmds: Cmd[]): void {
    pool.gi = pool.si = pool.ti = 0;
    pool.root.removeChildren();
    let g: Graphics | null = null;
    const getG = (): Graphics => {
      if (g) return g;
      g = pool.g[pool.gi] ?? (pool.g[pool.gi] = new Graphics());
      pool.gi++;
      g.clear();
      pool.root.addChild(g);
      return g;
    };
    for (let i = 0; i < cmds.length; i++) {
      const c = cmds[i];
      switch (c.t) {
        case 'poly': {
          const gg = getG();
          gg.poly(c.p, !c.open);
          if (c.f) gg.fill({ color: c.f, alpha: c.a });
          if (c.s) gg.stroke({ width: c.sw ?? 1, color: c.s, alpha: c.a });
          break;
        }
        case 'ell': {
          const gg = getG();
          gg.ellipse(c.x, c.y, Math.max(0.01, c.rx), Math.max(0.01, c.ry));
          if (c.f) gg.fill({ color: c.f, alpha: c.a });
          if (c.s) gg.stroke({ width: c.sw ?? 1, color: c.s, alpha: c.a });
          break;
        }
        case 'cone': { // banded approximation of a radial gradient: nested copies scaled about the apex
          const gg = getG();
          const bands = [1, 0.8, 0.6, 0.4, 0.2];
          for (const b of bands) {
            const p = c.p, q = new Array<number>(p.length);
            for (let k = 0; k < p.length; k += 2) { q[k] = c.x + (p[k] - c.x) * b; q[k + 1] = c.y + (p[k + 1] - c.y) * b; }
            gg.poly(q, true).fill({ color: c.c, alpha: c.a * 0.24 });
          }
          break;
        }
        case 'text': {
          g = null;
          const t = pool.t[pool.ti] ?? (pool.t[pool.ti] = new Text({ text: '', style: { fontFamily: 'system-ui, Arial, sans-serif', fontSize: 16, fill: '#ffffff', fontWeight: 'bold', stroke: { color: '#000000', width: 3 } }, resolution: 2 }));
          pool.ti++;
          if (t.text !== c.str) t.text = c.str;
          const st = t.style;
          if (st.fontSize !== c.size) st.fontSize = c.size;
          if (st.fill !== c.f) st.fill = c.f;
          const w = c.bold ? 'bold' : 'normal';
          if (st.fontWeight !== w) st.fontWeight = w;
          t.anchor.set(c.align === 'center' ? 0.5 : c.align === 'right' ? 1 : 0, 0.5);
          t.position.set(c.x, c.y); t.alpha = c.a;
          pool.root.addChild(t);
          break;
        }
        case 'sprite': {
          const tx = this.tex.get(c.key);
          if (!tx) break;
          g = null;
          const s = pool.s[pool.si] ?? (pool.s[pool.si] = new Sprite());
          pool.si++;
          s.texture = tx; s.anchor.set(c.ax, c.ay); s.width = c.w; s.height = c.h; s.position.set(c.x, c.y); s.alpha = c.a;
          pool.root.addChild(s);
          break;
        }
      }
    }
    this.objects += pool.root.children.length;
  }

  stats(): RendererStats { return { drawCalls: this.lastCalls, objects: this.objects }; }
  destroy(): void { this.app.destroy(true, { children: true }); }
}
