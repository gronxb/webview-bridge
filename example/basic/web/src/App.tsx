import { z } from "zod";
import { useEffect, useState } from "react";
import "./App.css";
import {
  linkNativeMethod,
  linkNativeEvent,
  registerWebMethod,
} from "@webview-bridge/web";
import type { AppMethod, AppEvent } from "@webview-bridge/example-native";

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

const nativeMethod = linkNativeMethod<AppMethod>({
  throwOnError: true,
});

const emitter = linkNativeEvent<AppEvent>();

function useNativeEventListener<K extends keyof Omit<AppEvent, "__signature">>(
  eventName: K,
  cb: (data: z.infer<Omit<AppEvent, "__signature">[K]>) => void,
) {
  useEffect(() => {
    return emitter.on(eventName, cb);
  }, []);
}

function App() {
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useNativeEventListener("openModal", ({ isOpen }) => {
    setIsOpen(isOpen);
  });

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

      {isOpen ? <p>Hello. I'm Modal</p> : null}

      <div>
        {`isWebViewBridgeAvailable: ${String(
          nativeMethod.isWebViewBridgeAvailable,
        )}`}
      </div>
    </div>
  );
}

export default App;
