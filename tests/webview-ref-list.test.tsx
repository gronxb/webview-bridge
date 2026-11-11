/**
 * Regression test for #119: when a WebView that is not the last-mounted one
 * unmounts, the remaining WebViews must keep receiving postMessage and bridge
 * state updates.
 */
import { bridge, createWebView } from "@webview-bridge/react-native";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it } from "vitest";

import { injectionsFor, native, resetEnvironment } from "./harness";

describe("webview ref list", () => {
  beforeEach(() => {
    resetEnvironment();
  });

  it("keeps reaching the mounted WebView after an earlier one unmounts", () => {
    const appBridge = bridge<{ count: number; increase(): Promise<void> }>(
      ({ set }) => ({
        count: 0,
        async increase() {
          set({ count: 1 });
        },
      }),
    );
    const { WebView, postMessage } = createWebView({ bridge: appBridge });
    const ui = (showA: boolean) => (
      <>
        {showA && <WebView testID="A" />}
        <WebView testID="B" />
      </>
    );

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(ui(true));
    });
    act(() => {
      renderer.update(ui(false));
    });
    native.injections.length = 0;

    postMessage("single", "1");
    postMessage("broadcast", "2", { broadcast: true });
    appBridge.getState().increase();

    const toB = injectionsFor("B");
    expect(toB.some((s) => s.includes("postMessage/single"))).toBe(true);
    expect(toB.some((s) => s.includes("postMessage/broadcast"))).toBe(true);
    expect(toB.some((s) => s.includes("bridgeStateChange"))).toBe(true);
  });
});
