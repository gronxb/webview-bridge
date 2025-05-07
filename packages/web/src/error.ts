export class MethodNotFoundError extends Error {
  constructor(methodName: string) {
    super(`Method ${methodName} is not defined`);
    this.name = "MethodNotFoundError";
  }
}
