# Example React Navigation
This guide is about integrating WebView, the web, and React Navigation.

<video src="/react-navigation.mp4" width="320" height="240" muted autoplay loop />

Example: [react-navigation](https://github.com/gronxb/webview-bridge/tree/main/example/react-navigation)

There are two ways to connect bridge methods to React Navigation:

| | Per-screen `navigation` with `delegate()` | Global `navigationRef` |
|---|---|---|
| Which navigator a call acts on | The screen that renders the WebView | The root navigator |
| Screen APIs such as `setOptions` | Yes | No |
| Where the code lives | The screen component | The bridge module |

Use `delegate()` when a page should control its own screen, for example a stack of WebView screens. The global ref is simpler when a single WebView drives app-wide navigation. The [example project](https://github.com/gronxb/webview-bridge/tree/main/example/react-navigation) uses the global ref.

## Per-screen navigation with `delegate()`

Declare the navigation methods with `delegate()`, and implement them with the `navigation` prop of each WebView screen.

```tsx
// This file is src/bridge.ts
import { bridge, createWebView, delegate } from "@webview-bridge/react-native";
import { z } from "zod";
import type { RootStackParamList } from "./navigation";

export const appBridge = bridge({
  canGoBack: delegate({ output: z.boolean() }),
  goBack: delegate(),
  // A generic signature can't be written as a schema, so it uses a type argument.
  push: delegate<
    <RouteName extends keyof RootStackParamList>(
      name: RouteName,
      params: RootStackParamList[RouteName],
    ) => Promise<void>
  >(),
  setTitle: delegate({ input: z.string() }),
});

export type AppBridge = typeof appBridge;

export const { WebView } = createWebView({ bridge: appBridge });
```

```tsx
// This file is src/screens/WebViewScreen.tsx
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WebView } from "../bridge";
import type { RootStackParamList } from "../navigation";

export function WebViewScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "WebViewHome">) {
  return (
    <WebView
      source={{ uri: "http://localhost:5173" }}
      style={{ flex: 1 }}
      delegate={{
        canGoBack: async () => navigation.canGoBack(),
        goBack: async () => navigation.goBack(),
        push: async (name, params) => navigation.push(name as any, params as any),
        setTitle: async (title) => navigation.setOptions({ title }),
      }}
    />
  );
}
```

Pushing another `WebViewHome` screen gives each page its own `navigation`. A `goBack()` from the top page pops only that screen, and `setTitle()` changes only that screen's header.

The Web side is the same as in the global-ref version below:

```tsx
await bridge.setTitle("Profile");
bridge.push("UserInfo", { userId });
```

For more patterns, see [Using React Hooks in Native Methods](/using-react-hooks-in-native-methods).

## Global navigationRef

The rest of this page matches the example project: the bridge methods call a `navigationRef` passed to `NavigationContainer`.


### React Native Part

```tsx
// This file is src/navigation.ts

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Feed: { sort: 'latest' | 'top' } | undefined;
};
```

```tsx
// This file is src/bridge.ts

import {
  StackActions,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createWebView, bridge } from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";
import { RootStackParamList } from "./navigation";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const existsScreen = (name: string): boolean => {
  return Boolean(
    navigationRef.current?.isReady() &&
      navigationRef.current
        .getState()
        .routeNames.find((routeName) => routeName === name),
  );
};

export const appBridge = bridge({
  async getMessage() {
    return "I'm from native" as const;
  },
  async openInAppBrowser(url: string) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },
  async canGoBack() {
    return Boolean(
      navigationRef.current?.isReady() && navigationRef.current.canGoBack(),
    );
  },
  async goBack() {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.goBack();
    }
  },
  async navigate<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params: RootStackParamList[RouteName],
  ) {
    if (navigationRef.current?.isReady()) {
      if (!existsScreen(name)) {
        throw new Error(`Screen ${name} not found`);
      }
      navigationRef.current.navigate(name as any, params as any);
    }
  },
  async push<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params: RootStackParamList[RouteName],
  ) {
    if (navigationRef.current?.isReady()) {
      if (!existsScreen(name)) {
        throw new Error(`Screen ${name} not found`);
      }
      navigationRef.current.dispatch(StackActions.push(name, params));
    }
  },
  async replace<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params: RootStackParamList[RouteName],
  ) {
    if (navigationRef.current?.isReady()) {
      if (!existsScreen(name)) {
        throw new Error(`Screen ${name} not found`);
      }
      navigationRef.current.dispatch(StackActions.replace(name, params));
    }
  },
  async popToTop() {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.dispatch(StackActions.popToTop());
    }
  },
});

// It is exported via the package.json type field.
export type AppBridge = typeof appBridge;

export const { WebView, linkWebMethod } = createWebView({
  bridge: appBridge,
  debug: true,
  fallback: (method) => {
    console.warn(`Method '${method}' not found in native`);
  },
});

```

```tsx
// This file is App.tsx
import React from "react";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View, Text, Button } from "react-native";
import { WebView, navigationRef } from "./src/bridge";
import { RootStackParamList } from "./src/navigation";

function WebViewHomeScreen() {
  return (
    <View style={{ height: "100%" }}>
      <WebView
        source={{
          uri: "http://localhost:5173",
        }}
        style={{ height: "100%", flex: 1, width: "100%" }}
      />
    </View>
  );
}

function UserInfoScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "UserInfo">) {
  const { userId } = route.params;

  return (
    <View style={{ height: "100%" }}>
      <Text>UserId: {userId}</Text>

      <Button
        title="New WebView"
        onPress={() => navigation.push("WebViewHome")}
      />
      <Button title="Go back" onPress={() => navigation.goBack()} />
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): JSX.Element {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="WebViewHome">
        <Stack.Screen name="WebViewHome" component={WebViewHomeScreen} />
        <Stack.Screen name="UserInfo" component={UserInfoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;

```



### Web (React) Part
```tsx
// This file is App.tsx
import { useState } from "react";
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge-example-react-navigation/react-native";

const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  onReady: () => {
    console.log("bridge is ready");
  },
});

function App() {
  const [userId, setUserId] = useState("");

  return (
    <div>
      <h3>This is a web page.</h3>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <button
          onClick={() => {
            if (bridge.isNativeMethodAvailable("openInAppBrowser") === true) {
              bridge.openInAppBrowser(
                "https://github.com/gronxb/webview-bridge",
              );
            }
          }}
        >
          open InAppBrowser
        </button>

        <input
          type="text"
          style={{
            fontSize: "16px",
          }}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="please userId"
        />
        <button
          onClick={() => {
            bridge.push("UserInfo", { userId });
          }}
        >
          Go UserInfo
        </button>

        <button
          onClick={async () => {
            if (await bridge.canGoBack()) {
              bridge.goBack();
            } else {
              alert("Can't go back");
            }
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

export default App;
```
