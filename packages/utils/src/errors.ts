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
  if (value?.__isError) {
    const err = new ErrorConstructor(value.message);
    err.name = value.name;
    err.stack = value.stack;
    return err;
  }
  return value;
};
