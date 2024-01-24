import type { DefaultEvents, EventEmitter } from "@webview-bridge/util";

export {};

declare global {
  interface Window {
    __bridgeMethods__?: string[];
    nativeEmitter?: EventEmitter<DefaultEvents>;
    webEmitter?: EventEmitter<DefaultEvents>;
    eventEmitter?: EventEmitter<DefaultEvents>;
    ReactNativeWebView: {
      postMessage: (data: string) => void;
    };
  }
}
