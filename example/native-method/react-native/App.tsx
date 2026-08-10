import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import {
  createWebView,
  type BridgeMiddleware,
  type BridgeStore,
  type BridgeWebView,
  bridge,
} from '@webview-bridge/react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import 'react-native-url-polyfill/auto';

const WEB_APP_URL = new URL('http://localhost:5173');

const getUrlOrigin = (url: string) => new URL(url).origin;

const observeBridgeRequests = (): BridgeMiddleware =>
  async ({ method, url }, next) => {
    const startedAt = Date.now();
    let origin = 'unknown';
    try {
      if (url) {
        origin = getUrlOrigin(url);
      }
    } catch {
      origin = 'invalid URL';
    }

    console.log(`[bridge] -> ${method} (${origin})`);
    try {
      const result = await next();
      console.log(`[bridge] <- ${method} (${Date.now() - startedAt}ms)`);
      return result;
    } catch (error) {
      console.error(
        `[bridge] !! ${method} (${Date.now() - startedAt}ms)`,
        error,
      );
      throw error;
    }
  };

const allowWebAppOrigin = (webAppUrl: URL): BridgeMiddleware => {
  const allowedOrigin = webAppUrl.origin;

  return async ({ url }, next) => {
    let requestOrigin: string;
    try {
      if (!url) {
        throw new Error('Missing WebView URL');
      }
      requestOrigin = getUrlOrigin(url);
    } catch {
      throw new Error('Bridge request has an invalid WebView URL');
    }

    if (requestOrigin !== allowedOrigin) {
      throw new Error(`Bridge request denied for origin: ${requestOrigin}`);
    }
    return next();
  };
};

const normalizeExternalUrl = (): BridgeMiddleware =>
  async (request, next) => {
    if (request.method !== 'openInAppBrowser') {
      return next();
    }

    const [input] = request.args;
    if (typeof input !== 'string' || input.trim().length === 0) {
      throw new TypeError('A non-empty URL is required');
    }

    const trimmedUrl = input.trim();
    let externalUrl: URL;
    try {
      externalUrl = new URL(trimmedUrl);
    } catch {
      externalUrl = new URL(`https://${trimmedUrl}`);
    }

    if (externalUrl.protocol !== 'https:') {
      throw new Error('Only HTTPS links can be opened');
    }

    request.args = [externalUrl.toString()];
    return next();
  };

const configuredAppBridge = bridge({
  async getMessage() {
    return "I'm from native" as const;
  },
  async openInAppBrowser(url: string) {
    if (!(await InAppBrowser.isAvailable())) {
      return {
        openedUrl: url,
        status: 'unavailable' as const,
      };
    }

    const result = await InAppBrowser.open(url);
    return {
      openedUrl: url,
      status: result.type,
    };
  },
  async throwError() {
    throw new Error('🚧 This error is from native side!!');
  },
})
  .use(observeBridgeRequests())
  .use(allowWebAppOrigin(WEB_APP_URL))
  .use(normalizeExternalUrl());

export const appBridge: BridgeStore<
  ReturnType<typeof configuredAppBridge.getState>
> = configuredAppBridge;

export const { WebView } = createWebView({
  bridge: appBridge,
  debug: true,
  fallback: (method) => {
    console.warn(`Method '${method}' not found in native`);
  },
});

function App(): JSX.Element {
  const webviewRef = React.useRef<BridgeWebView>(null);

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{
          uri: WEB_APP_URL.href,
        }}
        style={styles.webView}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default App;
