import { useEffect, useState } from "react";
import "./App.css";
import { createNativeMethod, createWebMethod } from "@rnbridge/web";
import type { AppBridge } from "@rnbridge/example-native";

export const webBridge = createWebMethod({
  alert: (message: string) => {
    window.alert(message);
  },
  sum: (a: number, b: number) => {
    return a + b;
  },
});

const nativeMethod = createNativeMethod<AppBridge>();

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    nativeMethod.getMessage().then((message) => {
      setMessage(message);
    });
  }, []);

  return (
    <div>
      <h1>{message}</h1>

      <button
        onClick={() =>
          nativeMethod.openInAppBrowser("https://github.com/gronxb/rnbridge")
        }
      >
        open InAppBrowser
      </button>
    </div>
  );
}

export default App;
