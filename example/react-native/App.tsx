/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState } from "react";
import { Button, Text, SafeAreaView } from "react-native";
import {
  createWebView,
  useBridge,
  type BridgeWebView,
} from "@webview-bridge/react-native";
import { WebBridge } from "@webview-bridge/example-web";
import { appBridge } from "@webview-bridge/example-native";

export const { WebView, linkWebMethod } = createWebView({
  bridge: appBridge,
  debug: true,
  fallback: (method) => {
    console.warn(`Method '${method}' not found in native`);
  },
});

const WebMethod = linkWebMethod<WebBridge>();

const CountValue = () => {
  const count = useBridge(appBridge, (store) => store.count);

  return <Text style={{ textAlign: "center" }}>Native Count: {count}</Text>;
};

const CountButton = () => {
  const increase = useBridge(appBridge, (store) => store.increase);

  return <Button onPress={increase} title="Increase" />;
};

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
      <CountValue />
      <CountButton />

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
