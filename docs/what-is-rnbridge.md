# What is RNBridge

`rnbridge` is a powerful interface that acts as a bridge between React Native and web applications using `react-native-webview`. It provides seamless interaction and ensures type safety.

Inspired by the functionality of `tRPC`, `rnbridge` simplifies the communication process between `react-native-webview` and web applications.

## What Does RNBridge Solve?

When developing apps with `React Native WebView`, there are occasions where `web` functionalities need to access React Native's features. Common examples include `screen navigation`, `in-app browser` and `etc`.

To implement these functionalities, each `WebView` project typically needs to establish its own communication interface. Conversely, there are times in a React Native app when features from the web need to be invoked.

Since WebView and the web operate as distinct entities, communication is usually implemented in a unidirectional manner.

However, `rnbridge` transcends this limitation by utilizing event and promise-based mechanisms, enabling bidirectional communication. This approach allows for the retrieval of return values from functions as one would in a standard programming context.
