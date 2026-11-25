/** Minimal DOM HUD, banners, pause and rotate overlays. No React. */

export type BannerKind = "timeout" | "won" | "found";

export interface HostUiHandlers {
  retry(): void;
  resume(): void;
}

/** What the host needs from a HUD. Tests inject a fake. */
export interface HostUi {
  bind(handlers: HostUiHandlers): void;
  setLevelName(name: string): void;
  setTimer(text: string, urgent: boolean): void;
  setBanner(kind: BannerKind | null): void;
  setPaused(on: boolean): void;
  setRotateOverlay(on: boolean): void;
  setDebugText(text: string | null): void;
  dispose(): void;
}

export const BANNER_TEXT: Record<BannerKind, string> = {
  timeout: "Time's up!",
  won: "HOME BASE!",
  found: "FOUND YOU!",
};

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const STYLE_ID = "sk-hud-style";
const CSS = `
.sk-hud{position:absolute;inset:0;pointer-events:none;z-index:20;font-family:system-ui,sans-serif;color:#fff;user-select:none;-webkit-user-select:none}
.sk-timer{position:absolute;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;padding:2px 14px;border-radius:12px;background:rgba(10,14,30,.55);text-shadow:0 1px 3px #000}
.sk-timer.sk-urgent{color:#ff4d4d}
.sk-chip{position:absolute;top:calc(64px + env(safe-area-inset-top));left:calc(12px + env(safe-area-inset-left));font-size:13px;padding:2px 10px;border-radius:10px;background:rgba(10,14,30,.55);max-width:40vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk-debug{position:absolute;bottom:6px;left:50%;transform:translateX(-50%);font:11px monospace;background:rgba(0,0,0,.55);padding:2px 8px;border-radius:6px;white-space:pre}
.sk-overlay{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:rgba(8,10,24,.72);text-align:center;pointer-events:auto;z-index:30}
.sk-overlay h1{margin:0;font-size:clamp(32px,8vw,64px);color:#ffc933;text-shadow:0 3px 0 #000}
.sk-overlay button{font-size:20px;font-weight:700;padding:10px 28px;border-radius:14px;border:0;background:#ffc933;color:#222;cursor:pointer}
.sk-phone{width:46px;height:78px;border:5px solid #fff;border-radius:10px;animation:sk-rot 2.2s ease-in-out infinite}
@keyframes sk-rot{0%,15%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}
`;

export function createDomHud(container: HTMLElement): HostUi {
  const doc = container.ownerDocument;
  let style: HTMLStyleElement | null = null;
  if (!doc.getElementById(STYLE_ID)) {
    style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    doc.head.appendChild(style);
  }
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent: HTMLElement, text = ""): HTMLElementTagNameMap[K] => {
    const e = doc.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    parent.appendChild(e);
    return e;
  };

  const root = el("div", "sk-hud", container);
  const timer = el("div", "sk-timer", root, "00:00");
  const chip = el("div", "sk-chip", root);
  const debug = el("div", "sk-debug", root);
  debug.style.display = "none";

  const banner = el("div", "sk-overlay", root);
  const bannerTitle = el("h1", "", banner);
  const retry = el("button", "", banner, "Retry");
  const paused = el("div", "sk-overlay", root);
  el("h1", "", paused, "Paused");
  const resume = el("button", "", paused, "Resume");
  const rotate = el("div", "sk-overlay", root);
  el("div", "sk-phone", rotate);
  el("h1", "", rotate, "Rotate your phone to play");
  rotate.style.zIndex = "40";

  let handlers: HostUiHandlers | null = null;
  retry.addEventListener("click", () => handlers?.retry());
  resume.addEventListener("click", () => handlers?.resume());

  return {
    bind(h) { handlers = h; },
    setLevelName(name) { chip.textContent = name; },
    setTimer(text, urgent) {
      timer.textContent = text;
      timer.classList.toggle("sk-urgent", urgent);
    },
    setBanner(kind) {
      if (kind === null) { banner.style.display = "none"; return; }
      bannerTitle.textContent = BANNER_TEXT[kind];
      banner.style.display = "flex";
    },
    setPaused(on) { paused.style.display = on ? "flex" : "none"; },
    setRotateOverlay(on) { rotate.style.display = on ? "flex" : "none"; },
    setDebugText(text) {
      debug.style.display = text === null ? "none" : "block";
      if (text !== null) debug.textContent = text;
    },
    dispose() {
      root.remove();
      style?.remove();
    },
  };
}
