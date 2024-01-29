import { useEffect, useState } from "react";
import "./App.css";
import { linkBridge, registerWebMethod } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge/example-native";
import { useBridge } from "./useBridge";

export const webBridge = registerWebMethod({
  async alert(message: string) {
    window.alert(message);
  },
  async sum(a: number, b: number) {
    return a + b;
  },

  // (test) Calling this function will result in an error.
  timeoutSum(a: number, b: number) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(a + b);
      }, 3000);
    });
  },
  // (test) Calling this function will result in an error.
  async throw(thrown: boolean) {
    if (thrown) {
      throw new Error("Thrown from web");
    }
    return true;
  },
});

const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  onReady: async (method) => {
    console.log("nativeMethod is ready");
    const version = await method.getBridgeVersion();
    console.log("currentBridgerVersion", version);
  },
});

function App() {
  const [message, setMessage] = useState("");

  const count = useBridge(bridge.store, (store) => store.count);
  const increase = useBridge(bridge.store, (store) => store.increase);
  const { token } = useBridge(bridge.store, (store) => store.auth);

  useEffect(() => {
    async function init() {
      const version = await bridge.getBridgeVersion();
      if (version >= 2) {
        const message = await bridge.getMessage();
        setMessage(message);
      } else {
        // Support for old native methods with `loose`
        const oldVersionMessage = await bridge.loose.getOldVersionMessage();
        setMessage(oldVersionMessage);
      }
    }

    init();
  }, []);

  return (
    <div>
      <p>auth {token}</p>
      <p>native state: {count}</p>
      <button onClick={() => increase()}>increase from web</button>
      <h1>This is a web page.</h1>
      <h1>{message}</h1>
      <button
        onClick={() => {
          if (bridge.isNativeMethodAvailable("openInAppBrowser") === true) {
            bridge.openInAppBrowser("https://github.com/gronxb/webview-bridge");
          }
        }}
      >
        open InAppBrowser
      </button>

      <div>
        {`isWebViewBridgeAvailable: ${String(bridge.isWebViewBridgeAvailable)}`}
      </div>
    </div>
  );
}

export default App;
