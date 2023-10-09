/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from "react";
import { Button, SafeAreaView } from "react-native";
import type { RNBridgeWebView } from "@rnbridge/native";
import { WebView, WebMethod } from "./src/bridge";

function App(): JSX.Element {
  const webviewRef = React.useRef<RNBridgeWebView>(null);

  const handleWebAlert = () => {
    if (WebMethod.current.isReady) {
      WebMethod.current.alert("This called from webview");
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
