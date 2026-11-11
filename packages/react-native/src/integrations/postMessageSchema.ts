import type {
  PostMessageEventSchema,
  PostMessageSchemaObject,
} from "@webview-bridge/types";

import { BridgeValidationError } from "../error";

/**
 * Declare the events native sends to the Web with `postMessage`.
 * Each event takes a Standard Schema (Zod, Valibot, ArkType, ...) or an object
 * with a `validate` function.
 */
export const postMessageSchema = <T extends PostMessageSchemaObject>(
  schema: T,
) => {
  // Returning immediately to infer the correct type.
  return schema;
};

/** Validate a postMessage payload with its event schema. */
export const parsePostMessage = (
  schema: PostMessageEventSchema | undefined,
  eventName: string,
  value: unknown,
): unknown => {
  if (!schema) {
    return value;
  }
  // Standard Schema first: some libraries (e.g. Zod 4) also have an unrelated
  // `validate` method that returns a boolean.
  if ("~standard" in schema) {
    const result = schema["~standard"].validate(value);
    if (result instanceof Promise) {
      result.catch(() => {});
      throw new TypeError(
        `[WebViewBridge] The postMessage schema for '${eventName}' validates asynchronously. postMessage only supports synchronous schemas.`,
      );
    }
    if (result.issues) {
      throw new BridgeValidationError(eventName, "input", result.issues);
    }
    return result.value;
  }
  if (typeof schema.validate === "function") {
    return schema.validate(value);
  }
  return value;
};
