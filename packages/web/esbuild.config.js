import { build } from "esbuild";

await Promise.all([
  build({
    target: "es2015",
    entryPoints: ["src/index.ts"],
    bundle: true,
    minify: true,
    outfile: "dist/commonjs/index.cjs",
    platform: "node",
    format: "cjs",
  }),
  build({
    target: "es2015",
    entryPoints: ["src/index.ts"],
    bundle: true,
    minify: true,
    outfile: "dist/module/index.mjs",
    platform: "browser",
    format: "esm",
  }),
]).catch((e) => {
  console.error(e);
  process.exit(1);
});
