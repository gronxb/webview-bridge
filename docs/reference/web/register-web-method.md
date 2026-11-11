# registerWebMethod

::: danger DEPRECATED
`registerWebMethod` is deprecated. Send events from React Native to the Web with `postMessage` instead. See [Using a PostMessage](/using-a-post-message).
:::

`registerWebMethod` registers methods declared in the Web so React Native can call them through `linkWebMethod`. See [Using a Web Method](/using-a-web-method).

## Arguments

| Argument | Type                                   | Required | Description                         |
|----------|----------------------------------------|----------|-------------------------------------|
| `bridge` | `Record<string, (...args) => Promise>` | true     | The methods to expose to React Native. |

Returns the same object, so its type can be exported to React Native.
