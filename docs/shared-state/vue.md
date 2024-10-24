# Shared State in Vue

This guide integrates the state declared in [Shared State in React Native](./react-native.md) with `Vue` within a WebView.

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
import type { Bridge, BridgeStore } from "@webview-bridge/web";
import { getCurrentInstance, onScopeDispose, ref } from "vue";

import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "";

export const isReady = ref(false);

export const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  onReady: () => {
    isReady.value = true;
    console.log("bridge is ready");
  },
});

export const bridgeStore = bridge.store;

export function useBridge<T extends Bridge>(
  store: Omit<BridgeStore<T>, "setState">,
) {
  const state = ref(store.getState());

  const unsubscribe = store.subscribe((newState) => {
    state.value = newState;
  });

  if (getCurrentInstance()) {
    onScopeDispose(() => {
      unsubscribe?.();
    });
  }

  return state;
}

```

## useBridge
The useBridge hook allows you to access shared state.

Insert the previously `bridge.store` as the first argument.

```vue
<script setup lang="ts">
import { bridge, isReady, useBridge } from "./bridge";

const bridgeStore = useBridge(bridge.store);
</script>

<template>
  <div v-if="isReady">
    <!-- Usage Native Method -->
    <!-- <button @click="bridgeStore.openInAppBrowser('https://github.com/gronxb/webview-bridge')">open InAppBrowser</button> -->

    <div>isReady {{ isReady }}</div>

    <p>Native Count: {{ bridgeStore.count }}</p>

    <button @click="bridgeStore.increase()">Increase from web</button>
  </div>
</template>
```


::: tip NOTE
You can explore a practical example and further understand the implementation by visiting bellow.

* [shared-state-integration-vue](https://github.com/gronxb/webview-bridge/tree/main/example/shared-state-integration-vue)
:::
