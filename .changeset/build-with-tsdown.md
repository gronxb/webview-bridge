---
"@webview-bridge/utils": minor
"@webview-bridge/web": minor
"@webview-bridge/react": minor
"@webview-bridge/react-native": minor
---

Build the packages with tsdown instead of tsup.

- **Output now targets ES2015 instead of ES5.** Every WebView that React Native supports runs ES2015 (Android 7+ System WebView, iOS 15.1+ WKWebView), and dropping the ES5 helpers makes the bundles about half the size (for example, `@webview-bridge/web` went from 41 kB to 19 kB). If you load `@webview-bridge/web` in an environment without ES2015 support, transpile it in your own build.
- **CommonJS consumers get CommonJS types.** The `exports` map now points `require` at `index.d.cts` and `import` at `index.d.ts`. Before, `require` resolved the ESM declaration file ("Masquerading as ESM" in arethetypeswrong).
- File names, exported names, and the `react-native` condition are unchanged.
