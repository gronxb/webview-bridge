export const INJECT_DEBUG = `
{
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = function() {
    var message = JSON.stringify(Array.from(arguments));
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "log", body: { method: "log", args: message } }),
    );
    originalConsoleLog.apply(console, arguments);
  };

  console.error = function() {
    var message = JSON.stringify(Array.from(arguments));
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "log", body: { method: "error", args: message } }),
    );
    originalConsoleError.apply(console, arguments);
  };

  console.warn = function() {
    var message = JSON.stringify(Array.from(arguments));
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "log", body: { method: "warn", args: message } }),
    );
    originalConsoleWarn.apply(console, arguments);
  };
};
`;

export type LogType = "log" | "error" | "warn";

export const handleLog = (type: LogType, message: string) => {
  const parsedMessage = JSON.parse(message);
  const webviewMark = "(WebView) ";
  const webviewMarkedElement =
    typeof parsedMessage[0] === "string"
      ? [webviewMark + parsedMessage[0]]
      : [webviewMark, parsedMessage[0]];
  const webviewMarkedMessage = [
    ...webviewMarkedElement,
    ...parsedMessage.slice(1),
  ];
  switch (type) {
    case "log": {
      console.log(...webviewMarkedMessage);
      break;
    }
    case "error": {
      console.error(...webviewMarkedMessage);
      break;
    }
    case "warn": {
      console.warn(...webviewMarkedMessage);
      break;
    }
  }
};
