import { ParserSchema, PostMessageSchemaObject } from "@webview-bridge/types";

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
            return value.validateSync(data, { abortEarly: true });
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
