import { createEvents } from "@webview-bridge/util";
import { z } from "zod";

import { EventBridge } from "./types";

export const linkNativeEventListener = <
  EventBridgeObject extends EventBridge<EventBridgeObject> = {
    __signature: "eventBridge";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  },
>() => {
  const emitter = createEvents();

  window.eventEmitter = emitter;
  return {
    on: <K extends keyof Omit<EventBridgeObject, "__signature">>(
      eventName: K,
      callback: (data: z.infer<EventBridgeObject[K]>) => void,
    ) => {
      return emitter.on(eventName as string, callback);
    },
  };
};
