# webview-bridge

[![NPM](https://img.shields.io/npm/v/%40rnbridge%2Fnative/latest?label=%40rnbridge%2Fnative)](https://www.npmjs.com/package/@webview-bridge/react-native)
[![NPM](https://img.shields.io/npm/v/%40rnbridge%2Fweb/latest?label=%40rnbridge%2Fweb)](https://www.npmjs.com/package/@webview-bridge/web)

`webview-bridge` is a powerful interface that acts as a bridge between React Native and web applications using `react-native-webview`. It providing seamless interaction and ensuring type safety.

Inspired by the functionality of `tRPC`, `webview-bridge` simplifies the communication process between `react-native-webview` and web applications.

**Key Features:**

- Built upon `react-native-webview`.
- Designed with zero external dependencies (except for `react-native-webview`).
- Type-Safety
- Backward Compatibility
- No App Review Needed

![webview-bridge](https://github.com/gronxb/webview-bridge/assets/41789633/a93e6439-f410-42ac-bc4b-b8f32213a537)

## Documentation

visit [Docs](https://gronxb.github.io/webview-bridge)

## Example

visit [Example](https://github.com/gronxb/webview-bridge-example)

## Exporting Type Declarations

To enhance your experience with webview-bridge, it's recommended to export the type declaration of the native bridge object to the web application. Here are a few ways to achieve this:

1. Monorepo Setup (Recommended): Use a monorepo setup to export the type of the native bridge.
2. Private npm Registry: Utilize a private npm registry to export the type of the native bridge.
3. Custom Declaration File (WIP): Build a bridge declaration file using tsc and move the file as needed.

## Contributor Guide

If you would like to contribute to webview-bridge by submitting bug fixes or performance improvements, please refer to our [CONTRIBUTING.md](https://github.com/brandazine/webview-bridge/blob/main/CONTRIBUTING.md) guide for detailed instructions. We welcome and appreciate your contributions.
