// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncFunction = (...args: any[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NotAsyncFunction = (...args: any[]) => any;

export type AsyncObject = Record<string, AsyncFunction>;

export type MethodBridge<T extends object> = {
  [key in keyof T]: key extends "__signature" ? "methodBridge" : AsyncFunction;
};

export type EventBridge<T extends object> = {
  [key in keyof T]: key extends "__signature"
    ? "eventBridge"
    : Zod.AnyZodObject;
};

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
