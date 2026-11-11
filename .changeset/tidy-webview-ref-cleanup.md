---
"@webview-bridge/react-native": patch
---

Remove the unmounting WebView's own ref from the internal ref list instead of popping the last one, so `postMessage` keeps reaching WebViews that are still mounted when WebViews unmount out of mount order.
