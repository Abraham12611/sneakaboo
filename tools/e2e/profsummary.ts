/** Summarise a .cpuprofile by self time per function. Run: npx tsx tools/e2e/profsummary.ts file.cpuprofile [top=30] */
import fs from "node:fs";

interface Node { id: number; callFrame: { functionName: string; url: string; lineNumber: number } }
const file = process.argv[2];
if (!file) throw new Error("usage: profsummary <file.cpuprofile> [top]");
const top = Number(process.argv[3] ?? 30);
const p = JSON.parse(fs.readFileSync(file, "utf8")) as { nodes: Node[]; samples: number[]; timeDeltas: number[] };
const self = new Map<number, number>();
p.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (p.timeDeltas[i] ?? 0)));
const agg = new Map<string, number>();
let total = 0;
for (const n of p.nodes) {
  const t = self.get(n.id) ?? 0;
  total += t;
  const cf = n.callFrame;
  const k = `${cf.functionName || "(anon)"} ${cf.url.split("/").slice(-1)[0]?.split("?")[0] ?? ""}:${cf.lineNumber + 1}`;
  agg.set(k, (agg.get(k) ?? 0) + t);
}
for (const [k, v] of [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`${((v / total) * 100).toFixed(1).padStart(5)}%  ${k}`);
