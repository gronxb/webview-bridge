import { useEffect, useState } from "react";
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge-example-native-method/react-native/types";
import "./App.css";

const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  // InAppBrowser.open resolves only after the native browser closes.
  timeout: 0,
  onReady: () => {
    console.log("bridge is ready");
  },
  onFallback: (methodName, args) => {
    console.log("fallback", methodName, args);
  },
});

type BrowserResult = Awaited<
  ReturnType<typeof bridge.openInAppBrowser>
> & {
  requestedUrl: string;
  roundTripMs: number;
};

type RequestStatus = {
  kind: "idle" | "success" | "error";
  message: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

function App() {
  const [nativeMessage, setNativeMessage] = useState("Connecting...");
  const [externalUrl, setExternalUrl] = useState(
    "github.com/gronxb/webview-bridge",
  );
  const [browserResult, setBrowserResult] = useState<BrowserResult>();
  const [requestStatus, setRequestStatus] = useState<RequestStatus>({
    kind: "idle",
    message: "Use the form to send a real request through the middleware chain.",
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    async function loadNativeMessage() {
      try {
        setNativeMessage(await bridge.getMessage());
      } catch (error) {
        setNativeMessage(`Bridge error: ${getErrorMessage(error)}`);
      }
    }

    void loadNativeMessage();
  }, []);

  const openExternalUrl = async (requestedUrl: string) => {
    setPending(true);
    setBrowserResult(undefined);
    const startedAt = performance.now();

    try {
      const result = await bridge.openInAppBrowser(requestedUrl);
      setBrowserResult({
        ...result,
        requestedUrl,
        roundTripMs: Math.round(performance.now() - startedAt),
      });
      setRequestStatus({
        kind: "success",
        message:
          result.status === "unavailable"
            ? "InAppBrowser is unavailable on this device."
            : "InAppBrowser opened the normalized URL and returned after it closed.",
      });
    } catch (error) {
      setRequestStatus({
        kind: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setPending(false);
    }
  };

  const requestNativeError = async () => {
    setPending(true);
    setBrowserResult(undefined);
    try {
      await bridge.throwError();
      setRequestStatus({
        kind: "error",
        message: "Expected a native error, but the request resolved.",
      });
    } catch (error) {
      setRequestStatus({
        kind: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="app">
      <header>
        <p className="eyebrow">@webview-bridge middleware example</p>
        <h1>Secure external links</h1>
        <p className="lede">
          This request passes through logging, WebView-origin authorization,
          and HTTPS URL normalization before native code runs.
        </p>
      </header>

      <section className="panel connection" aria-label="Bridge connection">
        <span
          className={`dot ${bridge.isWebViewBridgeAvailable ? "online" : ""}`}
        />
        <div>
          <strong>{nativeMessage}</strong>
          <small>
            Bridge available: {String(bridge.isWebViewBridgeAvailable)}
          </small>
        </div>
      </section>

      <section className="panel">
        <h2>Open an HTTPS link</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void openExternalUrl(externalUrl);
          }}
        >
          <label htmlFor="external-url">External URL</label>
          <input
            id="external-url"
            value={externalUrl}
            onChange={(event) => setExternalUrl(event.target.value)}
            placeholder="github.com/gronxb/webview-bridge"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <p className="hint">
            The native middleware trims this value, adds https:// when needed,
            and rejects every non-HTTPS scheme.
          </p>

          <div className="actions">
            <button type="submit" disabled={pending}>
              {pending ? "Running..." : "Open with middleware"}
            </button>
            <button
              className="secondary"
              type="button"
              disabled={pending}
              onClick={() => {
                const unsafeUrl = "javascript:alert('blocked')";
                setExternalUrl(unsafeUrl);
                void openExternalUrl(unsafeUrl);
              }}
            >
              Try blocked scheme
            </button>
          </div>
        </form>
      </section>

      <section
        className={`panel status ${requestStatus.kind}`}
        aria-live="polite"
      >
        <h2>Latest bridge result</h2>
        <p>{requestStatus.message}</p>
        {browserResult && (
          <dl>
            <div>
              <dt>Requested</dt>
              <dd>{browserResult.requestedUrl}</dd>
            </div>
            <div>
              <dt>Normalized by native</dt>
              <dd>{browserResult.openedUrl}</dd>
            </div>
            <div>
              <dt>Browser result</dt>
              <dd>{browserResult.status}</dd>
            </div>
            <div>
              <dt>Native call duration (includes browser)</dt>
              <dd>{browserResult.roundTripMs}ms</dd>
            </div>
          </dl>
        )}
      </section>

      <button
        className="text-button"
        type="button"
        disabled={pending}
        onClick={() => void requestNativeError()}
      >
        Verify native error propagation
      </button>
    </main>
  );
}

export default App;
