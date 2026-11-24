import { LOGICAL_H, LOGICAL_W, type Cmd, type Frame, type Renderer, type RendererStats } from './cmds';

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Hand-written Canvas 2D renderer. Zero dependencies. */
export class CanvasRenderer implements Renderer {
  readonly name = 'canvas' as const;
  canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private images = new Map<string, HTMLImageElement>();
  private s = 1;
  private fills = 0;
  private lastFills = 0;
  private lastObjects = 0;

  async init(parent: HTMLElement): Promise<void> {
    this.canvas = document.createElement('canvas');
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.s = this.canvas.width / LOGICAL_W;
  }

  addImage(key: string, img: HTMLImageElement): void { this.images.set(key, img); }

  render(f: Frame): void {
    const ctx = this.ctx, s = this.s;
    this.fills = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#10101a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const z = f.zoom;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, LOGICAL_W * s, LOGICAL_H * s); ctx.clip();
    ctx.setTransform(s * z, 0, 0, s * z, s * (LOGICAL_W / 2 - f.camPx.x * z), s * (LOGICAL_H / 2 - f.camPx.y * z));
    ctx.lineJoin = 'round';
    this.exec(f.world);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    this.exec(f.hud);
    ctx.restore();
    this.lastFills = this.fills;
    this.lastObjects = f.world.length + f.hud.length;
  }

  private exec(cmds: Cmd[]): void {
    const ctx = this.ctx;
    for (let i = 0; i < cmds.length; i++) {
      const c = cmds[i];
      switch (c.t) {
        case 'poly': {
          const p = c.p;
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          for (let k = 2; k < p.length; k += 2) ctx.lineTo(p[k], p[k + 1]);
          if (!c.open) ctx.closePath();
          ctx.globalAlpha = c.a;
          if (c.f) { ctx.fillStyle = c.f; ctx.fill(); this.fills++; }
          if (c.s) { ctx.strokeStyle = c.s; ctx.lineWidth = c.sw ?? 1; ctx.stroke(); this.fills++; }
          break;
        }
        case 'ell': {
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, Math.max(0.01, c.rx), Math.max(0.01, c.ry), 0, 0, Math.PI * 2);
          ctx.globalAlpha = c.a;
          if (c.f) { ctx.fillStyle = c.f; ctx.fill(); this.fills++; }
          if (c.s) { ctx.strokeStyle = c.s; ctx.lineWidth = c.sw ?? 1; ctx.stroke(); this.fills++; }
          break;
        }
        case 'cone': {
          const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
          g.addColorStop(0, rgba(c.c, c.a));
          g.addColorStop(0.65, rgba(c.c, c.a * 0.5));
          g.addColorStop(1, rgba(c.c, c.a * 0.12));
          const p = c.p;
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          for (let k = 2; k < p.length; k += 2) ctx.lineTo(p[k], p[k + 1]);
          ctx.closePath();
          ctx.globalAlpha = 1;
          ctx.fillStyle = g; ctx.fill(); this.fills++;
          break;
        }
        case 'text': {
          ctx.globalAlpha = c.a;
          ctx.font = `${c.bold ? 'bold ' : ''}${c.size}px system-ui, Arial, sans-serif`;
          ctx.textAlign = c.align; ctx.textBaseline = 'middle';
          ctx.lineWidth = Math.max(2, c.size / 8); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineJoin = 'round';
          ctx.strokeText(c.str, c.x, c.y);
          ctx.fillStyle = c.f; ctx.fillText(c.str, c.x, c.y); this.fills++;
          break;
        }
        case 'sprite': {
          const img = this.images.get(c.key);
          if (!img) break;
          ctx.globalAlpha = c.a;
          ctx.drawImage(img, c.x - c.w * c.ax, c.y - c.h * c.ay, c.w, c.h); this.fills++;
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  stats(): RendererStats { return { drawCalls: this.lastFills, objects: this.lastObjects }; }
  destroy(): void { this.canvas.remove(); }
}
