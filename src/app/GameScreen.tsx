import { useEffect, useMemo, useRef } from "react";
import { GameHost } from "../game/host/GameHost";
import { parseQueryFlags } from "../game/host/queryFlags";
import { createInputController } from "../game/input";
import { sim } from "../game/sim";
import { createGameView } from "../game/view";
import { registry } from "./levels";

const page: Record<string, string | number> = {
  position: "fixed", inset: 0, background: "#0b0f1d", color: "#fff", overflow: "hidden",
};

function ErrorScreen({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div style={{ ...page, display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 640 }}>
        <h1 style={{ color: "#ffc933", margin: "0 0 12px" }}>{title}</h1>
        <ul style={{ paddingLeft: 20, lineHeight: 1.5, fontSize: 14, opacity: 0.9 }}>
          {lines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default function GameScreen() {
  const flags = useMemo(() => parseQueryFlags(window.location.search), []);
  const level = registry.levels.get(flags.level);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !level) return;
    const host = new GameHost(
      { sim, createView: createGameView, createInput: createInputController, level, canvas, container },
      { projection: flags.proj, debug: flags.debug, timeScale: flags.timescale, touch: flags.touch, leftHanded: flags.lefty || undefined },
    );
    host.start();
    const w = window as unknown as { __sneakaboo?: unknown };
    if (import.meta.env.DEV) {
      w.__sneakaboo = {
        host,
        get world() { return host.getWorld(); },
        get view() { return host.getView(); },
      };
    }
    return () => {
      host.dispose();
      if (import.meta.env.DEV) delete w.__sneakaboo;
    };
  }, [level, flags]);

  if (!level) {
    const lines = [
      `Level "${flags.level}" was not found.`,
      `Available: ${[...registry.levels.keys()].join(", ") || "none"}`,
      ...registry.problems.map((p) => `${p.file}: ${p.message}`),
    ];
    return <ErrorScreen title="Cannot load level" lines={lines} />;
  }

  return (
    <div ref={containerRef} style={{ ...page, touchAction: "none" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }} />
    </div>
  );
}
