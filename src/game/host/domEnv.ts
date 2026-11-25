/** Browser environment hooks for the host (resize, visibility, orientation, debug keys, hot reload). */
import { shouldShowTouchUi } from "../input/joystick";
import { isEditableTarget } from "../input/keyboard";
import type { LevelData } from "../sim/levelSchema";

export interface HostEnvHandlers {
  onResize(cssW: number, cssH: number, dpr: number): void;
  /** Document hidden or window blurred. */
  onHidden(): void;
  onPortrait(portrait: boolean): void;
  /** KeyboardEvent.code, only for non-editable focus. */
  onKey(code: string): void;
  onLevelReloaded(level: LevelData): void;
}

export interface HostEnv {
  /** Subscribe; returns an unsubscribe function. Fires initial resize/orientation immediately. */
  start(handlers: HostEnvHandlers): () => void;
}

export const LEVEL_RELOADED_EVENT = "sneakaboo:level-reloaded";

export function createDomEnv(container: HTMLElement, touchForced: boolean): HostEnv {
  return {
    start(h) {
      const win = container.ownerDocument.defaultView ?? window;
      const doc = container.ownerDocument;
      const cleanups: (() => void)[] = [];

      const size = () => {
        const r = container.getBoundingClientRect();
        h.onResize(Math.max(1, r.width), Math.max(1, r.height), Math.min(2, win.devicePixelRatio || 1));
        h.onPortrait(touchCapable() && win.innerHeight > win.innerWidth);
      };
      const touchCapable = () =>
        shouldShowTouchUi({
          coarsePointer: typeof win.matchMedia === "function" && win.matchMedia("(pointer: coarse)").matches,
          maxTouchPoints: win.navigator.maxTouchPoints ?? 0,
          forced: touchForced,
        });

      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(size);
        ro.observe(container);
        cleanups.push(() => ro.disconnect());
      }
      win.addEventListener("resize", size);
      win.addEventListener("orientationchange", size);
      cleanups.push(() => {
        win.removeEventListener("resize", size);
        win.removeEventListener("orientationchange", size);
      });

      const vis = () => { if (doc.hidden) h.onHidden(); };
      const blur = () => h.onHidden();
      doc.addEventListener("visibilitychange", vis);
      win.addEventListener("blur", blur);
      cleanups.push(() => {
        doc.removeEventListener("visibilitychange", vis);
        win.removeEventListener("blur", blur);
      });

      const key = (e: KeyboardEvent) => {
        if (isEditableTarget(e.target)) return;
        h.onKey(e.code);
      };
      win.addEventListener("keydown", key);
      cleanups.push(() => win.removeEventListener("keydown", key));

      const reloaded = (e: Event) => {
        const level = (e as CustomEvent<{ level?: LevelData }>).detail?.level;
        if (level) h.onLevelReloaded(level);
      };
      win.addEventListener(LEVEL_RELOADED_EVENT, reloaded);
      cleanups.push(() => win.removeEventListener(LEVEL_RELOADED_EVENT, reloaded));

      size();
      return () => cleanups.forEach((c) => c());
    },
  };
}
