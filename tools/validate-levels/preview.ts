/** ASCII preview of a level: tiles, objects (letters), start/home, seekers and a room legend. ASCII only. */
import type { LevelData } from "../../src/game/sim/levelSchema";
import { cellOverlap } from "./grid";

const LETTERS: Record<string, string> = {
  sofa: "o", armchair: "a", tv_unit: "v", bookshelf: "k", table: "T", table_cloth: "T", chair: "c",
  fridge: "F", counter: "C", stove: "R", sink: "n", bed: "B", nightstand: "N", wardrobe: "W", closet: "K",
  dresser: "d", desk: "D", tub: "U", toilet: "q", plant: "p", bench: "e", tree: "Y", box: "x", crate: "x",
  chest: "x", barrel: "x", rug: "~", painting: "!", lamp: "i", piano: "P", car: "Z", shed: "E", other: "?",
};

export function renderPreview(level: LevelData): string {
  const { w, h } = level.size;
  const grid: string[][] = level.tiles.map((row) => row.split(""));
  const put = (x: number, y: number, ch: string) => {
    const row = grid[y];
    if (row && x >= 0 && x < w) row[x] = ch;
  };
  const sorted = [...level.objects].sort((a, b) => Number(b.type === "rug") - Number(a.type === "rug"));
  for (const o of sorted) {
    const ch = o.type === "door" ? (o.state === "closed" ? "+" : "/") : (LETTERS[o.type] ?? "?");
    for (let y = Math.floor(o.y); y < Math.ceil(o.y + o.h); y++) {
      for (let x = Math.floor(o.x); x < Math.ceil(o.x + o.w); x++) {
        if (cellOverlap(o, x, y) > 0.05) put(x, y, ch);
      }
    }
  }
  const [hx, hy, hw, hh] = level.home;
  for (let y = Math.floor(hy); y < Math.ceil(hy + hh); y++) for (let x = Math.floor(hx); x < Math.ceil(hx + hw); x++) put(x, y, "H");
  for (const s of level.seekers) put(Math.floor(s.x), Math.floor(s.y), s.type === "grandma" ? "G" : s.type === "uncle" ? "M" : "@");
  put(Math.floor(level.start.x), Math.floor(level.start.y), "S");

  const lines: string[] = [];
  lines.push(`${level.id} "${level.name}"  ${w}x${h}  archetype ${level.archetype ?? "-"}  timeLimit ${level.timeLimit}s par ${level.par}s`);
  lines.push("    " + Array.from({ length: w }, (_, i) => String(Math.floor(i / 10))).join(""));
  lines.push("    " + Array.from({ length: w }, (_, i) => String(i % 10)).join(""));
  grid.forEach((row, y) => lines.push(`${String(y).padStart(2, "0")}  ${row.join("")}`));
  lines.push("");
  lines.push("Tiles: # outer wall, = partition, w window, h hedge, . floor, , grass");
  lines.push("Marks: S start, H home, G grandma, M uncle, / open door, + closed door, ~ rug");
  const used = [...new Set(level.objects.map((o) => o.type))].filter((t) => t !== "door" && t !== "rug");
  lines.push("Objects: " + used.map((t) => `${LETTERS[t] ?? "?"}=${t}`).join(" "));
  lines.push("Rooms:");
  for (const r of level.rooms) {
    lines.push(`  ${r.id.padEnd(8)} ${r.type.padEnd(9)} ${r.rects.map((q) => `[${q.join(",")}]`).join(" ")} ${r.floorTint} ${r.surface}`);
  }
  return lines.join("\n") + "\n";
}
