# createWebView
The `createWebView` is used to create a WebView with an interface that enables communication with the web.

## Options 

| Prop             | Type                           | Required | Default | Description                                                                 |
|------------------|--------------------------------|----------|---------|-----------------------------------------------------------------------------|
| `bridge`         | Object                         | true     | X       | Represents the bridge between React Native and the WebView.                  |
| `debug`          | boolean                        | false    | false   | Outputs console.log from the web in React Native.                                          |
| `responseTimeout`| number                         | false    | 2000    | Timeout duration when executing web methods.                   |
| `fallback`       | (method: keyof T) => void      | false    | X       |Callback function called when a method from the bridge is not found.         |

## WebView props

The returned `WebView` accepts every prop of `react-native-webview`, plus:

| Prop             | Type                       | Required                                       | Description                                                                                       |
|------------------|----------------------------|------------------------------------------------|---------------------------------------------------------------------------------------------------|
| `delegate` | `BridgeDelegate<AppBridge>` | true when the bridge has `delegate()` methods | Implementations for the methods declared with `delegate()`. Runs with this WebView's latest props. |

## Delegated methods

`delegate<Signature>()` declares a bridge method whose implementation is
provided per WebView through the WebView's `delegate` prop, so it can use hooks
and context.

```tsx
import { bridge, createWebView, delegate } from "@webview-bridge/react-native";

export const appBridge = bridge({
  goBack: delegate<() => Promise<void>>(),
});

export const { WebView } = createWebView({ bridge: appBridge });

function Screen() {
  const navigation = useNavigation();
  return (
    <WebView delegate={{ goBack: async () => navigation.goBack() }} />
  );
}
```

A delegated method is exposed to a page only when its WebView has the handler
at mount time. See [Using React Hooks in Native Methods](/using-react-hooks-in-native-methods).

## Bridge middleware

`bridge(...).use(...)` registers instance-scoped middleware for Web-to-Native
method calls.

```tsx
import {
  bridge,
  type BridgeMiddleware,
} from "@webview-bridge/react-native";

const logger: BridgeMiddleware = async ({ method }, next) => {
  console.log(`Calling ${method}`);
  const result = await next();
  console.log(`Called ${method}`);
  return result;
};

const appBridge = bridge({
  async getMessage() {
    return "Hello, I'm native";
  },
}).use(logger);
```

Middleware receives `{ url, method, args }` and `next()`. It may update `args`,
attach typed context fields to the shared request, short-circuit without calling
`next()`, or transform the returned value.
`use()` returns the same bridge store for chaining; call `next()` at most once.

`url` is the top-level URL reported by `react-native-webview`, not a verified
caller origin. Middleware applies only to bridge method calls and does not
intercept navigation or network requests.
