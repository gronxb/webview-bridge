export class MethodNotFoundError extends Error {
  constructor(methodName: string) {
    super(`Method ${methodName} is not defined`);
    this.name = "MethodNotFoundError";
  }
}

export class NativeBridgeError extends Error {
  constructor(methodName: string) {
    super(`An error occurred in the native bridge: ${methodName}`);
    this.name = "NativeBridgeError";
  }
}
