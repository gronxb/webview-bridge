# createWebView
The `createWebView` is used to create a WebView with an interface that enables communication with the web.

## Options 

| Prop             | Type                           | Required | Default | Description                                                                 |
|------------------|--------------------------------|----------|---------|-----------------------------------------------------------------------------|
| `bridge`         | Object                         | true     | X       | Represents the bridge between React Native and the WebView.                  |
| `debug`          | boolean                        | false    | false   | Outputs console.log from the web in React Native.                                          |
| `responseTimeout`| number                         | false    | 2000    | Timeout duration when executing web methods.                   |
| `fallback`       | (method: keyof T) => void      | false    | X       |Callback function called when a method from the bridge is not found.         |

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
