import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "WebViewBridge",
  description: "Integration Web and React Native WebView",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/getting-started" },
    ],
    search: {
      provider: "local",
    },
    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What is WebViewBridge", link: "/what-is-webview-bridge" },
          { text: "Getting Started", link: "/getting-started" },
        ],
      },
      {
        text: "Guide",
        items: [
          {
            text: "Using a Native Method",
            link: "/using-a-native-method",
          },
          {
            text: "Using a Loose Native Method",
            link: "/using-a-loose-native-method",
          },
          {
            text: "Using a Web Method",
            link: "/using-a-web-method",
          },
          {
            text: "Backward Compatibility",
            base: "/backward-compatibility",
            items: [
              {
                text: "New Method",
                link: "/new-method",
              },
              {
                text: "Deprecated Method",
                link: "/deprecated-method",
              },
            ],
          },
        ],
      },
      {
        text: "Exporting Type Declarations",
        base: "/exporting-type-declarations",
        items: [
          {
            text: "Monorepo",
            link: "/monorepo",
          },
          {
            text: "Custom Declaration File",
            link: "/custom-declaration-file",
          },
        ],
      },
      {
        text: "API Reference",
        items: [
          {
            text: "React Native",
            base: "/reference/react-native",
            items: [{ text: "createWebView", link: "/create-webview" }],
          },
          {
            text: "Web",
            base: "/reference/web",
            items: [
              { text: "linkBridge", link: "/link-bridge" },
              { text: "registerWebMethod", link: "/register-web-method" },
            ],
          },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/gronxb/webview-bridge" },
    ],
  },
  base: "/webview-bridge/",
});
