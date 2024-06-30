import type { Infer as SupertructInfer, Struct } from "superstruct";
import type { AnySchema as YupTypeAny, InferType as yupInfer } from "yup";
import type { infer as zodInfer, ZodTypeAny } from "zod";

export type AsyncFunction = (...args: any[]) => Promise<any>;

export type Primitive = string | number | boolean | null | undefined;
export type PrimitiveObject = Record<string, Primitive>;

export type RawJSON = Primitive | { [key: string]: RawJSON } | RawJSONArray;

interface RawJSONArray extends Array<RawJSON> {}

export type Bridge = Record<string, AsyncFunction | RawJSON>;

export type BridgeStore<T extends Bridge> = {
  getState: () => T;
  setState: (newState: Partial<OnlyJSON<T>>) => void;
  subscribe: (listener: (newState: T, prevState: T) => void) => () => void;
};

export type ExtractStore<S> = S extends { getState: () => infer T } ? T : never;

export type OnlyJSON<T> = {
  [P in keyof T as T[P] extends RawJSON ? P : never]: T[P];
};

export type ExcludePrimitive<T> = {
  [P in keyof T as T[P] extends RawJSON ? never : P]: T[P];
};

export type KeyOfOrString<T> = T extends undefined ? string : keyof T;

export type PostMessageSchemaObject = Record<
  string,
  ZodTypeAny | YupTypeAny | Struct<any>
>;

export type ParserSchema<T = object> = {
  [P in keyof T]: {
    parse: (data: any) => any;
    schema: T[P];
  };
};

export type Parser<
  Input extends ParserSchema<any>,
  EventName,
> = Input extends undefined
  ? Record<string, Primitive> | Primitive
  : EventName extends keyof Input
  ? Input[EventName]["schema"] extends ZodTypeAny
    ? zodInfer<Input[EventName]["schema"]>
    : Input[EventName]["schema"] extends YupTypeAny
    ? yupInfer<Input[EventName]["schema"]>
    : Input[EventName]["schema"] extends Struct<any>
    ? SupertructInfer<Input[EventName]["schema"]>
    : Record<string, Primitive> | Primitive
  : never;
