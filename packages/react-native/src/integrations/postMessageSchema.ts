import { ParserSchema, PostMessageSchemaObject } from "@webview-bridge/types";

export const postMessageSchema = <T extends PostMessageSchemaObject>(
  schema: T,
): ParserSchema<T> => {
  const parserSchema = Object.entries(schema).map(
    ([eventName, eventSchema]) => {
      // zod
      if ("parse" in eventSchema && typeof eventSchema.parse === "function") {
        return [
          eventName,
          {
            parse: eventSchema.parse,
            schema: eventSchema,
          },
        ];
      }

      // yup
      else if (
        "validateSync" in eventSchema &&
        typeof eventSchema.validateSync === "function"
      ) {
        return [
          eventName,
          {
            parse: (data: any) => {
              return eventSchema.validateSync(data, { abortEarly: true });
            },
            schema: eventSchema,
          },
        ];
      }

      // superstruct
      else if (
        "assert" in eventSchema &&
        typeof eventSchema.assert === "function" &&
        "validate" in eventSchema &&
        typeof eventSchema.validate === "function"
      ) {
        return [
          eventName,
          {
            parse: (data: any) => {
              void eventSchema.assert(data);
              const [_, result] = eventSchema.validate(data);
              return result;
            },
            schema: eventSchema,
          },
        ];
      }
      return [
        eventName,
        {
          parse: (data: any) => data,
          schema: void 0,
        },
      ];
    },
  );

  return Object.fromEntries(parserSchema);
};
