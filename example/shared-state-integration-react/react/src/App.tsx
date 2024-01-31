import "./App.css";
import { linkBridge } from "@webview-bridge/web";
import { useBridge } from "@webview-bridge/react";

import type { AppBridge } from "@webview-bridge-example-shared-state-integration-react/react-native";

const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  onReady: () => {
    console.log("nativeMethod is ready");
  },
});

function Count() {
  const count = useBridge(bridge.store, (state) => state.count);

  return <p>Native Count: {count}</p>;
}

function DataText() {
  const text = useBridge(bridge.store, (state) => state.data.text);

  return (
    <div>
      <p>Native Data Text: {text}</p>
      <input
        type="text"
        value={text}
        onChange={(e) => bridge.setDataText(e.target.value)}
      />
    </div>
  );
}

function App() {
  const increase = useBridge(bridge.store, (state) => state.increase);

  return (
    <div>
      <div>
        {`isWebViewBridgeAvailable: ${String(bridge.isWebViewBridgeAvailable)}`}
      </div>
      <h2>This is WebView</h2>

      <button
        onClick={() => {
          if (bridge.isNativeMethodAvailable("openInAppBrowser") === true) {
            bridge.openInAppBrowser("https://github.com/gronxb/webview-bridge");
          }
        }}
      >
        open InAppBrowser
      </button>

      <Count />
      <button
        onClick={() => {
          increase(); // or bridge.increase()
        }}
      >
        Increase from web
      </button>

      <DataText />
    </div>
  );
}

export default App;
