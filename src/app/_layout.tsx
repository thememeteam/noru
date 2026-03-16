import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Stack } from "expo-router";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HeaderProfileActions } from "../components/HeaderProfileActions";
import { convex, convexAuthTokenStorage } from "../lib/convex";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConvexAuthProvider
        client={convex}
        storage={convexAuthTokenStorage}
        storageNamespace="noru">
        <Stack
          screenOptions={{
            headerTintColor: "#b50246",
            headerTitleStyle: { fontWeight: "600" },
            headerTransparent: true,
            headerShadowVisible: false,
            headerRight: () => <HeaderProfileActions />,
            contentStyle: { backgroundColor: "#F4F6FB", paddingTop: 88 },
          }}>
          <Stack.Screen name="index" options={{ title: "Noru" }} />
          <Stack.Screen name="host" options={{ title: "Host a ride" }} />
          <Stack.Screen name="waiting" options={{ title: "Waiting room" }} />
        </Stack>
      </ConvexAuthProvider>
    </SafeAreaProvider>
  );
}
