# Setup with Remix
This guide provides instructions on how to use `webview-bridge` in Remix applications.

# What does it solve?
By design, `webview-bridge` relies on client-side rendering, which can lead to hydration mismatches due to fetching data from the connected app. Resolving hydration mismatches is challenging in such scenarios. This guide helps to use Providers client-side in an SSR environment, avoiding execution on the server, and enables the use of default hooks seamlessly.

## Installation

::: code-group

```sh [npm]
$ npm add @webview-bridge/react @webview-bridge/web
```

```sh [pnpm]
$ pnpm add @webview-bridge/react @webview-bridge/web
```

```sh [yarn]
$ yarn add @webview-bridge/react @webview-bridge/web
```

:::

### `createLinkBridgeProvider`

```tsx
// This file is providers/BridgeProvider.ts
import { createLinkBridgeProvider } from "@webview-bridge/react";
import type { AppBridge } from ""; // Import the type 'appBridge' declared in native

export const { BridgeProvider, useBridgeStore, useBridgeStatus, useBridgeLoose } =
  createLinkBridgeProvider<AppBridge>({
    throwOnError: true,
    onReady: () => {
      console.log("bridge is ready");
    },
  });
```

Create a `BridgeProvider` and related hooks by utilizing options similar to `linkBridge` as shown in the code above.

## Root Side
### app/root.tsx

```tsx
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { BridgeProvider } from "./providers/BridgeProvider";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {/** Here Provider */}
        <BridgeProvider>{children}</BridgeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
```

Wrap the `BridgeProvider` around the children in the base code.


## Client Component
### app/components/home.tsx
```tsx
export default function Home() {
  const { increase, openInAppBrowser } = useBridgeStore((state) => ({
    increase: state.increase,
    openInAppBrowser: state.openInAppBrowser,
  }));
  const { isNativeMethodAvailable, isWebViewBridgeAvailable } =
    useBridgeStatus();

  return (
    <div>
      <div>
        {`isWebViewBridgeAvailable: ${String(isWebViewBridgeAvailable)}`}
      </div>
      <h2>This is WebView</h2>

      <button
        onClick={() => {
          if (isNativeMethodAvailable("openInAppBrowser")) {
            openInAppBrowser("https://github.com/gronxb/webview-bridge");
          }
        }}
      >
        open InAppBrowser
      </button>

      <Count />
      <button onClick={() => increase()}>Increase from web</button>

      <DataText />
    </div>
  );
}

```

Utilize hooks from `createLinkBridgeProvider` for client-side functionality as shown above.

## Routes Side
### app/routes/_index.tsx

```tsx
import type { MetaFunction } from "@remix-run/node";
import Home from "~/components/home";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function clientLoader() {
  return null;
}

export default function Index() {
  return <Home />;
}

```

Use `clientLoader` to load components using the bridge on the client side, with the primary goal of avoiding the hydration process.