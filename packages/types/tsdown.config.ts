import { defineConfig } from "tsdown";

// This package ships its TypeScript sources (see package.json "files"); the
// build only checks that they compile.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  dts: true,
  platform: "neutral",
  fixedExtension: false,
});
