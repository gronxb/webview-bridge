import { Primitive } from "@webview-bridge/types";
import type { Infer as SupertructInfer, Struct } from "superstruct";
import type { AnySchema as YupTypeAny, InferType as yupInfer } from "yup";
import type { infer as zodInfer, ZodTypeAny } from "zod";

export type PostMessageSchemaObject = Record<
  string,
  ZodTypeAny | YupTypeAny | Struct<any>
>;

export type ParserSchema<T> = {
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

export const postMessageSchema = <T extends PostMessageSchemaObject>(
  schema: T,
): ParserSchema<T> => {
  const parserSchema = Object.entries(schema).map(([key, value]) => {
    // zod
    if ("parse" in value && typeof value.parse === "function") {
      return [
        key,
        {
          parse: value.parse,
          schema: value,
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
          schema: value,
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
          schema: value,
        },
      ];
    }
    return [
      key,
      {
        parse: (data: any) => data,
        schema: void 0,
      },
    ];
  });

  return Object.fromEntries(parserSchema);
};
