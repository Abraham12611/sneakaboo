import type { Gait, SimInput } from './sim/sim';
import { LOGICAL_H, LOGICAL_W } from './view/cmds';
import { BUTTONS, type Joy } from './view/scene';

export const JOY_RADIUS = 70;

export interface InputHandlers {
  zoomBy(factor: number): void;
  getZoom(): number;
  setZoom(z: number): void;
  button(id: string): void;
  retry(): void;
  toggleDebug(): void;
  toggleProj(): void;
  isFound(): boolean;
}

export function gaitFromTilt(mag: number): Gait { return mag < 0.4 ? 'sneak' : mag < 0.85 ? 'walk' : 'run'; }

/** Keyboard + mouse wheel + touch (floating joystick left half, pinch zoom, on-screen buttons). */
export class Input {
  private keys = new Set<string>();
  private ptrs = new Map<number, { x: number; y: number }>();
  private joyId: number | null = null;
  joy: Joy | null = null;
  private joyVec = { dx: 0, dy: 0, mag: 0 };
  private pinch: { d0: number; z0: number } | null = null;
  touchSeen = false;

  constructor(private canvas: HTMLCanvasElement, private h: InputHandlers) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); h.zoomBy(Math.exp(-e.deltaY * 0.0012)); }, { passive: false });
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.up(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private logical(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * LOGICAL_W, y: ((e.clientY - r.top) / r.height) * LOGICAL_H };
  }

  private onKey(e: KeyboardEvent, down: boolean) {
    const c = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(c)) e.preventDefault();
    if (down) this.keys.add(c); else this.keys.delete(c);
    if (!down) return;
    if (c === 'KeyP' && !e.repeat) this.h.toggleProj();
    if (c === 'Backquote' && !e.repeat) this.h.toggleDebug();
    if (c === 'KeyR' && !e.repeat) this.h.retry();
    if (c === 'Equal' || c === 'NumpadAdd') this.h.zoomBy(1.12);
    if (c === 'Minus' || c === 'NumpadSubtract') this.h.zoomBy(1 / 1.12);
  }

  private down(e: PointerEvent) {
    if (e.pointerType !== 'mouse') this.touchSeen = true;
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.logical(e);
    this.ptrs.set(e.pointerId, p);
    if (this.h.isFound()) { this.h.retry(); return; }
    for (const b of BUTTONS) if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 8) { this.h.button(b.id); this.ptrs.delete(e.pointerId); return; }
    if (this.joyId === null && p.x < LOGICAL_W / 2) {
      this.joyId = e.pointerId;
      this.joy = { bx: p.x, by: p.y, kx: p.x, ky: p.y };
      this.joyVec = { dx: 0, dy: 0, mag: 0 };
      return;
    }
    this.updatePinch();
  }

  private move(e: PointerEvent) {
    if (!this.ptrs.has(e.pointerId)) return;
    const p = this.logical(e);
    this.ptrs.set(e.pointerId, p);
    if (e.pointerId === this.joyId && this.joy) {
      const dx = p.x - this.joy.bx, dy = p.y - this.joy.by, d = Math.hypot(dx, dy);
      const k = d > JOY_RADIUS ? JOY_RADIUS / d : 1;
      this.joy.kx = this.joy.bx + dx * k; this.joy.ky = this.joy.by + dy * k;
      const mag = Math.min(1, d / JOY_RADIUS);
      this.joyVec = mag < 0.12 ? { dx: 0, dy: 0, mag: 0 } : { dx: dx / d, dy: dy / d, mag };
      return;
    }
    if (this.pinch) {
      const o = this.others();
      if (o.length >= 2) this.h.setZoom(this.pinch.z0 * (Math.hypot(o[0].x - o[1].x, o[0].y - o[1].y) / this.pinch.d0));
    }
  }

  private up(e: PointerEvent) {
    this.ptrs.delete(e.pointerId);
    if (e.pointerId === this.joyId) { this.joyId = null; this.joy = null; this.joyVec = { dx: 0, dy: 0, mag: 0 }; }
    this.updatePinch();
  }

  private others() { return [...this.ptrs.entries()].filter(([id]) => id !== this.joyId).map(([, p]) => p); }
  private updatePinch() {
    const o = this.others();
    if (o.length >= 2) {
      if (!this.pinch) this.pinch = { d0: Math.max(10, Math.hypot(o[0].x - o[1].x, o[0].y - o[1].y)), z0: this.h.getZoom() };
    } else this.pinch = null;
  }

  read(): SimInput {
    if (this.joyId !== null && this.joyVec.mag > 0) {
      return { dx: this.joyVec.dx, dy: this.joyVec.dy, gait: gaitFromTilt(this.joyVec.mag) };
    }
    const k = this.keys;
    const dx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const dy = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    const l = Math.hypot(dx, dy) || 1;
    const gait: Gait = k.has('ShiftLeft') || k.has('ShiftRight') ? 'sneak' : k.has('Space') ? 'run' : 'walk';
    return { dx: dx / l, dy: dy / l, gait };
  }
}
