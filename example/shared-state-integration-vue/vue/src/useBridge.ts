import type { Bridge, BridgeStore } from "@webview-bridge/web";
import { Ref, getCurrentInstance, onScopeDispose, ref } from "vue";

export function useBridge<T extends Bridge>(
  store: Omit<BridgeStore<T>, "setState">,
) {
  const state = ref(store.getState()) as Ref<T>;

  let unsubscribe: (() => void) | undefined;

  unsubscribe = store.subscribe((newState) => {
    state.value = newState;
  });

  if (getCurrentInstance()) {
    onScopeDispose(() => {
      console.log("unsubscribe");
      unsubscribe?.();
    });
  }

  return state;
}
