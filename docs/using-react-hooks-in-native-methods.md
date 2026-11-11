# Using React Hooks in Native Methods

Native methods are declared with `bridge({...})` at module scope, outside of any React component. So a regular native method cannot call `useNavigation()`, read a context value, or update a component's state.

`delegate()` solves this. You declare the method's **signature** on the bridge, and the screen that renders the WebView provides the **implementation** through the WebView's `delegate` prop, where hooks are available.

```tsx
// bridge.ts: declare
goBack: delegate<() => Promise<void>>(),

// Screen.tsx: implement, with hooks
<WebView delegate={{ goBack: async () => navigation.goBack() }} />

// Web: call it like any other native method
await bridge.goBack();
```

## When to use `delegate()`

| What the native method needs | Use |
|---|---|
| Nothing from React: device APIs, in-app browser, storage | A regular method in `bridge({...})` |
| One app-wide instance, such as the root `NavigationContainer` ref | A regular method that reads a module-level ref |
| Hooks, context, component state, or anything that belongs to **the screen that renders the WebView** | `delegate()` |

Regular and delegated methods can be mixed on the same bridge.

## Quick start

### 1. Declare the method on the bridge

Pass the method's signature as the generic. Export the bridge type as usual. The Web side sees delegated methods as normal methods.

```tsx
// This file is src/bridge.ts
import { bridge, createWebView, delegate } from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";

export const appBridge = bridge({
  // Regular method: implemented here, shared by every WebView.
  async openInAppBrowser(url: string) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },

  // Delegated methods: only the signature is declared here.
  goBack: delegate<() => Promise<void>>(),
  getUser: delegate<() => Promise<{ id: string; name: string } | null>>(),
});

export type AppBridge = typeof appBridge;

export const { WebView } = createWebView({
  bridge: appBridge,
});
```

### 2. Implement it where the WebView is rendered

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

The `delegate` prop is type-checked against the bridge:

- It is required once the bridge has a `delegate()` method, and autocomplete inside `delegate={{ }}` lists exactly the delegated methods (`goBack` and `getUser` here, not `openInAppBrowser`).
- A missing method, an extra method, or a wrong signature is a type error.

The implementations always run with the WebView's latest props, so `user` above is never stale. You do not need `useCallback` or refs.

### 3. Call it from the Web

Nothing changes on the Web side.

```tsx
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from ""; // Import the type 'appBridge' declared in native

const bridge = linkBridge<AppBridge>();

const user = await bridge.getUser();
await bridge.goBack();
```

## Use cases

### Navigate from the current screen

With a global `navigationRef`, every call acts on the root navigator. With `delegate()`, each WebView screen uses its own `navigation`, so `goBack`, `push`, and `setOptions` affect the screen the page is actually on.

```tsx
// bridge.ts
export const appBridge = bridge({
  goBack: delegate<() => Promise<void>>(),
  push: delegate<(path: string) => Promise<void>>(),
  setTitle: delegate<(title: string) => Promise<void>>(),
});
```

