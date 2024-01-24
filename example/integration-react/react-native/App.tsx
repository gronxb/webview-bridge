/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { z } from "zod";
import React from "react";
import { Button, SafeAreaView } from "react-native";
import {
  bridge,
  eventBridge,
  createWebView,
  type BridgeWebView,
  bind,
} from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";

export const appMethod = bridge({
  async getMessage() {
    return "Hello from React Native" as const;
  },
  async openInAppBrowser(url: string) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },
});

export const appEvent = eventBridge({
  openModal: z.object({
    isOpen: z.boolean(),
  }),
  openModal2: z.object({
    test: z.boolean(),
  }),
});

export const { WebView, postMessage } = createWebView({
  bridge: bind([appMethod, appEvent]),
  debug: true,
  fallback: (method) => {
    console.warn(`Method '${method}' not found in native`);
  },
});

function App(): JSX.Element {
  const webviewRef = React.useRef<BridgeWebView>(null);

  const handlePostMessage = () => {
    postMessage("openModal", { isOpen: true });
  };

  return (
    <SafeAreaView style={{ height: "100%" }}>
      <WebView
        ref={webviewRef}
        source={{
          uri: "http://localhost:5173",
        }}
        style={{ height: "100%", flex: 1, width: "100%" }}
      />
      <Button onPress={handlePostMessage} title="postMessage (openModal)" />
    </SafeAreaView>
  );
}

export default App;
