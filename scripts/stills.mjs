import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "path";
const [comp, outDir, framesArg] = process.argv.slice(2);
const frames = framesArg.split(",").map(Number);
const B = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: comp, inputProps: { silent: true }, browserExecutable: B });
for (const f of frames) {
  await renderStill({ composition, serveUrl, frame: f, output: `${outDir}/f${String(f).padStart(5, "0")}.png`, inputProps: { silent: true }, browserExecutable: B, scale: 0.5 });
  process.stdout.write(f + " ");
}
