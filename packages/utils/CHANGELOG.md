# @webview-bridge/utils

## 1.9.0

### Minor Changes

- 99d42c3: Build the packages with tsdown instead of tsup.

  - **Output now targets ES2015 instead of ES5.** Every WebView that React Native supports runs ES2015 (Android 7+ System WebView, iOS 15.1+ WKWebView), and dropping the ES5 helpers makes the bundles about half the size (for example, `@webview-bridge/web` went from 41 kB to 19 kB). If you load `@webview-bridge/web` in an environment without ES2015 support, transpile it in your own build.
  - **CommonJS consumers get CommonJS types.** The `exports` map now points `require` at `index.d.cts` and `import` at `index.d.ts`. Before, `require` resolved the ESM declaration file ("Masquerading as ESM" in arethetypeswrong).
  - File names, exported names, and the `react-native` condition are unchanged.

- 9419834: `linkBridge`'s `timeout` now limits how long native takes to acknowledge a call, not how long the native method runs.

  Native methods that wait for the user, such as a confirm dialog, an image picker, or an in-app browser, used to be cut off after `timeout` (2000 ms by default). The call then resolved to `undefined`, or rejected with `Error("Timeout")` under `throwOnError`. Now native acknowledges each call as soon as it starts running the method, and from then on the page waits for the result with no time limit.

  - `timeout` still applies when native never answers, for example when a message is lost, or when a state key is called as a method.
  - Compatibility: a page running in a native build without the acknowledgement keeps the old behavior (the whole call is limited by `timeout`). An older page ignores the acknowledgement.
  - Behavior change: a slow native method that used to time out now resolves with its real result. If you relied on `timeout` to cap a method's run time, enforce that limit inside the method or around the call.

### Patch Changes

- 27de797: An exception thrown by `onFallback` (Web) or `fallback` (native) no longer changes the bridge call that triggered it. It is logged with `console.error` instead.

  Before, a throwing `onFallback` made a missing-method call throw synchronously instead of rejecting with `MethodNotFoundError`, and left a call that native answered with an error pending until the `timeout`. When these callbacks fire is unchanged.

## 1.8.0

## 1.7.10

## 1.7.9

### Patch Changes

- 0f810f5: fix: Forward native error details to webview
