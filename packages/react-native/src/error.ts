export class WebMethodError extends Error {
  constructor(methodName: string) {
    super(`An error occurred in the WebMethod.current.${methodName}`);
    this.name = "WebMethodError";
  }
}

/**
 * A value failed a `delegate()` schema: the page sent invalid input, or the
 * native implementation returned a value its output schema rejects.
 */
export class BridgeValidationError extends Error {
  constructor(
    public readonly method: string,
    public readonly kind: "input" | "output",
    public readonly issues: ReadonlyArray<{
      readonly message: string;
      readonly path?: ReadonlyArray<
        PropertyKey | { readonly key: PropertyKey }
      >;
    }>,
  ) {
    super(
      `[WebViewBridge] Invalid ${kind} for '${method}': ${issues
        .map((issue) => {
          const path = (issue.path ?? [])
            .map((segment) =>
              typeof segment === "object"
                ? String(segment.key)
                : String(segment),
            )
            .join(".");
          return path ? `${path}: ${issue.message}` : issue.message;
        })
        .join("; ")}`,
    );
    this.name = "BridgeValidationError";
  }
}

export function serializeError(error: Error) {
  return JSON.stringify(error, (_, value) => {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
        __isError: true,
      };
    }
    return value;
  });
}
