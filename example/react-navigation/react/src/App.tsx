import { useEffect, useState } from "react";
import "./App.css";
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge-example-react-navigation/react-native";

const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  onReady: () => {
    console.log("bridge is ready");
  },
});

function App() {
  const [userId, setUserId] = useState("");

  return (
    <div>
      <h3>This is a web page.</h3>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <button
          onClick={() => {
            if (bridge.isNativeMethodAvailable("openInAppBrowser") === true) {
              bridge.openInAppBrowser(
                "https://github.com/gronxb/webview-bridge",
              );
            }
          }}
        >
          open InAppBrowser
        </button>

        <input
          type="text"
          style={{
            fontSize: "16px",
          }}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="please userId"
        />
        <button
          onClick={() => {
            bridge.push("UserInfo", { userId });
          }}
        >
          Go UserInfo
        </button>

        <button
          onClick={async () => {
            if (await bridge.canGoBack()) {
              bridge.goBack();
            } else {
              alert("Can't go back");
            }
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

export default App;
