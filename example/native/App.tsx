/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from "react";
import { Button, SafeAreaView } from "react-native";
import type { RNBridgeWebView } from "@rnbridge/native";
import { WebView } from "./src/bridge";
import { WebBridge } from "@rnbridge/example-web";

function App(): JSX.Element {
  const webviewRef = React.useRef<RNBridgeWebView<WebBridge>>(null);

  const handleWebAlert = () => {
    if (webviewRef.current?.isReady) {
      webviewRef.current.alert("Hello from React Native!");
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
    </SafeAreaView>
  );
}

export default App;
