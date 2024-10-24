import type { PostMessageSchemaObject } from "@webview-bridge/types";

export const postMessageSchema = <T extends PostMessageSchemaObject>(
  schema: T,
) => {
  return schema;
};
