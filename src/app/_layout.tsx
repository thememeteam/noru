import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import React from "react";
import { Text, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HeaderProfileActions } from "../components/HeaderProfileActions";
import { AppThemeProvider, useAppTheme } from "../features/theme/AppTheme";
import { convex, convexAuthTokenStorage } from "../lib/convex";

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [Text.defaultProps.style, { fontFamily: "GoogleSansFlexMedium" }];

TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [
  TextInput.defaultProps.style,
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
          headerTransparent: true,
          headerShadowVisible: false,
          headerRight: () => <HeaderProfileActions />,
          contentStyle: { backgroundColor: colors.contentBackground, paddingTop: 88 },
        }}>
        <Stack.Screen name="index" options={{ title: "Noru", headerBackVisible: false }} />
        <Stack.Screen name="host" options={{ title: "Host a ride" }} />
        <Stack.Screen name="waiting" options={{ title: "Waiting room" }} />
        <Stack.Screen name="feedback" options={{ title: "Feedback" }} />
        <Stack.Screen name="report" options={{ title: "Report user" }} />
        <Stack.Screen name="moderation" options={{ title: "Moderation" }} />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
      </Stack>
    </ConvexAuthProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AppNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
