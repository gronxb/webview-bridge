import { build } from "esbuild";

await Promise.all([
  build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    outfile: "dist/commonjs/index.cjs",
    platform: "node",
    format: "cjs",
  }),
  build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    outfile: "dist/module/index.mjs",
    platform: "browser",
    format: "esm",
  }),
]).catch((e) => {
  console.error(e);
  process.exit(1);
});
