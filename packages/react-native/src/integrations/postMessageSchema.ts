import { Primitive } from "@webview-bridge/types";
import type { Infer as SupertructInfer, Struct } from "superstruct";
import type { AnySchema as YupTypeAny, InferType as yupInfer } from "yup";
import type { infer as zodInfer, ZodTypeAny } from "zod";

export type PostMessageSchemaObject = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ZodTypeAny | YupTypeAny | Struct<any>
>;
export type Parser<Input, EventName> = Input extends undefined
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, Primitive> | Primitive
  : EventName extends keyof Input
  ? Input[EventName] extends ZodTypeAny
    ? zodInfer<Input[EventName]>
    : Input[EventName] extends YupTypeAny
    ? yupInfer<Input[EventName]>
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Input[EventName] extends Struct<any>
    ? SupertructInfer<Input[EventName]> // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : Record<string, Primitive> | Primitive
  : never;

export const postMessageSchema = <T extends PostMessageSchemaObject>(
  schema: T,
) => {
  const parserSchema = Object.entries(schema).map(([key, value]) => {
    // zod
    if ("parse" in value && typeof value.parse === "function") {
      return [
        key,
        {
          parse: value.parse,
        },
      ];
    }

    // yup & superstruct
    else if ("validate" in value && typeof value.validate === "function") {
      return [
        key,
        {
          parse: value.validate,
        },
      ];
    }
    return [
      key,
      {
        parse: () => {},
      },
    ];
  });

  return Object.fromEntries(parserSchema);
};
