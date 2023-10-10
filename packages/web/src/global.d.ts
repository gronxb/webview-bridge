import type { DefaultEvents, EventEmitter } from "@rnbridge/util";

export {};

declare global {
  interface Window {
    __bridgeMethods__?: string[];
    nativeEmitter?: EventEmitter<DefaultEvents>;
    webEmitter?: EventEmitter<DefaultEvents>;
    ReactNativeWebView: {
      postMessage: (data: string) => void;
    };
  }
}
