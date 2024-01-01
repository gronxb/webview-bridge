import {
  createEvents,
  createRandomId,
  createResolver,
  timeout,
} from "@rnbridge/util";

const emitter = createEvents();

export const linkNativeMethod = <T extends object>(
  options = {
    timeout: 2000,
  },
) => {
  const bridgeMethods = window.__bridgeMethods__;
  if (!bridgeMethods || !window.ReactNativeWebView) {
    throw new Error("Bridge methods not found");
  }

  if (!window.nativeEmitter) {
    window.nativeEmitter = emitter;
  }

  const target = bridgeMethods.reduce((acc, method) => {
    return {
      ...acc,
      [method]: (...args: unknown[]) => {
        const eventId = createRandomId();

        return Promise.race([
          createResolver(emitter, method, eventId, () => {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "bridge",
                body: {
                  method,
                  eventId,
                  args,
                },
              }),
            );
          }),
          timeout(options.timeout),
        ]);
      },
    };
  }, {} as T);

  return new Proxy(target, {
    get: (target, prop: string) => {
      if (prop in target) {
        return (target as { [key: string]: () => string })[prop];
      }

      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "fallback",
          body: {
            method: prop,
          },
        }),
      );
      console.warn(`[linkMethod] ${prop} is not defined`);
    },
  });
};
