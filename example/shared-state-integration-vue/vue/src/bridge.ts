import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge-example-shared-state-integration-vue/react-native";
import { ref } from "vue";

export const isReady = ref(false);

export const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  onReady: () => {
    isReady.value = true;
    console.log("nativeMethod is ready");
  },
});

export const bridgeStore = bridge.store;
