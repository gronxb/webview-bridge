import type {
  AsyncFunction,
  KeyOfOrString,
  Parser,
  ParserSchema,
} from "@webview-bridge/types";

export type WebBridge = Record<string, AsyncFunction>;

export type LinkBridge<T, U, V extends ParserSchema<any>> = {
  isWebViewBridgeAvailable: boolean;
  isNativeMethodAvailable(method: keyof T): boolean;
  isNativeMethodAvailable(method: string): boolean;
  store: U;
  addEventListener<EventName extends KeyOfOrString<V>>(
    eventName: EventName,
    listener: (args: Parser<V, EventName>) => void,
  ): () => void;
  loose: {
    [K in keyof T]: (...args: any[]) => Promise<any>;
  } & {
    [key: string]: (...args: any[]) => Promise<any>;
  };
} & T;
