export const INTEGRATIONS_SCRIPTS_CONSOLE = `
{
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = function() {
    var message = Array.from(arguments).join(' ');
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', method: 'log',args: message }));
    originalConsoleLog.apply(console, arguments);
  };

  console.error = function() {
    var message = Array.from(arguments).join(' ');
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', method: 'error', args: message }));
    originalConsoleError.apply(console, arguments);
  };

  console.warn = function() {
    var message = Array.from(arguments).join(' ');
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', method: 'warn', args: message }));
    originalConsoleWarn.apply(console, arguments);
  };
};
`;

export const handleLog = (
  logType: "log" | "error" | "warn",
  message?: unknown,
) => {
  switch (logType) {
    case "log": {
      console.log("(WebView)", message);
      break;
    }
    case "error": {
      console.error("(WebView)", message);
      break;
    }
    case "warn": {
      console.warn("(WebView)", message);
      break;
    }
  }
};
