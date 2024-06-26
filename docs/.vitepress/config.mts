import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "WebViewBridge",
  description: "Integration Web and React Native WebView",
  head: [
    [
      "meta",
      {
        property: "og:url",
        content: "https://gronxb.github.io/webview-bridge",
      },
    ],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "WebViewBridge" }],
    [
      "meta",
      {
        property: "og:description",
        content: "Integration Web and React Native WebView",
      },
    ],
    [
      "meta",
      {
        property: "og:image",
        content: "https://gronxb.github.io/webview-bridge/content.png",
      },
    ],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", { property: "twitter:domain", content: "gronxb.github.io" }],
    [
      "meta",
      {
        property: "twitter:url",
        content: "https://gronxb.github.io/webview-bridge",
      },
    ],
    ["meta", { name: "twitter:title", content: "WebViewBridge" }],
    [
      "meta",
      {
        name: "twitter:description",
        content: "Integration Web and React Native WebView",
      },
    ],
    [
      "meta",
      {
        name: "twitter:image",
        content: "https://gronxb.github.io/webview-bridge/content.png",
      },
    ],
    ["link", { rel: "icon", href: "/favicon.ico" }],
  ],
  themeConfig: {
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
            text: "Shared State",
            items: [
              {
                text: "React Native",
                link: "/shared-state/react-native",
              },
              {
                text: "Vanilla (WebView only)",
                link: "/shared-state/vanilla",
              },
              {
                text: "React (WebView only)",
                link: "/shared-state/react",
              },
              {
                text: "Vue (WebView only)",
                link: "/shared-state/vue",
              },
            ],
          },
          {
            text: "Using a Loose Native Method",
            link: "/using-a-loose-native-method",
          },
          {
            text: "Using a PostMessage",
            link: "/using-a-post-message",
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
          {
            text: "SSR",
            base: "/ssr",
            items: [
              {
                text: "Next.js (App Router)",
                link: "/next-js-app-router",
              },
              {
                text: "Remix",
                link: "/remix",
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
          {
            text: "Generate Declaration File",
            link: "/generate-declaration-file",
          },
        ],
      },
      {
        text: "Example Guide",
        base: "/example",
        items: [
          {
            text: "React Navigation",
            link: "/react-navigation",
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
