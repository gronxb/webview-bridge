import { AsyncFunction } from "@webview-bridge/types";

export type WebBridge = Record<string, AsyncFunction>;

export type LinkBridge<T, U> = {
  isWebViewBridgeAvailable: boolean;
  isNativeMethodAvailable(method: keyof T): boolean;
  isNativeMethodAvailable(method: string): boolean;
  store: U;
  subscribe: (eventName: string, listener: () => void) => () => void;
  loose: {
    [K in keyof T]: (...args: any[]) => Promise<any>;
  } & {
    [key: string]: (...args: any[]) => Promise<any>;
  };
} & T;
