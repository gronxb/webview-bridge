export class NativeMethodError extends Error {
  constructor(methodName: string) {
    super(`An error occurred in the native bridge: ${methodName}`);
    this.name = "NativeMethodError";
  }
}

export const deserializeError = (
  value: any,
  ErrorConstructor: ErrorConstructor = Error,
) => {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;

  if (parsed?.__isError) {
    const err = new ErrorConstructor(parsed.message);
    err.name = parsed.name;
    err.stack = parsed.stack;
    return err;
  }
  return value;
};
