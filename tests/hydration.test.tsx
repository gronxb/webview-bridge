/**
 * Refs #93, #102, #107: on Android the bridge methods are injected with
 * `injectedJavaScriptBeforeContentLoaded`, which react-native-webview evaluates
 * asynchronously from `onPageStarted`. When the page's `linkBridge()` runs
 * first, the web side has to be hydrated some other way, or every native
 * method call falls back ("Method not found in native").
 */
import {
  SAFE_NATIVE_EMITTER_EMIT,
  bridge,
  createWebView,
  delegate,
} from "@webview-bridge/react-native";
import { MethodNotFoundError, linkBridge } from "@webview-bridge/web";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { evaluateInPage, loadPage, native, resetEnvironment } from "./harness";

const createAppBridge = () =>
  bridge({
    count: 1,
    async getMessage() {
      return "hello from native";
    },
  });

type AppBridge = ReturnType<typeof createAppBridge>;

const mountNativeWebView = () => {
  const { WebView } = createWebView({ bridge: createAppBridge() });
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<WebView testID="default" />);
  });
  return renderer;
};

describe("late bridge hydration", () => {
  beforeEach(() => {
    resetEnvironment();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("baseline: hydrates when the methods are injected before the page script (iOS)", async () => {
    mountNativeWebView();
    loadPage({ beforeContentLoaded: "on-time" });

    const web = linkBridge<AppBridge>();

    expect(web.isWebViewBridgeAvailable).toBe(true);
    await expect(web.getMessage()).resolves.toBe("hello from native");
  });

  it("hydrates when the page script runs before the injected methods (Android)", async () => {
    // The mount-time "hydrate" injection reaches the previous document and is
    // lost, and the methods are injected after linkBridge() already ran.
    mountNativeWebView();
    const page = loadPage({ beforeContentLoaded: "late" });

    const web = linkBridge<AppBridge>();
    page.runBeforeContentLoaded();

    await vi.waitFor(() => {
      expect(web.isWebViewBridgeAvailable).toBe(true);
    });
    expect(web.isNativeMethodAvailable("getMessage")).toBe(true);
    await expect(web.getMessage()).resolves.toBe("hello from native");
  });

  it("delivers a native call made before hydration completes instead of falling back", async () => {
    mountNativeWebView();
    loadPage({ beforeContentLoaded: "late" });

    const web = linkBridge<AppBridge>();
    const result = web.getMessage();

    await expect(result).resolves.toBe("hello from native");
    expect(native.messages.map((m) => m.type)).not.toContain("fallback");
  });

  it("applies a hydrate event that was queued before linkBridge() ran", () => {
    // The page is already loading when the WebView mounts, so the mount-time
    // "hydrate" injection lands in nativeBatchedEvents of the new document.
    loadPage({ beforeContentLoaded: "late" });
    mountNativeWebView();
    expect((window as any).nativeBatchedEvents).toHaveLength(1);

    const web = linkBridge<AppBridge>();

    expect(web.isWebViewBridgeAvailable).toBe(true);
    expect(web.isNativeMethodAvailable("getMessage")).toBe(true);
    // Initial state comes with the hydrate payload, before any
    // getBridgeState round trip.
    expect(web.store.getState().count).toBe(1);
  });

  it("reports a missing native method called before hydration as MethodNotFoundError", async () => {
    mountNativeWebView();
    native.ignoredMessageTypes.add("requestHydrate");
    loadPage({ beforeContentLoaded: "late" });

    const web = linkBridge<AppBridge>({ throwOnError: true });

    await expect((web as any).notInNative()).rejects.toBeInstanceOf(
      MethodNotFoundError,
    );
  });

  describe("with initialBridge (#93)", () => {
    const initialBridge = () => ({
      getMessage: vi.fn(async () => "hello from initialBridge"),
    });

    it("uses native, not initialBridge, once hydrated late", async () => {
      mountNativeWebView();
      loadPage({ beforeContentLoaded: "late" });
      const options = { initialBridge: initialBridge() };

      const web = linkBridge<AppBridge>(options);
      // isNativeMethodAvailable() is already true for initialBridge methods.
      await vi.waitFor(() => {
        expect((web as any)._hasNativeBridgeMethods).toBe(true);
      });

      await expect(web.getMessage()).resolves.toBe("hello from native");
      await expect(web.store.getState().getMessage()).resolves.toBe(
        "hello from native",
      );
      expect(options.initialBridge.getMessage).not.toHaveBeenCalled();
    });

    it("uses native, not initialBridge, for a call made before hydration completes", async () => {
      mountNativeWebView();
      loadPage({ beforeContentLoaded: "late" });
      const options = { initialBridge: initialBridge() };

      const web = linkBridge<AppBridge>(options);

      await expect(web.getMessage()).resolves.toBe("hello from native");
      expect(options.initialBridge.getMessage).not.toHaveBeenCalled();
    });

    it("still uses initialBridge outside a React Native WebView", async () => {
      const options = { initialBridge: initialBridge() };

      const web = linkBridge<AppBridge>(options);

      await expect(web.getMessage()).resolves.toBe("hello from initialBridge");
    });
  });

  describe("with delegate() methods (#122)", () => {
    const createDelegateBridge = () =>
      bridge({
        goBack: delegate<() => Promise<string>>(),
      });
    type DelegateBridge = ReturnType<typeof createDelegateBridge>;

    it("late hydration exposes a delegate() method this WebView implements", async () => {
      const { WebView } = createWebView({ bridge: createDelegateBridge() });
      act(() => {
        create(
          <WebView
            testID="default"
            delegate={{ goBack: async () => "went back" }}
          />,
        );
      });
      loadPage({ beforeContentLoaded: "late" });

      const web = linkBridge<DelegateBridge>();

      await vi.waitFor(() => {
        expect(web.isNativeMethodAvailable("goBack")).toBe(true);
      });
      await expect(web.goBack()).resolves.toBe("went back");
    });

    it("late hydration does not expose a delegate() method this WebView lacks", async () => {
      const { WebView } = createWebView({
        bridge: bridge({
          getMessage: async () => "hello from native",
          goBack: delegate<() => Promise<string>>(),
        }),
      });
      act(() => {
        create(<WebView testID="default" {...({} as any)} />);
      });
      loadPage({ beforeContentLoaded: "late" });

      const web = linkBridge<DelegateBridge>();

      await vi.waitFor(() => {
        expect(web.isWebViewBridgeAvailable).toBe(true);
      });
      expect(web.isNativeMethodAvailable("goBack")).toBe(false);
    });
  });

  describe("compatibility", () => {
    it("new web + native without requestHydrate support: calls still reach native", async () => {
      mountNativeWebView();
      native.ignoredMessageTypes.add("requestHydrate");
      loadPage({ beforeContentLoaded: "late" });

      const web = linkBridge<AppBridge>();

      await expect(web.getMessage()).resolves.toBe("hello from native");
      expect(web.isWebViewBridgeAvailable).toBe(false);
    });

    it("new web accepts the hydrate payload of older native (initialState key)", () => {
      loadPage({ beforeContentLoaded: "late" });
      const web = linkBridge<AppBridge>();

      evaluateInPage(
        SAFE_NATIVE_EMITTER_EMIT("hydrate", {
          bridgeMethods: ["getMessage"],
          initialState: { count: 1 },
        }),
      );

      expect(web.isNativeMethodAvailable("getMessage")).toBe(true);
      expect(web.store.getState().count).toBe(1);
    });

    it("older web reads the hydrate payload key native now sends", () => {
      mountNativeWebView();
      // @webview-bridge/web <= 1.8.0 destructures `nativeInitialState`.
      const hydrate = native.injections.find((i) =>
        i.script.includes("'hydrate'"),
      );
      expect(hydrate?.script).toContain('"nativeInitialState":{"count":1}');
    });
  });

  it("can be awaited (the bridge is not a thenable)", async () => {
    mountNativeWebView();
    loadPage({ beforeContentLoaded: "on-time" });

    const pending = Symbol("pending");
    const awaited = await Promise.race([
      Promise.resolve(linkBridge<AppBridge>()),
      new Promise((resolve) => setTimeout(() => resolve(pending), 50)),
    ]);

    expect(awaited).not.toBe(pending);
    expect(native.messages.map((m) => m.type)).not.toContain("fallback");
  });
});
