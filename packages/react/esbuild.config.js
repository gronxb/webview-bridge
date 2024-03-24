import { build } from "esbuild";

import packageJson from "./package.json" assert { type: "json" };

const external = [
  ...Object.keys(packageJson?.dependencies ?? {}),
  ...Object.keys(packageJson?.devDependencies ?? {}),
  ...Object.keys(packageJson?.peerDependencies ?? {}),
];

await Promise.all([
  build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    minify: true,
    external,
    outfile: "dist/commonjs/index.cjs",
    platform: "node",
    format: "cjs",
  }),
  build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    minify: true,
    external,
    outfile: "dist/module/index.mjs",
    platform: "browser",
    format: "esm",
  }),
]).catch((e) => {
  console.error(e);
  process.exit(1);
});
