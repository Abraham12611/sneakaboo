/**
 * Level validator CLI.
 *   npm run validate-levels                 validate levels/*.json
 *   npm run validate-levels -- --level L01  only one level
 *   npm run validate-levels -- --json       machine-readable output
 *   npm run validate-levels -- --preview    print ASCII plans instead of the table
 * Exit code 1 when any level has errors.
 */
import { loadAndValidate } from "./load";
import { renderPreview } from "./preview";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const li = args.indexOf("--level");
const filter = li >= 0 ? args[li + 1] : undefined;

const results = loadAndValidate(undefined, filter);
if (results.length === 0) {
  console.error(filter ? `No level matches "${filter}"` : "No levels found");
  process.exit(1);
}

if (flag("--preview")) {
  for (const r of results) if (r.level) process.stdout.write(renderPreview(r.level) + "\n");
  process.exit(0);
}

const failed = results.some((r) => !r.report.ok);

if (flag("--json")) {
  console.log(JSON.stringify({ ok: !failed, levels: results.map((r) => r.report) }, null, 2));
  process.exit(failed ? 1 : 0);
}

const color = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const c = (code: number, s: string) => (color ? `\u001b[${code}m${s}\u001b[0m` : s);
const red = (s: string) => c(31, s);
const yellow = (s: string) => c(33, s);
const green = (s: string) => c(32, s);
const bold = (s: string) => c(1, s);

const cols = ["Level", "Status", "Err", "Warn", "Rooms", "Doors", "Route", "Est s", "Limit", "Hide"];
const rows = results.map((r) => {
  const i = r.report.info;
  return [
    r.report.id,
    r.report.ok ? "OK" : "FAIL",
    String(r.report.errors.length),
    String(r.report.warnings.length),
    String(i.rooms),
    String(i.doorways),
    i.routeLength === null ? "-" : i.routeLength.toFixed(1),
    i.estTimeSec === null ? "-" : i.estTimeSec.toFixed(1),
    r.level ? String(r.level.timeLimit) : "-",
    String(i.hideSpots.total),
  ];
});
const widths = cols.map((h, k) => Math.max(h.length, ...rows.map((row) => (row[k] as string).length)));
const fmt = (cells: string[]) => cells.map((v, k) => v.padEnd(widths[k] as number)).join("  ");
console.log(bold(fmt(cols)));
console.log(widths.map((n) => "-".repeat(n)).join("  "));
rows.forEach((row, n) => {
  const ok = results[n]?.report.ok;
  const line = fmt(row);
  console.log(ok ? (results[n]?.report.warnings.length ? yellow(line) : green(line)) : red(line));
});
console.log("");
for (const r of results) {
  for (const e of r.report.errors) console.log(`${red("error")}   ${r.report.id}: ${e}`);
  for (const wmsg of r.report.warnings) console.log(`${yellow("warn")}    ${r.report.id}: ${wmsg}`);
  const rt = r.report.info;
  if (rt.routeLength !== null) {
    console.log(`info    ${r.report.id}: route ${rt.routeLength} tiles, est ${rt.estTimeSec}s at ${3.0} t/s, hide spots ${JSON.stringify(rt.hideSpots)}`);
  }
}
console.log(failed ? red("\nValidation FAILED") : green("\nValidation passed"));
process.exit(failed ? 1 : 0);
