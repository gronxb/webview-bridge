# Shared State in React Native

This guide covers how to declare state in React Native and share it with the web.


<video src="/shared-state.mp4" width="320" height="240" muted autoplay loop />

Example: [shared-state-integration-react](https://github.com/gronxb/webview-bridge/tree/main/example/shared-state-integration-react)

## Registering a Bridge

::: tip NOTE
The declaration should coexist with native methods, and its usage is similar to `zustand`.
:::


To declare state, you first need to define a basic type like `interface AppBridgeState` 
Then, this type is inserted into the generic of `bridge`

The bridge arguments utilize `callback` that can `get()` and `set()` values.

You can retrieve the current value with `get()` and modify it using `set()`

```tsx
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

## useBridge
The useBridge hook allows you to access shared state.

### with Selector
Insert the previously declared `appBridge` as the first argument and a `selector` as the second. Using a `selector` optimizes rendering.

For example, the code below only re-renders when the count value changes.

```tsx
import { Text } from "react-native";
import { useBridge } from "@webview-bridge/react-native"; 

function Count() {
  // render when count changed
  const count = useBridge(appBridge, (state) => state.count);

  return <Text>Native Count: {count}</Text>;
}

```
### without Selector
Retrieve without a selector. However, it re-renders if any value changes.

```tsx
import { View, Text, Button } from "react-native";
import { useBridge } from "@webview-bridge/react-native"; 

function CountAndIncrease() {
  const { count, increase } = useBridge(appBridge);

  return (
       <View>
           <Text>Native Count: {count}</Text>
           <Button onPress={() => increase()} title="Increase" />
      </View>
    );
}

```


::: tip NOTE
You can explore a practical example and further understand the implementation by visiting bellow.

* [shared-state-integration-react](https://github.com/gronxb/webview-bridge/tree/main/example/shared-state-integration-react)
* [shared-state-integration-vue](https://github.com/gronxb/webview-bridge/tree/main/example/shared-state-integration-vue)
:::
