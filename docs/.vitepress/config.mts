import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "RNBridge",
  description: "Integration Web and React Native Webview",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/getting-started" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What is RNBridge", link: "/what-is-rnbridge" },
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
            text: "Using a Web Method",
            link: "/using-a-web-method",
          },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/gronxb/rnbridge" },
    ],
  },
  base: "/rnbridge/",
});
