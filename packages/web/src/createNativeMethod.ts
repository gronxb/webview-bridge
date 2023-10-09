import { createEvents, createRandomId, createResolver, timeout } from "./utils";

const emitter = createEvents();

export const createNativeMethod = <T = unknown>(
  options = {
    timeout: 2000,
  },
) => {
  const bridgeMethods = window.__bridgeMethods__;
  if (!bridgeMethods || !window.ReactNativeWebView) {
    throw new Error("Bridge methods not found");
  }

  if (!window.bridgeEmitter) {
    window.bridgeEmitter = emitter;
  }

  return bridgeMethods.reduce((acc, method) => {
    return {
      ...acc,
      [method]: (...args: unknown[]) => {
        const eventId = createRandomId();
        return Promise.race([
          createResolver(emitter, method, eventId, () => {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "bridge",
                method,
                eventId,
                args,
              }),
            );
          }),
          timeout(options.timeout),
        ]);
      },
    };
  }, {} as T);
};
