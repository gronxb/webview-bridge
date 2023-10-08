import { build } from "esbuild";

Promise.all(
  build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    outfile: "dist/index.cjs",
    platform: "node",
    format: "cjs",
  }),
  build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    outfile: "dist/index.mjs",
    platform: "browser",
    format: "esm",
  }),
).catch(() => process.exit(0));
