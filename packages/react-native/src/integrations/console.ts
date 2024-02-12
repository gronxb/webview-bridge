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
  switch (type) {
    case "log": {
      console.log("(WebView)", parsedMessage);
      break;
    }
    case "error": {
      console.error("(WebView)", parsedMessage);
      break;
    }
    case "warn": {
      console.warn("(WebView)", parsedMessage);
      break;
    }
  }
};
