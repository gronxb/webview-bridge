# Shared State in Vanilla

This guide integrates the state declared in [Shared State in React Native](./react-native.md) with `vanilla` within a WebView.


## Installation

::: code-group

```sh [npm]
$ npm add @webview-bridge/web
```

```sh [pnpm]
$ pnpm add @webview-bridge/web
```

```sh [yarn]
$ yarn add @webview-bridge/web
```

:::

## linkBridge

Use the `linkBridge` function to connect with the WebView as shown below.

Assume `AppBridge`, used as a generic, is declared in React Native with the following structure (refer to [Shared State in React Native](./react-native.md)):

### React Native Part
```tsx
// React Native sample
import { bridge, type Bridge } from "@webview-bridge/react-native";

interface AppBridgeState extends Bridge {
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
// This file is src/bridge.ts
import { linkBridge } from "@webview-bridge/web";

export const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  onReady: () => {
    console.log("bridge is ready");
    isReady.value = true;
  },
});

```

## store.getState
The `store.getState()` function allows you to access shared state.

```ts
const { count } = bridge.store.getState();

// using native method
bridge.increase();
```

## store.subscribe
You can subscribe to changes in the shared state using `store.subscribe`

The first argument receives the latest value, while the second argument receives the previous value.

```ts
bridge.store.subscribe((state, prevState) => {
  console.log("state", state);
  console.log("prevState", prevState);
});
```


::: tip NOTE
You can explore a practical example and further understand the implementation by visiting bellow.

* [shared-state-integration-react](https://github.com/gronxb/webview-bridge/tree/main/example/shared-state-integration-react)
* [shared-state-integration-vue](https://github.com/gronxb/webview-bridge/tree/main/example/shared-state-integration-vue)
:::
