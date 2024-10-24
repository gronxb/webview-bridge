/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from "react";
import { Text, Button, SafeAreaView } from "react-native";
import {
  createWebView,
  type BridgeWebView,
  bridge,
  postMessageSchema,
} from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";

import { z } from "zod";
import * as v from "valibot";
export const appBridge = bridge({
  async getMessage() {
    return "I'm from native" as const;
  },
  async openInAppBrowser(url: string) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },
});

export const appSchema = postMessageSchema({
  setWebMessage_zod: {
    validate: (value) => {
      return z.object({ message: z.string() }).parse(value);
    },
  },
  setWebMessage_valibot: {
    validate: (value) => {
      return v.parse(v.object({ message: v.string() }), value);
    },
  },
});


export const { WebView, postMessage } = createWebView({
  bridge: appBridge,
  postMessageSchema: appSchema,
  debug: true,
  fallback: (method) => {
    console.warn(`Method '${method}' not found in native`);
  },
});


function App(): JSX.Element {
  const webviewRef = React.useRef<BridgeWebView>(null);

  return (
    <SafeAreaView style={{ height: "100%" }}>
      <WebView
        ref={webviewRef}
        source={{
          uri: "http://localhost:5173",
        }}
        style={{ height: "100%", flex: 1, width: "100%" }}
      />

      <Text style={{ textAlign: "center", fontSize: 20, fontWeight: "600" }}>
        This is Native
      </Text>

      <Button
        title="setWebMessage (zod)"
        onPress={() => postMessage("setWebMessage_zod", { message: "zod !" })}
      />
      <Button
        title="setWebMessage (valibot)" 
        onPress={() => postMessage("setWebMessage_valibot", { message: "valibot !" })}
      />
    </SafeAreaView>
  );
}

export default App;
