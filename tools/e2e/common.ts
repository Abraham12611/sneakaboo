/** Shared helpers for the e2e scripts: Vite dev server + headless Chromium (Playwright from spike/node_modules). */
import path from "node:path";
import { createRequire } from "node:module";
import { createServer } from "vite";

const require = createRequire(path.resolve("spike/package.json"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { chromium } = require("playwright") as { chromium: any };

export async function startServer(preferredPort = 5199): Promise<{ base: string; close: () => Promise<void> }> {
  const server = await createServer({ server: { port: preferredPort, strictPort: false }, logLevel: "error" });
  await server.listen();
  const addr = server.httpServer!.address();
  const port = typeof addr === "object" && addr ? addr.port : preferredPort;
  return { base: `http://localhost:${port}/`, close: () => server.close() };
}

/** Same GPU flags as the P0.4 spike bench (real GPU via ANGLE/D3D11; GL=swiftshader forces software GL). */
export const GPU_ARGS = process.env.GL === "swiftshader"
  ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
  : ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"];

export const launchBrowser = () => chromium.launch({ headless: true, args: GPU_ARGS });
