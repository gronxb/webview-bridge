# Using React Hooks in Native Methods

Native methods are declared with `bridge({...})` at module scope, outside of any React component. So a regular native method cannot call `useNavigation()`, read a context value, or update a component's state.

`delegate()` solves this. You declare the method on the bridge, and the screen that renders the WebView provides the **implementation** through the WebView's `delegate` prop, where hooks are available. Types are inferred from a [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType, ...), so you don't write the signature yourself.

```tsx
// bridge.ts: declare
goBack: delegate(),
setTitle: delegate(z.string()),

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

`delegate(input, output?)` takes the method's schemas. Export the bridge type as usual. The Web side sees delegated methods as normal methods.

```tsx
// This file is src/bridge.ts
import { bridge, createWebView, delegate } from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";
import { z } from "zod";

const userSchema = z.object({ id: z.string(), name: z.string() }).nullable();

export const appBridge = bridge({
  // Regular method: implemented here, shared by every WebView.
  async openInAppBrowser(url: string) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },

  // Delegated methods: implemented by each WebView.
  goBack: delegate(), // no input, no return value
  getUser: delegate(z.void(), userSchema), // no input, returns a user
  setTitle: delegate(z.string()), // takes a title
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
        setTitle: async (title) => navigation.setOptions({ title }),
      }}
    />
  );
}
```

The `delegate` prop is type-checked against the bridge:

- It is required once the bridge has a `delegate()` method, and autocomplete inside `delegate={{ }}` lists exactly the delegated methods (`goBack`, `getUser` and `setTitle` here, not `openInAppBrowser`).
- A missing method, an extra method, or a wrong signature is a type error.

The implementations always run with the WebView's latest props, so `user` above is never stale. You do not need `useCallback` or refs.

### 3. Call it from the Web

Nothing changes on the Web side.

```tsx
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from ""; // Import the type 'appBridge' declared in native

const bridge = linkBridge<AppBridge>();

const user = await bridge.getUser(); // { id: string; name: string } | null
await bridge.setTitle("Profile");
await bridge.goBack();
```

## Declaring a delegated method

### With a schema

`delegate(input, output?)` takes [Standard Schemas](https://standardschema.dev) and infers every type from them. Values are validated on native, because the page that calls the method is not trusted.

| | Page (Web) | Native implementation |
|---|---|---|
| `input` | passes the schema's **input** type | receives the schema's **output** type (validated, transforms applied) |
| `output` (optional) | receives the schema's **output** type | returns the schema's **input** type |

```tsx
getUser: delegate(
  z.object({ id: z.string().transform(Number) }), // page sends { id: "7" }, native gets { id: 7 }
  z.object({ id: z.number(), name: z.string() }),
),
```

- `delegate()` takes nothing and resolves to `void`.
- `delegate(input)` without an output schema resolves to `unknown` on the page.
- A method that takes nothing but returns a value uses a schema that accepts `undefined`, such as `z.void()` or `v.void()`. The page then calls it without an argument.
- The input schema describes **one** argument. Use an object schema for several values.
- Invalid input never reaches the implementation, and native logs a warning. An invalid return value is logged as an error. In both cases the call fails with a `BridgeValidationError`: it rejects when `throwOnError` applies to the method, and resolves to `undefined` otherwise, like any other native error.

### With a type argument

Without a schema library, or for a signature a schema can't express (for example a generic function), pass the signature as a type argument. Nothing is validated at runtime.

```tsx
confirm: delegate<(message: string) => Promise<boolean>>(),
push: delegate<
  <Name extends keyof RootStackParamList>(
    name: Name,
    params: RootStackParamList[Name],
  ) => Promise<void>
>(),
```

## Use cases

### Navigate from the current screen

With a global `navigationRef`, every call acts on the root navigator. With `delegate()`, each WebView screen uses its own `navigation`, so `goBack`, `push`, and `setOptions` affect the screen the page is actually on.

```tsx
// bridge.ts
export const appBridge = bridge({
  goBack: delegate(),
  push: delegate(z.string()),
  setTitle: delegate(z.string()),
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
  getAccessToken: delegate(z.void(), z.string().nullable()),
  invalidate: delegate(z.string()),
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
  confirm: delegate(z.string(), z.boolean()),
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

The page waits as long as the user takes. `linkBridge`'s `timeout` only limits how long native takes to acknowledge the call, not how long the method runs.

::: warning Apps built with `@webview-bridge/react-native` before 1.9.0
Older native builds do not acknowledge calls, so `timeout` (2000 ms by default) applies to the whole call. The call then resolves to `undefined`, or rejects if `throwOnError` is set. If your page can run inside such an app, raise the timeout or disable it with `timeout: 0`. The option applies to every native method of that `linkBridge` instance.

```tsx
const bridge = linkBridge<AppBridge>({ timeout: 0 });
```
:::

### Pass screen-specific data to the page

Route params and other per-screen values reach the page without query strings or global state.

```tsx
// bridge.ts
export const appBridge = bridge({
  getScreenParams: delegate(z.void(), z.object({ productId: z.string() })),
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
