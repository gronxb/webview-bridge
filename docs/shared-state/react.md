# Shared State in React

This guide integrates the state declared in [Shared State in React Native](./react-native.md) with `React` within a WebView.

## Installation

::: code-group

```sh [npm]
$ npm add -D @webview-bridge/react
```

```sh [pnpm]
$ pnpm add -D @webview-bridge/react
```

```sh [yarn]
$ yarn add -D @webview-bridge/react
```

:::

## linkBridge

Use the `linkBridge` function to connect with the WebView as shown below.

Assume `AppBridge`, used as a generic, is declared in React Native with the following structure (refer to [Shared State in React Native](./react-native.md)):

### React Native Part
```tsx
// React Native sample
import { bridge } from "@webview-bridge/react-native";

type AppBridgeState = {
  count: number;
  increase(): Promise<void>;
};

export const appBridge = bridge<AppBridgeState>(({ get, set }) => ({
  count: 0,
  async increase() {
    set({
      count: get().count + 1,
    });
  },
}));

// It is exported via the package.json type field.
export type AppBridge = typeof appBridge;
```

### Web Part
```tsx
// Web
import { linkBridge } from "@webview-bridge/web";

const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  onReady: () => {
    console.log("bridge is ready");
  },
});

```

## useBridge
The useBridge hook allows you to access shared state.

### With Selector
Insert the previously `bridge.store` as the first argument and a `selector` as the second. Using a `selector` optimizes rendering.

For example, the code below only re-renders when the count value changes.

```tsx
import { useBridge } from "@webview-bridge/react";

function Count() {
  // render when only count changed
  const count = useBridge(bridge.store, (state) => state.count);

  return <p>Native Count: {count}</p>;
}
```

### Without Selector
Retrieve without a selector. However, it re-renders if any value changes.

```tsx
import { useBridge } from "@webview-bridge/react";

function CountAndIncrease() {
  // render when any value changes
  const { count, increase } = useBridge(bridge.store);

  return (
    <div>
        <p>Native Count: {count}</p>
        <button onClick={() => increase()}>Increase</button>
    </div>
    );
}
```


::: tip NOTE
You can explore a practical example and further understand the implementation by visiting bellow.

* [shared-state-integration-react](https://github.com/gronxb/webview-bridge/tree/main/example/shared-state-integration-react)
:::
