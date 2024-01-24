import { createEvents } from "@webview-bridge/util";
import { z } from "zod";

import { EventBridge } from "./types";

export const linkNativeEvent = <
  EventBridgeObject extends EventBridge<EventBridgeObject>,
>() => {
  const emitter = createEvents();

  window.eventEmitter = emitter;
  return {
    on: <K extends keyof Omit<EventBridgeObject, "__signature">>(
      event: K,
      callback: (data: z.infer<EventBridgeObject[K]>) => void,
    ) => {
      return emitter.on(event as string, callback);
    },
  };
};
