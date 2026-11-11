import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  // The lowest target Oxc can lower to. Every WebView that React Native
  // supports (Android 7+ System WebView, iOS 15.1+ WKWebView) runs ES2015.
  target: "es2015",
  platform: "neutral",
  // Keep the `.js` / `.cjs` / `.d.ts` / `.d.cts` names the exports map uses.
  fixedExtension: false,
  inputOptions: {
    transform: { jsx: "react-jsx" },
  },
});
