---
"@webview-bridge/utils": patch
"@webview-bridge/web": patch
"@webview-bridge/react-native": patch
---

An exception thrown by `onFallback` (Web) or `fallback` (native) no longer changes the bridge call that triggered it. It is logged with `console.error` instead.

Before, a throwing `onFallback` made a missing-method call throw synchronously instead of rejecting with `MethodNotFoundError`, and left a call that native answered with an error pending until the `timeout`. When these callbacks fire is unchanged.
