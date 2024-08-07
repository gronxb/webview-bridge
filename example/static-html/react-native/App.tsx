import React from "react";
import { SafeAreaView } from "react-native";
import {
  createWebView,
  type BridgeWebView,
  bridge,
} from "@webview-bridge/react-native";
import InAppBrowser from "react-native-inappbrowser-reborn";

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

// It is exported via the package.json type field.
export type AppBridge = typeof appBridge;

export const { WebView } = createWebView({
  bridge: appBridge,
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
        // 1. pnpm webpack (output: dist/index.html)
        source={require("./dist/index.html")}
        style={{ height: "100%", flex: 1, width: "100%" }}
      />
    </SafeAreaView>
  );
}

export default App;
