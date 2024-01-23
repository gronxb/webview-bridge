/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { z } from "zod";
import React, { useState } from "react";
import { Button, Text, SafeAreaView } from "react-native";
import {
  bridge,
  eventBridge,
  createWebView,
  type BridgeWebView,
  bind,
} from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";
import { WebBridge } from "@webview-bridge/example-web";

export const appBridge = bridge({
  // A bridge scenario that existed in the past. Assume the this method existed in a previous version.
  // async getBridgeVersion() {
  //   return 1;
  // },
  // async getOldVersionMessage() {
  //   return "I'm from native old version" as const;
  // },
  async getBridgeVersion() {
    return 2;
  },
  async getMessage() {
    return "I'm from native" as const;
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

export const { WebView, linkWebMethod, postMessage } = createWebView({
  bridge: bind([appBridge, appEvent]),
  debug: true,
  fallback: (method) => {
    console.warn(`Method '${method}' not found in native`);
  },
});

postMessage("openModal", { isOpen: true });

const WebMethod = linkWebMethod<WebBridge>();

function App(): JSX.Element {
  const [value, setValue] = useState(0);

  const webviewRef = React.useRef<BridgeWebView>(null);

  const handleWebAlert = () => {
    if (WebMethod.current.isReady) {
      WebMethod.current.alert("This called from webview");
    }
  };

  const handleSum = () => {
    if (WebMethod.current.isReady) {
      WebMethod.current.sum(1, 2).then((result) => {
        setValue(result);
      });
    }
  };

  const handleError = () => {
    // test for timeout
    WebMethod.current.timeoutSum(1, 2).catch((e) => console.error("(test)", e));

    // test for throw
    WebMethod.current.throw(true).catch((e) => console.error("(test)", e));
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
      <Button onPress={handleWebAlert} title="Web Alert" />
      {value > 0 && (
        <Text style={{ alignSelf: "center" }}>
          This value called from webview 1 + 2 = {value}
        </Text>
      )}
      <Button onPress={handleSum} title="Web Sum" />

      <Button onPress={handleError} title="Error Test" />
    </SafeAreaView>
  );
}

export default App;
