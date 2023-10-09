import type { Bridge } from "./types";
import { createEvents } from "./utils";

export const createWebMethod: Bridge = (bridge) => {
  const bridgeEntries = Object.entries(bridge);
  const bridgeNames = Object.keys(bridge);
  const emitter = createEvents();

  window.webEmitter = emitter;

  for (const [funcName, func] of bridgeEntries) {
    const $func = async (args: unknown[]) => {
      func(...args);
    };

    emitter.on(funcName, $func);
  }

  const register = () => {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "createWebMethod",
        body: { bridgeNames },
      }),
    );
    window.removeEventListener("DOMContentLoaded", register);
  };

  if (!window.ReactNativeWebView) {
    window.addEventListener("DOMContentLoaded", register);
  }

  register();
  return bridge;
};
