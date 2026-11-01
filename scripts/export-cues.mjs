// Bundles a composition module for Node and writes its sound-cue list as JSON,
// so the audio is mixed once (not per render chunk).
// usage: node scripts/export-cues.mjs <module> <exportName> <out.json>
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const [mod = "./src/Chase", name = "CUES", out = "cues.json"] = process.argv.slice(2);
const outfile = resolve("out/cues-bundle.cjs");
await build({
  stdin: { contents: `export { ${name} as CUES } from "${mod.startsWith(".") ? mod : "./" + mod}";`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  outfile,
  logLevel: "error",
});
const { CUES } = await import(pathToFileURL(outfile).href);
writeFileSync(out, JSON.stringify(CUES));
console.log(`cues: ${CUES.length}`);
