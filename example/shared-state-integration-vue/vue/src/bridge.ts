import type { Bridge, BridgeStore } from "@webview-bridge/web";
import { getCurrentInstance, onScopeDispose, ref } from "vue";

import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge-example-shared-state-integration-vue/react-native/types";

export const isReady = ref(false);

export const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  onReady: () => {
    isReady.value = true;
    console.log("bridge is ready");
  },
});

export const bridgeStore = bridge.store;

export function useBridge<T extends Bridge>(
  store: Omit<BridgeStore<T>, "setState">,
) {
  const state = ref(store.getState());

  const unsubscribe = store.subscribe((newState) => {
    state.value = newState;
  });

  if (getCurrentInstance()) {
    onScopeDispose(() => {
      unsubscribe?.();
    });
  }

  return state;
}
