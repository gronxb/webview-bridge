---
"@webview-bridge/react-native": minor
"@webview-bridge/types": minor
---

Add `delegate()` for native methods that need React hooks or context.

Declare the method's signature on the bridge with `delegate<Signature>()`, and implement it per WebView with the new `bridgeHandlers` prop. The handler runs with that WebView's latest props, so it can use `useNavigation()`, context values, and other hooks of the screen that renders the WebView.

- `bridgeHandlers` is type-checked: it is required when the bridge has delegated methods, every delegated method must be implemented with a matching signature, and regular methods cannot be listed.
- Each WebView runs its own handlers, so WebViews that share one bridge do not call each other's implementations.
- A delegated method whose handler is missing when the WebView mounts is not exposed to that page (`isNativeMethodAvailable` returns `false`, and calls go through the fallback flow).
- Bridge middleware runs around delegated methods as it does for regular methods.
- New exported types: `Delegated`, `DelegatedMethodKeys`, `BridgeHandlers`, `BridgeWebViewProps`.
