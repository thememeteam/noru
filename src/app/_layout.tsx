import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useFonts } from "expo-font";
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
    GoogleSansFlexMedium: require("C:\\Users\\rish9\\Documents\\noru\\assets\\fonts\\Google_Sans_Flex\\static\\GoogleSansFlex_24pt-Medium.ttf"),
    GoogleSansFlexBold: require("C:\\Users\\rish9\\Documents\\noru\\assets\\fonts\\Google_Sans_Flex\\static\\GoogleSansFlex_24pt-Bold.ttf"),
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
          headerTitleStyle: { fontWeight: "600", color: colors.headerTint, fontFamily: "IBMPlexSansBold" },
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
