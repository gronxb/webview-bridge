/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from "react";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View, Text, Button } from "react-native";
import { WebView, navigationRef } from "./src/bridge";
import { RootStackParamList } from "./src/navigation";

function WebViewHomeScreen() {
  return (
    <View style={{ height: "100%" }}>
      <WebView
      allowsBackForwardNavigationGestures
        source={{
          uri: "http://localhost:5173",
        }}
        style={{ height: "100%", flex: 1, width: "100%" }}
      />
    </View>
  );
}

function UserInfoScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "UserInfo">) {
  const { userId } = route.params;

  return (
    <View style={{ height: "100%" }}>
      <Text>UserId: {userId}</Text>

      <Button
        title="New WebView"
        onPress={() => navigation.push("WebViewHome")}
      />
      <Button title="Go back" onPress={() => navigation.goBack()} />
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): JSX.Element {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="WebViewHome">
        <Stack.Screen name="WebViewHome" component={WebViewHomeScreen} />
        <Stack.Screen name="UserInfo" component={UserInfoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;