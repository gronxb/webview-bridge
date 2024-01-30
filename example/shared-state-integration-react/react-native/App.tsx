/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from "react";
import { Button, Text, SafeAreaView, TextInput, View } from "react-native";
import {
  createWebView,
  type BridgeWebView,
  bridge,
  Bridge,
  useBridge,
} from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";

interface AppBridgeState extends Bridge {
  getMessage(): Promise<string>;
  openInAppBrowser(url: string): Promise<void>;
  count: number;
  increase(): Promise<void>;
  data: {
    text: string;
  };
  setDataText(text: string): Promise<void>;
}

export const appBridge = bridge<AppBridgeState>(({ get, set }) => ({
  async getMessage() {
    return "I'm from native" as const;
  },
  async openInAppBrowser(url: string) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },

  data: {
    text: "",
  },
  count: 0,
  async increase() {
    set({
      count: get().count + 1,
    });
  },
  async setDataText(text) {
    set({
      data: {
        text,
      },
    });
  },
}));

// It is exported via the package.json type field.
export type AppBridge = typeof appBridge;

export const { WebView, linkWebMethod } = createWebView({
  bridge: appBridge,
  debug: true,
  fallback: (method) => {
    console.warn(`Method '${method}' not found in native`);
  },
});

function Count() {
  // render when count changed
  const count = useBridge(appBridge, (state) => state.count);

  return <Text>Native Count: {count}</Text>;
}

function Input() {
  const { data, setDataText } = useBridge(appBridge);

  return (
    <View>
      <Text>Native Count: {data.text}</Text>
      <TextInput
        value={data.text}
        onChangeText={setDataText}
        style={{ borderWidth: 1, width: "50%" }}
      />
    </View>
  );
}

function App(): JSX.Element {
  const webviewRef = React.useRef<BridgeWebView>(null);

  const increase = useBridge(appBridge, (state) => state.increase);

  return (
    <SafeAreaView style={{ height: "100%" }}>
      <WebView
        ref={webviewRef}
        source={{
          uri: "http://localhost:5173",
        }}
        style={{ height: "50%", width: "100%" }}
      />

      <View
        style={{
          justifyContent: "center",
          alignItems: "center",
          height: "50%",
        }}
      >
        <Count />
        <Button onPress={() => increase()} title="Increase From Native" />

        <Input />
      </View>
    </SafeAreaView>
  );
}

export default App;
