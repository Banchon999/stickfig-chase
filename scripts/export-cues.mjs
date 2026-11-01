// Bundles src/Chase.tsx for Node and prints the exact sound-cue list as JSON,
// so the audio can be mixed once (not per render chunk).
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const outfile = resolve("out/cues-bundle.cjs");
await build({
  stdin: { contents: 'export { CUES } from "./src/Chase";', resolveDir: process.cwd(), loader: "ts" },
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  outfile,
  logLevel: "error",
});
const { CUES } = await import(pathToFileURL(outfile).href);
writeFileSync(process.argv[2] ?? "cues.json", JSON.stringify(CUES));
console.log(`cues: ${CUES.length}`);