```tsx
// WebViewScreen.tsx
function WebViewScreen({ navigation, route }: Props) {
  return (
    <WebView
      source={{ uri: route.params.url }}
      delegate={{
        goBack: async () => navigation.goBack(),
        push: async (path) =>
          navigation.push("WebView", { url: `https://example.com${path}` }),
        setTitle: async (title) => navigation.setOptions({ title }),
      }}
    />
  );
}
```

See the [React Navigation example](/example/react-navigation) for a complete setup.

### Read auth or other context values

Context values and query clients are only available through hooks. Read them in the screen and return them from the delegated method.

```tsx
// bridge.ts
export const appBridge = bridge({
  getAccessToken: delegate<() => Promise<string | null>>(),
  invalidate: delegate<(key: string) => Promise<void>>(),
});
```

```tsx
// WebViewScreen.tsx
function WebViewScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return (
    <WebView
      source={{ uri: "https://example.com" }}
      delegate={{
        getAccessToken: async () => session?.accessToken ?? null,
        // The web page changed data: refresh the native screens that show it.
        invalidate: async (key) => queryClient.invalidateQueries({ queryKey: [key] }),
      }}
    />
  );
}
```

### Show native UI and wait for the user's answer

A delegated method can return a promise that resolves only when the user acts. This lets the page `await` a native confirm dialog, bottom sheet, or picker that is rendered with the screen's own state.

```tsx
// bridge.ts
export const appBridge = bridge({
  confirm: delegate<(message: string) => Promise<boolean>>(),
});
```

```tsx
// WebViewScreen.tsx
function WebViewScreen() {
  const [dialog, setDialog] = useState<{
    message: string;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const close = (ok: boolean) => {
    dialog?.resolve(ok);
    setDialog(null);
  };

  return (
    <>
      <WebView
        source={{ uri: "https://example.com" }}
        delegate={{
          confirm: (message) =>
            new Promise((resolve) => setDialog({ message, resolve })),
        }}
      />
      <ConfirmDialog
        visible={dialog !== null}
        message={dialog?.message}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </>
  );
}
```

```tsx
// Web
if (await bridge.confirm("Delete this post?")) {
  await deletePost();
}
```

::: warning
`linkBridge` stops waiting for a native method after its `timeout` (2000 ms by default). After that, the call resolves to `undefined`, or rejects if `throwOnError` is set. For methods that wait for the user, raise the timeout or disable it with `timeout: 0`. The option applies to every native method of that `linkBridge` instance.

```tsx
const bridge = linkBridge<AppBridge>({ timeout: 0 });
```
:::

### Pass screen-specific data to the page

Route params and other per-screen values reach the page without query strings or global state.

```tsx
// bridge.ts
export const appBridge = bridge({
  getScreenParams: delegate<() => Promise<{ productId: string }>>(),
});
```

```tsx
// ProductWebViewScreen.tsx
function ProductWebViewScreen({ route }: Props) {
  return (
    <WebView
      source={{ uri: "https://example.com/product" }}
      delegate={{
        getScreenParams: async () => ({ productId: route.params.productId }),
      }}
    />
  );
}
```

### Share implementations across screens

When several screens render the same bridge, put the hooks and implementations in a custom hook typed with `BridgeDelegate`, and spread it into each WebView.

```tsx
import type { BridgeDelegate } from "@webview-bridge/react-native";
import type { AppBridge } from "./bridge";

export const useAppBridgeDelegate = (): BridgeDelegate<AppBridge> => {
  const navigation = useNavigation();
  const { user } = useAuth();

  return {
    goBack: async () => navigation.goBack(),
    getUser: async () => user,
  };
};
```

```tsx
function HomeWebViewScreen() {
  const delegate = useAppBridgeDelegate();
  return <WebView source={{ uri: "https://example.com" }} delegate={delegate} />;
}

function SettingsWebViewScreen() {
  const delegate = useAppBridgeDelegate();
  return (
    <WebView
      source={{ uri: "https://example.com/settings" }}
      // Override one method for this screen only.
      delegate={{ ...delegate, goBack: async () => closeSettings() }}
    />
  );
}
```

## Behavior

- **Each WebView uses its own implementations.** When several WebViews share one bridge (for example a stack of screens), a call from a page always runs the implementation of the WebView that hosts that page.
- **Which methods a page sees is fixed when the WebView mounts.** If a method is missing from the `delegate` prop at mount time, the page does not see it: `bridge.isNativeMethodAvailable("getUser")` returns `false`, and calling it goes through the [fallback](/backward-compatibility/new-method) flow. Implementations can change on every render, but the set of keys should stay the same.
- **Middleware still runs.** [Bridge middleware](/reference/react-native/create-webview#bridge-middleware) runs around delegated methods the same way it runs around regular ones.
- **Delegated methods cannot be called on the native side directly.** `appBridge.getState().goBack()` throws, because the implementation lives on a WebView.
- **Non-React Native environments.** `linkBridge({ initialBridge })` accepts plain implementations for delegated methods, as described in [Non-React Native Environment](/non-react-native-environment).
