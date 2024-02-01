# Backward Compatibility for Deprecated Method

Since a WebView is web-based, it can always be updated to the latest version upon deployment. In contrast, rolling out updates for a React Native app can take time.

You can't always keep `bridge` up-to-date on the web, as the app gets updated and deprecated methods may still exist.

For example, there might be methods that have been deleted or methods whose arguments have changed.

As a result, even if your web is up to date, you should be able to handle older versions of your native app.

## React Native Part

### Bridge Versioning
When declaring methods in the bridge, it's helpful to create a method that includes versioning. Whenever there are changes in methods, increasing the version number makes it easier to handle from the web side.

```ts
export const appBridge = bridge({
  // A bridge scenario that existed in the past. Assume this method existed in a previous version.
  // async getBridgeVersion() {
  //   return 1;
  // },
  // async getOldVersionMessage() {
  //   return "I'm from native old version" as const;
  // },

  async getBridgeVersion() {
    return 2;
  },
  async getMessage() {
    return "I'm from native" as const;
  },
});
```

## Web  Part

### loose

Using the `loose` keyword in `bridge`, It provides minimal type completion without throwing errors for unknown types.

```ts
const bridge = linkBridge<AppBridge>({
  throwOnError: true,
});

const version = await bridge.getBridgeVersion();
if (version >= 2) {
  const message = await bridge.getMessage();
  console.log(message);
} else {
  // Support for old native methods with `loose`
  const oldVersionMessage =
  await bridge.loose.getOldVersionMessage();
  console.log(oldVersionMessage);
}
```
