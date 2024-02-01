import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge-example-shared-state-integration-vue/react-native";
import { ref } from "vue";

export const bridge = linkBridge<AppBridge>({
  throwOnError: true,
  onReady: () => {
    console.log("nativeMethod is ready");
  },
});

export const isWebViewBridgeAvailable = ref(bridge.isWebViewBridgeAvailable);

export const bridgeStore = bridge.store;
