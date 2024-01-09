## Contributor Guide

Welcome to the project's contributor guide! This document will provide you with essential information and guidelines for contributing to our software development process. We highly value your expertise and contributions to our project, and we appreciate your commitment to enhancing the codebase.

## Development Environment Setup

To ensure consistent and efficient development, we utilize `pnpm` as our package manager. We kindly request all contributors to use `pnpm` for managing dependencies. If you're not familiar with pnpm, please take a moment to familiarize yourself with its documentation and installation instructions.

## Examples

To help you get started quickly, we have provided several examples in the example folder. These examples demonstrate the usage and capabilities of our software. We encourage you to explore them and leverage the insights gained to enhance your understanding of our project's functionality.

If the files in `packages/*` have changed, you will need to do `pnpm -w build`.

## Setup

```sh
$ pnpm i
$ pnpm build
$ pnpm start --reset-cache
```

## React Native (iOS) Start

```sh
$ cd example/react-native
$ pnpx pod-install
$ pnpm ios
```

## Web Start

```sh
$ cd example/web
$ pnpm dev
```

