import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncFunction = (...args: any[]) => Promise<any>;

export type InferMethodBridge<T> = {
  [K in keyof T]: T[K] extends AsyncFunction ? T[K] : never;
};

export type InferEventBridge<T> = {
  [K in keyof T]: T[K] extends z.AnyZodObject ? T[K] : never;
};

export type MethodBridge<T = Record<string, AsyncFunction>> =
  InferMethodBridge<T> & {
    __signature: "methodBridge";
  };

export type EventBridge<T = Record<string, z.AnyZodObject>> =
  InferEventBridge<T> & {
    __signature: "eventBridge";
  };

export type BridgeSignature = "methodBridge" | "eventBridge";
