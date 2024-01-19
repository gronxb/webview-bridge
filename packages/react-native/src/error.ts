export class WebMethodError extends Error {
  constructor(methodName: string) {
    super(`An error occurred in the WebMethod.current.${methodName}`);
    this.name = "WebMethodError";
  }
}
