import { useEffect, useState } from "react";
import "./App.css";
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge-example-native-method/react-native/types";

const bridge = linkBridge<AppBridge>({
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
  const [errorMessage, setErrorMessage] = useState("");

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

      <button
        style={{ marginTop: 8 }}
        onClick={async () => {
          try {
            await bridge.throwError();
          } catch (err) {
            if (err instanceof Error) {
              setErrorMessage(err.message);
            }
          }
        }}
      >
        Test Error from Native
      </button>

      {errorMessage && (
        <div style={{ marginTop: 16, padding: 12, background: "#fee", border: "1px solid red" }}>
          <strong>Error caught: </strong>{errorMessage}
        </div>
      )}

      <div>
        {`isWebViewBridgeAvailable: ${String(bridge.isWebViewBridgeAvailable)}`}
      </div>
    </div>
  );
}

export default App;
