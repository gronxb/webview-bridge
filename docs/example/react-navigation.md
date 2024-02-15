# Example React Navigation

This guide covers how to declare state in React Native and share it with the web.

<video width="320" height="240" muted autoplay loop>
  <source src="/react-navigation.mp4" type="video/mp4">
</video>

Example: [react-navigation](https://github.com/gronxb/webview-bridge/tree/main/example/react-navigation)


## React Native Part

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
      navigationRef.current.navigate(name as any, params as any);
    }
  },
  async push<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params: RootStackParamList[RouteName],
  ) {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.dispatch(StackActions.push(name, params));
    }
  },
  async replace<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params: RootStackParamList[RouteName],
  ) {
    if (navigationRef.current?.isReady()) {
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



## Web (React) Part
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
