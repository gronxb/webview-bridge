export class WebMethodError extends Error {
  constructor(methodName: string) {
    super(`An error occurred in the WebMethod.current.${methodName}`);
    this.name = "WebMethodError";
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
