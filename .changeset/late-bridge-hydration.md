---
"@webview-bridge/web": patch
"@webview-bridge/react-native": patch
"@webview-bridge/react": patch
---

Recover when `linkBridge()` runs before the injected bridge methods are available, which can happen on Android because `injectedJavaScriptBeforeContentLoaded` is evaluated asynchronously there.

- The web side now asks native for the bridge methods (`requestHydrate`), and native answers with a `hydrate` event for that bridge.
- Native method calls made before hydration completes are sent to native instead of falling back to a no-op.
- A `hydrate` event that native queued before `linkBridge()` ran is no longer dropped.
- The `hydrate` payload now uses the `nativeInitialState` key that the web side reads, and the web side still accepts the older `initialState` key.
- `useBridgeStore` (from `@webview-bridge/react`) now sees native methods that arrive after the first render, because late hydration updates the existing store instead of replacing it.
- `useBridgeStatus` re-renders when the bridge becomes available.
- Inside a React Native WebView, calls made before hydration completes go to native even when `initialBridge` defines the method.
- Awaiting the bridge object no longer hangs: the bridge no longer behaves like a `then`-able.
