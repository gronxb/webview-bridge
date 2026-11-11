# Using React Hooks in Native Methods

Native methods are declared with `bridge({...})` at module scope, outside of any React component. That makes it hard to use values that only exist inside components, such as `useNavigation()`, a `useQueryClient()` instance, or a context value.

`delegate()` solves this. You declare the method's signature on the bridge, and each WebView provides the implementation through its `delegate` prop.

## React Native Part

Declare the method with `delegate()` and pass its signature as the generic. Regular methods and delegated methods can be mixed on the same bridge.

```tsx
// This file is src/bridge.ts
import { bridge, createWebView, delegate } from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";

export const appBridge = bridge({
  // A regular method: implemented here, shared by every WebView.
  async openInAppBrowser(url: string) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },
  // Delegated methods: only the signature is declared here.
  goBack: delegate<() => Promise<void>>(),
  getUser: delegate<() => Promise<{ id: string; name: string } | null>>(),
});

// Export the type as usual. The Web side sees `goBack` and `getUser` as normal methods.
export type AppBridge = typeof appBridge;

export const { WebView } = createWebView({
  bridge: appBridge,
});
```

Implement the delegated methods where the WebView is rendered, with any hooks you need.

```tsx
// This file is src/screens/WebViewScreen.tsx
import { useNavigation } from "@react-navigation/native";
import { WebView } from "../bridge";
import { useAuth } from "../auth";

export function WebViewScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  return (
    <WebView
      source={{ uri: "https://example.com" }}
      delegate={{
        goBack: async () => navigation.goBack(),
        getUser: async () => user,
      }}
    />
  );
}
```

The handlers always run with the WebView's latest props, so `user` above is never stale, and you do not need `useCallback` or refs.

## Web Part

Nothing changes on the Web side. Delegated methods are called like any other native method.

```tsx
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from ""; // Import the type 'appBridge' declared in native

const bridge = linkBridge<AppBridge>();

const user = await bridge.getUser();
await bridge.goBack();
```

## Type safety

When a bridge declares `delegate()` methods, the WebView's `delegate` prop is required, and TypeScript checks it. Autocomplete inside `delegate={{ }}` lists exactly the delegated methods:

- A missing handler is a type error.
- Argument and return types must match the signature passed to `delegate()`.
- Only delegated methods can be listed. Regular methods cannot be overridden through the `delegate` prop.

To type handlers outside of JSX, use `BridgeDelegate`:

```tsx
import type { BridgeDelegate } from "@webview-bridge/react-native";
import type { AppBridge } from "./bridge";

const useAppBridgeDelegate = (): BridgeDelegate<AppBridge> => {
  const navigation = useNavigation();
  return {
    goBack: async () => navigation.goBack(),
    getUser: async () => null,
  };
};
```

## Behavior

- **Each WebView uses its own handlers.** When several WebViews share one bridge (for example a stack of screens), a call from a page always runs the handler of the WebView that hosts that page.
- **Which methods a page sees is fixed when the WebView mounts.** If a handler is missing at mount time, the page does not see that method: `bridge.isNativeMethodAvailable("getUser")` returns `false`, and calling it goes through the [fallback](/backward-compatibility/new-method) flow. Handler implementations can change on every render, but the set of keys should stay the same.
- **Middleware still runs.** [Bridge middleware](/reference/react-native/create-webview#bridge-middleware) runs around delegated methods the same way it runs around regular ones.
- **Delegated methods cannot be called on the native side directly.** `appBridge.getState().goBack()` throws, because the implementation lives on a WebView.

::: tip
If a value is truly global (one per app, such as a `NavigationContainer` ref), a regular method that reads a module-level ref, as in the [React Navigation example](/example/react-navigation), is still fine. Use `delegate()` when the value depends on the screen or component that renders the WebView.
:::
