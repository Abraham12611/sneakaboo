/** Registers every levels/*.json (except files starting with `_`) and validates them with parseLevel. */
import { buildRegistry } from "../game/host/levelRegistry";
import type { LevelRegistry } from "../game/host/levelRegistry";
import { LEVEL_RELOADED_EVENT } from "../game/host/domEnv";

const files = import.meta.glob("/levels/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

export const registry: LevelRegistry = buildRegistry(files);

if (import.meta.hot) {
  // A level JSON changed: this module re-evaluates; tell the running host about each level.
  import.meta.hot.accept((mod) => {
    const next = (mod as { registry?: LevelRegistry } | undefined)?.registry;
    if (!next) return;
    for (const level of next.levels.values()) {
      window.dispatchEvent(new CustomEvent(LEVEL_RELOADED_EVENT, { detail: { level } }));
    }
    for (const p of next.problems) console.warn(`[levels] ${p.file}: ${p.message}`);
  });
}
