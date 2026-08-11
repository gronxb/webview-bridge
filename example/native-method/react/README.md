# Native method and middleware web app

This Vite app is the WebView UI for the paired React Native example. It sends
real bridge requests that exercise origin authorization, argument
normalization, native InAppBrowser launch, and error propagation.

See the [React Native example instructions](../react-native/README.md) for the
complete setup and manual verification flow.

From the repository root, start only the web app with:

```bash
pnpm --filter @webview-bridge-example-native-method/react dev
```
