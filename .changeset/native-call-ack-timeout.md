---
"@webview-bridge/web": minor
"@webview-bridge/react-native": minor
"@webview-bridge/utils": minor
---

`linkBridge`'s `timeout` now limits how long native takes to acknowledge a call, not how long the native method runs.

Native methods that wait for the user, such as a confirm dialog, an image picker, or an in-app browser, used to be cut off after `timeout` (2000 ms by default). The call then resolved to `undefined`, or rejected with `Error("Timeout")` under `throwOnError`. Now native acknowledges each call as soon as it starts running the method, and from then on the page waits for the result with no time limit.

- `timeout` still applies when native never answers, for example when a message is lost, or when a state key is called as a method.
- Compatibility: a page running in a native build without the acknowledgement keeps the old behavior (the whole call is limited by `timeout`). An older page ignores the acknowledgement.
- Behavior change: a slow native method that used to time out now resolves with its real result. If you relied on `timeout` to cap a method's run time, enforce that limit inside the method or around the call.
