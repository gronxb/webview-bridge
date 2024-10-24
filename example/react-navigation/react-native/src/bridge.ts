import {
  StackActions,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {createWebView, bridge} from '@webview-bridge/react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import {RootStackParamList} from './navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const appBridge = bridge({
  async getMessage() {
    return "I'm from native" as const;
  },
  async openInAppBrowser(url: string) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },
  async canGoBack() {
    return Boolean(
      navigationRef.current?.isReady() && navigationRef.current.canGoBack(),
    );
  },
  async goBack() {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.goBack();
    }
  },
  async navigate<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params: RootStackParamList[RouteName],
  ) {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.navigate(name as any, params as any);
    }
  },
  async push<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params: RootStackParamList[RouteName],
  ) {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.dispatch(StackActions.push(name, params));
    }
  },
  async replace<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params: RootStackParamList[RouteName],
  ) {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.dispatch(StackActions.replace(name, params));
    }
  },
  async popToTop() {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.dispatch(StackActions.popToTop());
    }
  },
});

// It is exported via the package.json type field.
export type AppBridge = typeof appBridge;

export const {WebView, linkWebMethod} = createWebView({
  bridge: appBridge,
  debug: true,
  fallback: method => {
    console.warn(`Method '${method}' not found in native`);
  },
});
