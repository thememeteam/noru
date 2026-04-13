import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import React from "react";
import { Text, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HeaderProfileActions } from "../components/HeaderProfileActions";
import { AppThemeProvider, useAppTheme } from "../features/theme/AppTheme";
import { convex, convexAuthTokenStorage } from "../lib/convex";

const ThemedText = Text as any;
const ThemedTextInput = TextInput as any;

ThemedText.defaultProps = ThemedText.defaultProps || {};
ThemedText.defaultProps.style = [ThemedText.defaultProps.style, { fontFamily: "GoogleSansFlexMedium" }];

ThemedTextInput.defaultProps = ThemedTextInput.defaultProps || {};
ThemedTextInput.defaultProps.style = [
  ThemedTextInput.defaultProps.style,
  { fontFamily: "GoogleSansFlexMedium" },
];

function AppNavigator() {
  const [fontsLoaded] = useFonts({
    GoogleSansFlexMedium: require("../../assets/fonts/Google_Sans_Flex/static/GoogleSansFlex_24pt-Medium.ttf"),
    GoogleSansFlexBold: require("../../assets/fonts/Google_Sans_Flex/static/GoogleSansFlex_24pt-Bold.ttf"),
  });
  const { colors } = useAppTheme();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ConvexAuthProvider
      client={convex}
      storage={convexAuthTokenStorage}
      storageNamespace="noru">
      <Stack
        screenOptions={{
          headerTintColor: colors.headerTint,
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTitleStyle: { fontWeight: "600", color: colors.headerTint, fontFamily: "GoogleSansFlexBold" },
          headerTransparent: false,
          headerShadowVisible: false,
          headerRight: () => <HeaderProfileActions />,
          contentStyle: { backgroundColor: colors.contentBackground },
        }}>
        <Stack.Screen name="index" options={{ title: "Noru", headerBackVisible: false }} />
        <Stack.Screen name="host" options={{ title: "Host a ride" }} />
        <Stack.Screen name="ride-details" options={{ title: "Ride details" }} />
        <Stack.Screen name="waiting" options={{ title: "Waiting room" }} />
        <Stack.Screen name="feedback" options={{ title: "Feedback" }} />
        <Stack.Screen name="report" options={{ title: "Report user" }} />
        <Stack.Screen name="moderation" options={{ title: "Moderation" }} />
        <Stack.Screen name="moderation/[reportId]" options={{ title: "Report detail" }} />
        <Stack.Screen name="profile" options={{ title: "Profile", headerRight: () => null }} />
      </Stack>
    </ConvexAuthProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <StatusBar style="light" backgroundColor="#2E2E2E" translucent={false} />
        <AppNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}


