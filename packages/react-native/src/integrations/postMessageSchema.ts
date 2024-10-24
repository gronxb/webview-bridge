import type { PostMessageSchemaObject } from "@webview-bridge/types";

export const postMessageSchema = <T extends PostMessageSchemaObject>(
  schema: T,
) => {
  // Returning immediately to infer the correct type.
  return schema;
};
