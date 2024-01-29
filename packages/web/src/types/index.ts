import { AsyncFunction } from "@webview-bridge/types";

export type WebBridge = Record<string, AsyncFunction>;

export type NativeMethod<T> = {
  isWebViewBridgeAvailable: boolean;
  isNativeMethodAvailable(method: keyof T): boolean;
  isNativeMethodAvailable(method: string): boolean;
  loose: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in keyof T]: (...args: any[]) => Promise<any>;
  } & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: (...args: any[]) => Promise<any>;
  };
} & T;
