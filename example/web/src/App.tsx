import { useEffect, useState } from "react";
import "./App.css";
import { createBridge } from "@rnbridge/web";
import type { AppBridge } from "@rnbridge/example-native";

const bridge = createBridge<AppBridge>();

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    bridge.getMessage().then((message) => {
      setMessage(message);
    });
  }, []);

  return (
    <div>
      <h1>{message}</h1>

      <button
        onClick={() =>
          bridge.openInAppBrowser("https://github.com/gronxb/rnbridge")
        }
      >
        open InAppBrowser
      </button>
    </div>
  );
}

export default App;
