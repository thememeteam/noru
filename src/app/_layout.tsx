import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import React from "react";
import { Text, TextInput, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HeaderProfileActions } from "../components/HeaderProfileActions";
import { AppThemeProvider, useAppTheme } from "../features/theme/AppTheme";
import { convex, convexAuthTokenStorage } from "../lib/convex";

const ThemedText = Text as any;
const ThemedTextInput = TextInput as any;

ThemedText.defaultProps = ThemedText.defaultProps || {};
ThemedText.defaultProps.style = [ThemedText.defaultProps.style, { fontFamily: "InterMedium" }];

ThemedTextInput.defaultProps = ThemedTextInput.defaultProps || {};
ThemedTextInput.defaultProps.style = [
  ThemedTextInput.defaultProps.style,
  { fontFamily: "InterMedium" },
];

function AppNavigator() {
  const [fontsLoaded] = useFonts({
    InterMedium: require("../../assets/fonts/Inter/static/Inter_18pt-Medium.ttf"),
    InterSemiBold: require("../../assets/fonts/Inter/static/Inter_18pt-SemiBold.ttf"),
    InterBold: require("../../assets/fonts/Inter/static/Inter_18pt-Bold.ttf"),
  });
  const { colors } = useAppTheme();

  if (!fontsLoaded) {
    return null;
  }

  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.contentBackground,
      card: colors.headerBackground,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
    <ConvexAuthProvider
      client={convex}
      storage={convexAuthTokenStorage}
      storageNamespace="noru">
      <View style={{ flex: 1, backgroundColor: colors.contentBackground }}>
        <Stack
          screenOptions={{
            headerTintColor: colors.headerTint,
            headerStyle: { backgroundColor: colors.headerBackground },
            headerTitleStyle: { fontWeight: "600", color: colors.headerTint, fontFamily: "InterSemiBold" },
            headerTransparent: false,
            headerShadowVisible: false,
            headerRight: () => <HeaderProfileActions />,
            contentStyle: { backgroundColor: colors.contentBackground },
          }}>
          <Stack.Screen name="index" options={{ title: "Noru", headerBackVisible: false }} />
          <Stack.Screen name="host" options={{ title: "Host a ride" }} />
          <Stack.Screen name="waiting" options={{ title: "Waiting room" }} />
          <Stack.Screen name="feedback" options={{ title: "Feedback" }} />
          <Stack.Screen name="report" options={{ title: "Report user" }} />
          <Stack.Screen name="moderation" options={{ title: "Moderation" }} />
          <Stack.Screen name="moderation/[reportId]" options={{ title: "Report detail" }} />
          <Stack.Screen name="profile" options={{ title: "Profile", headerRight: () => null }} />
        </Stack>
      </View>
    </ConvexAuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: "#2E2E2E" }}>
      <AppThemeProvider>
        <StatusBar style="light" backgroundColor="#2E2E2E" translucent={false} />
        <AppNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}


