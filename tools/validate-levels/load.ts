/** Loads and validates every levels/*.json. Importable by tests. */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLevel, type LevelData } from "../../src/game/sim/levelSchema";
import { checkArchetypeSequence, validateLevel, type Report } from "./validate";

export const LEVELS_DIR = fileURLToPath(new URL("../../levels/", import.meta.url));

export interface Loaded {
  file: string;
  level: LevelData | null;
  report: Report;
}

export function loadAndValidate(dir: string = LEVELS_DIR, filter?: string): Loaded[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const out: Loaded[] = [];
  for (const file of files) {
    const stem = basename(file, ".json");
    const relaxed = file.startsWith("_");
    if (filter && stem.toLowerCase() !== filter.toLowerCase()) continue;
    try {
      const level = parseLevel(JSON.parse(readFileSync(join(dir, file), "utf8")));
      const report = validateLevel(level, { relaxed });
      report.file = file;
      out.push({ file, level, report });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const report: Report = {
        id: stem, file, relaxed, ok: false, errors: [`parse: ${msg.split("\n")[0]}`], warnings: [],
        info: { routeLength: null, estTimeSec: null, rooms: 0, doorways: 0, hideSpots: { total: 0 }, startHomeDistance: null },
      };
      out.push({ file, level: null, report });
    }
  }
  checkArchetypeSequence(out.filter((l): l is Loaded & { level: LevelData } => l.level !== null).map((l) => ({ level: l.level, report: l.report })));
  return out;
}
