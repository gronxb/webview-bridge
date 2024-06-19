import { createEvents } from "@webview-bridge/util";

import type { WebBridge } from "./types";

export const registerWebMethod = <BridgeObject extends WebBridge>(
  bridge: BridgeObject,
): BridgeObject => {
  if (typeof window !== "undefined" && !window.ReactNativeWebView) {
    console.warn("[WebViewBridge] Not in a WebView environment");
    return bridge;
  }

  const bridgeEntries = Object.entries(bridge);
  const bridgeNames = Object.keys(bridge);
  const emitter = createEvents();

  window.webEmitter = emitter;

  for (const [funcName, func] of bridgeEntries) {
    const $func = async (eventId: string, args: unknown[]) => {
      try {
        const value = await func(...args);
        window.ReactNativeWebView?.postMessage(
          JSON.stringify({
            type: "webMethodResponse",
            body: { funcName, eventId, value },
          }),
        );
      } catch (e) {
        window.ReactNativeWebView?.postMessage(
          JSON.stringify({
            type: "webMethodError",
            body: { funcName, eventId, error: JSON.stringify(e) },
          }),
        );
      }
    };

    emitter.on(funcName, $func);
  }

  const register = () => {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: "registerWebMethod",
        body: { bridgeNames },
      }),
    );
    window.removeEventListener("DOMContentLoaded", register);
  };

  if (!window.ReactNativeWebView) {
    window.addEventListener("DOMContentLoaded", register);
    return bridge;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      window.ReactNativeWebView?.postMessage(
        JSON.stringify({
          type: "registerWebMethod",
          body: { bridgeNames },
        }),
      );
    }
  });

  register();
  return bridge;
};
