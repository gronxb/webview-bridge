/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from "react";
import { SafeAreaView } from "react-native";
import { Webview } from "./src/bridge";

function App(): JSX.Element {
  return (
    <SafeAreaView style={{ height: "100%" }}>
      <Webview
        source={{
          uri: "http://localhost:5173",
        }}
        style={{ height: "100%", flex: 1, width: "100%" }}
      />
    </SafeAreaView>
  );
}

export default App;
