import { Primitive } from "@webview-bridge/types";
import type { Infer as SupertructInfer, Struct } from "superstruct";
import type { AnySchema as YupTypeAny, InferType as yupInfer } from "yup";
import type { infer as zodInfer, ZodTypeAny } from "zod";

export type PostMessageSchemaObject = Record<
  string,
  ZodTypeAny | YupTypeAny | Struct<any>
>;
export type Parser<Input, EventName> = Input extends undefined
  ? Record<string, Primitive> | Primitive
  : EventName extends keyof Input
  ? Input[EventName] extends ZodTypeAny
    ? zodInfer<Input[EventName]>
    : Input[EventName] extends YupTypeAny
    ? yupInfer<Input[EventName]>
    : Input[EventName] extends Struct<any>
    ? SupertructInfer<Input[EventName]>
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

    // yup
    else if (
      "validateSync" in value &&
      typeof value.validateSync === "function"
    ) {
      return [
        key,
        {
          parse: (data: any) => {
            value.validateSync(data, { abortEarly: true });
          },
        },
      ];
    }

    // superstruct
    else if (
      "assert" in value &&
      typeof value.assert === "function" &&
      "validate" in value &&
      typeof value.validate === "function"
    ) {
      return [
        key,
        {
          parse: (data: any) => {
            void value.assert(data);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [_, result] = value.validate(data);
            return result;
          },
        },
      ];
    }
    return [
      key,
      {
        parse: (data: any) => data,
      },
    ];
  });

  return Object.fromEntries(parserSchema);
};
