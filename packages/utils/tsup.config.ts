import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  target: "es5",
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
