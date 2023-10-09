import type { DefaultEvents, Emitter } from "nanoevents";

export {};

declare global {
  interface Window {
    __bridgeMethods__?: string[];
    bridgeEmitter?: Emitter<DefaultEvents>;
    ReactNativeWebView: {
      postMessage: (data: string) => void;
    };
  }
}
