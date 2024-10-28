/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import html from './web/html.ts';
import React from 'react';
import {Button, Text, SafeAreaView, TextInput, View} from 'react-native';
import {
  createWebView,
  type BridgeWebView,
  bridge,
  useBridge,
  type Bridge,
} from '@webview-bridge/react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';

interface AppBridgeState extends Bridge {
  getMessage(): Promise<string>;
  openInAppBrowser(url: string): Promise<void>;
  count: number;
  increase(): Promise<void>;
  data: {
    text: string;
  };
  setDataText(text: string): Promise<void>;
}

export const appBridge = bridge<AppBridgeState>(({get, set}) => ({
  async getMessage() {
    return "I'm from native" as const;
  },
  async openInAppBrowser(url: string) {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
    }
  },

  data: {
    text: '',
  },
  count: 0,
  async increase() {
    set({
      count: get().count + 1,
    });
  },
  async setDataText(text) {
    set({
      data: {
        text,
      },
    });
  },
}));

export const {WebView} = createWebView({
  bridge: appBridge,
  debug: true,
  fallback: method => {
    console.warn(`Method '${method}' not found in native`);
  },
});

function Count() {
  // render when count changed
  const count = useBridge(appBridge, state => state.count);

  return <Text>Native Count: {count}</Text>;
}

function Input() {
  const {data, setDataText} = useBridge(appBridge);

  return (
    <View style={{justifyContent: 'center', alignItems: 'center'}}>
      <Text
        style={{
          marginBottom: 10,
          textAlign: 'center',
        }}>
        Native Data Text: {data.text}
      </Text>
      <TextInput
        value={data.text}
        onChangeText={setDataText}
        style={{borderWidth: 1, minWidth: '50%', maxWidth: '50%'}}
      />
    </View>
  );
}

function App(): JSX.Element {
  const webviewRef = React.useRef<BridgeWebView>(null);

  const increase = useBridge(appBridge, state => state.increase);

  return (
    <SafeAreaView style={{height: '100%'}}>
      <WebView
        ref={webviewRef}
        source={
          __DEV__
            ? {
                uri: 'http://localhost:5173',
              }
            : {
                html,
              }
        }
        style={{height: '50%', width: '100%'}}
      />

      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          height: '50%',
        }}>
        <Text style={{fontSize: 20, fontWeight: '700', marginBottom: 10}}>
          This is Native {__DEV__ ? 'DEV' : 'PROD'}
        </Text>

        <Count />
        <Button onPress={() => increase()} title="Increase From Native" />

        <Input />
      </View>
    </SafeAreaView>
  );
}

export default App;
