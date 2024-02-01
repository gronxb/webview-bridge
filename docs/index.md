---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "WebViewBridge"
  text: "Fully Type-Safe Integration for React Native WebView and Web"
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/gronxb/webview-bridge
    - theme: alt
      text: View on Example
      link: https://github.com/gronxb/webview-bridge/tree/main/example

features:
  - icon: ✅
    title: Type Safety
    details: Guarantees reliable and error-free communication, enhancing development efficiency.

  - icon: ⏳
    title: Backward Compatibility
    details: Supports seamless fallbacks, ensuring compatibility with older versions of React Native apps

  - icon: 🚀
    title: No App Review Needed
    details: Eliminates the need for app review processes due to the JavaScript-only implementation.

  - icon: 🛠️
    title: Lightweight Dependencies
    details: Operates with `react-native-webview` alone, ensuring simple and streamlined integration.
---

  <div class="demo">
      <video src="/demo.mp4" autoplay muted loop />
  </div>

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #e09fff 30%, #64daff);
  --vp-home-hero-image-filter: blur(44px);
}

.demo {
  padding: 24px;
  border-radius: 12px;
  margin-top: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;

  video {
    border-radius: 12px;
    width: 1152px;
  }
}
</style>
