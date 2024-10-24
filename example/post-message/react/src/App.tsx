import { useEffect, useState } from "react";
import "./App.css";
import { linkBridge } from "@webview-bridge/web";
import type {
  AppBridge,
  AppPostMessageSchema,
} from "@webview-bridge-example-post-message/react-native/types";

const bridge = linkBridge<AppBridge, AppPostMessageSchema>({
  throwOnError: true,
  onReady: () => {
    console.log("bridge is ready");
  },
  onFallback: (methodName, args) => {
    console.log("fallback", methodName, args);
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

  useEffect(() => {
    // Subscribe to events from react native.
    return bridge.addEventListener("setWebMessage_zod", ({message}) => {
      setMessage(message);
    });
  }, []);

  useEffect(() => {
    // Subscribe to events from react native.
    return bridge.addEventListener("setWebMessage_valibot", ({message}) => {
      setMessage(message);
    });
  }, []);

  return (
    <div>
      <h1>This is a web.</h1>
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
