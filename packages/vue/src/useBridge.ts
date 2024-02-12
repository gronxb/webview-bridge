import type { Bridge, BridgeStore } from "@webview-bridge/web";
import { getCurrentInstance, onScopeDispose, Ref, ref } from "vue";

export function useBridge<T extends Bridge>(
  store: Omit<BridgeStore<T>, "setState">,
) {
  const state = ref(store.getState()) as Ref<T>;

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
