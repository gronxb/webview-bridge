import type { DefaultEvents, Emitter } from "nanoevents";

export {};

declare global {
  interface Window {
    __bridgeMethods__?: string[];
    nativeEmitter?: Emitter<DefaultEvents>;
    webEmitter?: Emitter<DefaultEvents>;
    ReactNativeWebView: {
      postMessage: (data: string) => void;
    };
  }
}
