# @webview-bridge/react

## 1.9.0

### Minor Changes

- 99d42c3: Build the packages with tsdown instead of tsup.

  - **Output now targets ES2015 instead of ES5.** Every WebView that React Native supports runs ES2015 (Android 7+ System WebView, iOS 15.1+ WKWebView), and dropping the ES5 helpers makes the bundles about half the size (for example, `@webview-bridge/web` went from 41 kB to 19 kB). If you load `@webview-bridge/web` in an environment without ES2015 support, transpile it in your own build.
  - **CommonJS consumers get CommonJS types.** The `exports` map now points `require` at `index.d.cts` and `import` at `index.d.ts`. Before, `require` resolved the ESM declaration file ("Masquerading as ESM" in arethetypeswrong).
  - File names, exported names, and the `react-native` condition are unchanged.

### Patch Changes

- 9423137: Recover when `linkBridge()` runs before the injected bridge methods are available, which can happen on Android because `injectedJavaScriptBeforeContentLoaded` is evaluated asynchronously there.

  - The web side now asks native for the bridge methods (`requestHydrate`), and native answers with a `hydrate` event for that bridge.
  - Native method calls made before hydration completes are sent to native instead of falling back to a no-op.
  - A `hydrate` event that native queued before `linkBridge()` ran is no longer dropped.
  - The `hydrate` payload now uses the `nativeInitialState` key that the web side reads, and the web side still accepts the older `initialState` key.
  - `useBridgeStore` (from `@webview-bridge/react`) now sees native methods that arrive after the first render, because late hydration updates the existing store instead of replacing it.
  - `useBridgeStatus` re-renders when the bridge becomes available.
  - Inside a React Native WebView, calls made before hydration completes go to native even when `initialBridge` defines the method.
  - Awaiting the bridge object no longer hangs: the bridge no longer behaves like a `then`-able.
  - A web call to a `delegate()` method that the WebView does not implement is now answered like a missing method (`MethodNotFoundError` with `throwOnError`), whether or not hydration has finished. Native logs a warning. The stub error from `delegate()` is unchanged.

- Updated dependencies [7311103]
- Updated dependencies [ce96bcf]
  - @webview-bridge/types@1.9.0

## 1.8.0

### Patch Changes

- @webview-bridge/types@1.8.0

## 1.7.10

### Patch Changes

- @webview-bridge/types@1.7.10

## 1.7.9

### Patch Changes

- bd11e6c: chore: bump packages
  - @webview-bridge/types@1.7.9
