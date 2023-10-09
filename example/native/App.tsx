/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from "react";
import { SafeAreaView } from "react-native";
import { WebView, WebMethod } from "./src/bridge";

function App(): JSX.Element {
  useEffect(() => {
    setTimeout(() => {
      WebMethod.current.alert("Hello World");
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={{ height: "100%" }}>
      <WebView
        source={{
          uri: "http://localhost:5173",
        }}
        style={{ height: "100%", flex: 1, width: "100%" }}
      />
    </SafeAreaView>
  );
}

export default App;
