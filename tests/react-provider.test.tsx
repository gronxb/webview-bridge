/**
 * Refs #93: after a late hydration, `useBridgeStore` kept reading the store
 * that was created before the native methods were known, so selected native
 * methods stayed `undefined` (only `useBridgeLoose` worked).
 */
import { createLinkBridgeProvider } from "@webview-bridge/react";
import { bridge, createWebView } from "@webview-bridge/react-native";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadPage, resetEnvironment } from "./harness";

const createAppBridge = () =>
  // Methods only (the shape in #102 and #107): the getBridgeState reply
  // carries no primitive state, so nothing else triggers a re-render.
  bridge({
    async goBack() {
      return "went back";
    },
  });

type AppBridge = ReturnType<typeof createAppBridge>;

describe("createLinkBridgeProvider", () => {
  beforeEach(() => {
    resetEnvironment();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("useBridgeStore exposes native methods that arrive after the first render", async () => {
    loadPage({ beforeContentLoaded: "late" });
    const { BridgeProvider, useBridgeStore } =
      createLinkBridgeProvider<AppBridge>();

    const seen: unknown[] = [];
    const Probe = () => {
      const goBack = useBridgeStore((state) => state.goBack);
      seen.push(goBack);
      return null;
    };

    act(() => {
      create(
        <BridgeProvider>
          <Probe />
        </BridgeProvider>,
      );
    });
    expect(seen.at(-1)).toBeUndefined();

    // The native WebView mounts after the page script ran; its mount-time
    // "hydrate" injection reaches the page.
    const { WebView } = createWebView({ bridge: createAppBridge() });
    await act(async () => {
      create(<WebView testID="default" />);
    });

    await vi.waitFor(() => {
      expect(typeof seen.at(-1)).toBe("function");
    });
    await expect((seen.at(-1) as () => Promise<string>)()).resolves.toBe(
      "went back",
    );
  });

  it("useBridgeStatus re-renders when the bridge becomes available", async () => {
    loadPage({ beforeContentLoaded: "late" });
    const { BridgeProvider, useBridgeStatus } =
      createLinkBridgeProvider<AppBridge>();

    const seen: boolean[] = [];
    const Probe = () => {
      seen.push(useBridgeStatus().isWebViewBridgeAvailable);
      return null;
    };

    act(() => {
      create(
        <BridgeProvider>
          <Probe />
        </BridgeProvider>,
      );
    });
    expect(seen.at(-1)).toBe(false);

    const { WebView } = createWebView({ bridge: createAppBridge() });
    await act(async () => {
      create(<WebView testID="default" />);
    });

    await vi.waitFor(() => {
      expect(seen.at(-1)).toBe(true);
    });
  });
});
