# linkBridge

`linkBridge` connects the page to the bridge of the React Native WebView it runs in. Pass the bridge type exported from React Native (`typeof appBridge`) and, optionally, the postMessage schema type.

```ts
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge, AppPostMessageSchema } from ""; // types exported from React Native

const bridge = linkBridge<AppBridge, AppPostMessageSchema>({
  throwOnError: true,
});
```

## Options

| Option          | Type                                             | Default | Description |
|-----------------|--------------------------------------------------|---------|-------------|
| `timeout`       | `number`                                         | `2000`  | Maximum time (in milliseconds) to wait for native to acknowledge a call. Once acknowledged, the call waits for the method's result with no time limit. With native builds before 1.9.0, it limits the whole call. `0` disables it. |
| `throwOnError`  | `boolean \| (keyof AppBridge)[]`                  | `false` | Reject calls that fail instead of resolving them to `undefined`. Pass method names to apply it to those methods only. See [Backward Compatibility](/backward-compatibility/new-method). |
| `onFallback`    | `(methodName: string, args: unknown[]) => void`  | –       | Called when the page calls a method native does not have, for methods that `throwOnError` applies to. |
| `onReady`       | `(bridge) => void`                               | –       | Called with the bridge as soon as `linkBridge` creates it. Native method calls made before native has announced its methods (which can happen on Android) are still sent to native. |
| `initialBridge` | `Partial<AppBridge state>`                       | –       | Methods and state to use outside a React Native WebView (plain browser, SSR). See [Non-React Native Environment](/non-react-native-environment). |
| `debug`         | `boolean`                                        | `false` | Log warnings, for example when a method falls back or the page is not in a WebView. |

## Return value

The returned object has every native method of `AppBridge` (state values are on `store`), plus:

| Member | Description |
|--------|-------------|
| `isWebViewBridgeAvailable` | `true` when native methods (or `initialBridge`) are available. |
| `isNativeMethodAvailable(name)` | Whether native exposes the method to this page. A `delegate()` method is available only when the page's WebView implements it. |
| `store` | The shared state store, for `useBridge` and framework integrations. See [Shared State](/shared-state/react-native). |
| `addEventListener(name, listener)` | Listen to events native sends with `postMessage`. Returns an unsubscribe function. |
| `loose` | Call any native method by name without type checking. See [Using a Loose Native Method](/using-a-loose-native-method). |

## Errors

With `throwOnError`, a failed call rejects with:

| Error | When |
|-------|------|
| `MethodNotFoundError` | Native does not have the method (an older app), or the page's WebView does not implement the `delegate()` method. |
| `BridgeValidationError` | A `delegate()` schema rejected the input the page sent or the value native returned. |
| `Error("Timeout")` | Native did not acknowledge the call within `timeout`. |
| any other error | The native method threw; its `name` and `message` are kept. |

Without `throwOnError`, these calls resolve to `undefined`.
