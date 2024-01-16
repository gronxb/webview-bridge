import { useEffect, useState } from "react";
import "./App.css";
import { linkNativeMethod, registerWebMethod } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge/example-native";

export const webBridge = registerWebMethod({
  async alert(message: string) {
    window.alert(message);
  },
  async sum(a: number, b: number) {
    return a + b;
  },
});

const nativeMethod = linkNativeMethod<AppBridge>({
  throwOnError: true,
});

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function init() {
      const version = await nativeMethod.getBridgeVersion();
      if (version >= 2) {
        const message = await nativeMethod.getMessage();
        setMessage(message);
      } else {
        // Support for old native methods with `loose`
        const oldVersionMessage =
          await nativeMethod.loose.getOldVersionMessage();
        setMessage(oldVersionMessage);
      }
    }

    init();
  }, []);

  return (
    <div>
      <h1>This is a web page.</h1>
      <h1>{message}</h1>
      <button
        onClick={() => {
          if (
            nativeMethod.isNativeMethodAvailable("openInAppBrowser") === true
          ) {
            nativeMethod.openInAppBrowser(
              "https://github.com/gronxb/webview-bridge",
            );
          }
        }}
      >
        open InAppBrowser
      </button>

      <div>
        {`isWebViewBridgeAvailable: ${String(
          nativeMethod.isWebViewBridgeAvailable,
        )}`}
      </div>
    </div>
  );
}

export default App;
