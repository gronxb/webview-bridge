import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (pkg: string) =>
  fileURLToPath(new URL(`./packages/${pkg}/src/index.ts`, import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    // Test against the sources, not the (possibly missing or stale) dist builds.
    alias: {
      "@webview-bridge/types": src("types"),
      "@webview-bridge/utils": src("utils"),
      "@webview-bridge/web": src("web"),
      "@webview-bridge/react": src("react"),
      "@webview-bridge/react-native": src("react-native"),
      // The real package is Flow/native code; tests drive a fake WebView that
      // evaluates injected scripts in the jsdom window.
      "react-native-webview": fileURLToPath(
        new URL("./tests/harness.tsx", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
