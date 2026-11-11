/**
 * Test harness that wires the real React Native side (`createWebView`) to the
 * real web side (`linkBridge`) inside a single jsdom window.
 *
 * `react-native-webview` is replaced by `FakeWebView` (see `vi.mock` in each
 * test). Scripts the native side injects are evaluated in the jsdom window
 * (the "page") once the page is loaded, and `window.ReactNativeWebView`
 * messages are delivered asynchronously to the native `onMessage` prop.
 */
import { forwardRef, useImperativeHandle } from "react";

type FakeProps = {
  testID?: string;
  onMessage?: (event: {
    nativeEvent: { data: string; url: string };
  }) => void;
  injectedJavaScriptBeforeContentLoaded?: string;
};

export const native = {
  props: new Map<string, FakeProps>(),
  /** Every script injected through `injectJavaScript`, per WebView. */
  injections: [] as { id: string; script: string }[],
  /** The WebView whose document is the jsdom window, if the page is loaded. */
  loadedPageId: null as string | null,
  /** Every message the page posted to native. */
  messages: [] as { type: string; [key: string]: unknown }[],
  /** Message types native drops, to model older native versions. */
  ignoredMessageTypes: new Set<string>(),
  /** Bumped per test so messages still in flight from a previous test drop. */
  generation: 0,
};

/** Run a script in the page, the way a WebView injection does. */
export const evaluateInPage = (script: string) => {
  // Indirect eval runs in the global (page) scope, like a WebView injection.
  // biome-ignore lint/security/noGlobalEval: this models injectJavaScript.
  globalThis.eval(script);
};

const FakeWebView = forwardRef<unknown, FakeProps>((props, ref) => {
  const id = props.testID ?? "default";
  native.props.set(id, props);

  useImperativeHandle(
    ref,
    () => ({
      injectJavaScript: (script: string) => {
        native.injections.push({ id, script });
        // Before the page has loaded, injections hit the previous document
        // (e.g. about:blank) and are lost.
        if (native.loadedPageId === id) {
          evaluateInPage(script);
        }
      },
    }),
    [id],
  );

  return null;
});

export default FakeWebView;

export const resetEnvironment = () => {
  native.props.clear();
  native.injections.length = 0;
  native.messages.length = 0;
  native.loadedPageId = null;
  native.ignoredMessageTypes.clear();
  native.generation++;

  const w = window as any;
  for (const key of [
    "__bridgeMethods__",
    "__bridgeInitialState__",
    "nativeEmitter",
    "nativeEmitterMap",
    "nativeBatchedEvents",
    "webEmitter",
    "ReactNativeWebView",
  ]) {
    delete w[key];
  }
};

/**
 * Start loading the page in the WebView `id` (default: "default").
 *
 * `beforeContentLoaded: "on-time"` runs `injectedJavaScriptBeforeContentLoaded`
 * before the page's own scripts, as on iOS. `"late"` models Android, where
 * react-native-webview evaluates it asynchronously from `onPageStarted`, so the
 * app script (`linkBridge`) can run first.
 */
export const loadPage = ({
  id = "default",
  beforeContentLoaded,
}: {
  id?: string;
  beforeContentLoaded: "on-time" | "late";
}) => {
  native.loadedPageId = id;
  const generation = native.generation;
  (window as any).ReactNativeWebView = {
    postMessage: (data: string) => {
      const message = JSON.parse(data);
      native.messages.push(message);
      if (native.ignoredMessageTypes.has(message.type)) {
        return;
      }
      setTimeout(() => {
        if (generation !== native.generation) {
          return;
        }
        native.props.get(id)?.onMessage?.({
          nativeEvent: { data, url: "https://example.com" },
        });
      }, 0);
    },
  };

  const runBeforeContentLoaded = () => {
    const script = native.props.get(id)?.injectedJavaScriptBeforeContentLoaded;
    if (script) {
      evaluateInPage(script);
    }
  };

  if (beforeContentLoaded === "on-time") {
    runBeforeContentLoaded();
  }
  return { runBeforeContentLoaded };
};

export const injectionsFor = (id: string) =>
  native.injections.filter((i) => i.id === id).map((i) => i.script);
