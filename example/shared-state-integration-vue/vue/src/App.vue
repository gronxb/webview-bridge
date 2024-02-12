<script setup lang="ts">
import { bridge, isReady } from "./bridge";
import { useBridge } from "@webview-bridge/vue";

const handleOpenInAppBrowser = () => {
  if (bridge.isNativeMethodAvailable("openInAppBrowser") === true) {
    bridge.openInAppBrowser("https://github.com/gronxb/webview-bridge");
  }
};

const bridgeStore = useBridge(bridge.store);
</script>

<template>
  <div v-if="isReady">
    <div>isReady {{ isReady }}</div>
    <h2>This is WebView</h2>

    <button @click="handleOpenInAppBrowser()">open InAppBrowser</button>

    <p>Native Count: {{ bridgeStore.count }}</p>

    <button @click="bridgeStore.increase()">Increase from web</button>

    <div>
      <p>Native Data Text: {{ bridgeStore.data.text }}</p>
      <input
        type="text"
        :value="bridgeStore.data.text"
        @input="
          (e) => bridgeStore.setDataText((e.target as HTMLInputElement).value)
        "
      />
    </div>
  </div>
</template>
