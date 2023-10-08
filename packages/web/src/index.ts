import { createEvents } from "./utils/createEvents";
import { createRandomId } from "./utils/createRandomId";

const timeout = (ms: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Timeout"));
    }, ms);
  });
};
const createResolver = (
  method: string,
  eventId: string,
  evaluate: () => void,
) => {
  return new Promise((resolve) => {
    const unbind = emitter.on(`${method}-${eventId}`, (data) => {
      unbind();
      resolve(data);
    });
    evaluate();
  });
};

const emitter = createEvents();

export const createBridge = <T = unknown>(
  options = {
    timeout: 2000,
  },
) => {
  const bridgeSchema = window.__bridgeSchema__;
  if (!bridgeSchema || !window.ReactNativeWebView) {
    throw new Error("Bridge schema not found");
  }

  if (!window.bridgeEmitter) {
    window.bridgeEmitter = emitter;
  }

  return bridgeSchema.reduce((acc, method) => {
    return {
      ...acc,
      [method]: (...args: unknown[]) => {
        const eventId = createRandomId();
        return Promise.race([
          createResolver(method, eventId, () => {
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
