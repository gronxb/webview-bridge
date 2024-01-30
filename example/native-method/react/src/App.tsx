import { useEffect, useState } from "react";
import "./App.css";
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge-example-native-method/react-native";

const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  onReady: () => {
    console.log("nativeMethod is ready");
  },
});

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function init() {
      const message = await bridge.getMessage();
      setMessage(message);
    }

    init();
  }, []);

  return (
    <div>
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
