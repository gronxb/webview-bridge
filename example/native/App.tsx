/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState } from "react";
import { Button, Text, SafeAreaView } from "react-native";
import { bridge, createWebView, type RNBridgeWebView } from "@rnbridge/native";
import InAppBrowser from "react-native-inappbrowser-reborn";
import { WebBridge } from "@rnbridge/example-web";

export const appBridge = bridge({
  getMessage: () => {
    return "I'm from native" as const;
  },
  openInAppBrowser: async (url: string) => {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },
});

export const { WebView, linkWebMethod } = createWebView({
  bridge: appBridge,
  debug: true,
  fallback: (method) => {
    console.warn(`Method '${method}' not found in native`);
  },
});

const WebMethod = linkWebMethod<WebBridge>();

function App(): JSX.Element {
  const [value, setValue] = useState(0);

  const webviewRef = React.useRef<RNBridgeWebView>(null);

  const handleWebAlert = () => {
    if (WebMethod.current.isReady) {
      WebMethod.current.alert("This called from webview");
    }
  };

  const handleSum = () => {
    if (WebMethod.current.isReady) {
      WebMethod.current.sum(1, 2).then((result) => setValue(result));
    }
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
    </SafeAreaView>
  );
}

export default App;
