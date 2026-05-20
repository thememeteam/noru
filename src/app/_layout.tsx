import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HeaderProfileActions } from "../components/HeaderProfileActions";
import { AppThemeProvider, useAppTheme } from "../features/theme/AppTheme";
import { convex, convexAuthTokenStorage } from "../lib/convex";
import { api } from "../../convex/_generated/api";
import { ConvexProvider, useQuery } from "convex/react";

const BG = "#2E2E2E";

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: BG,
    card: BG,
  },
};

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
    InterMedium: require("../../assets/fonts/static/Inter_18pt-Medium.ttf"),
    InterSemiBold: require("../../assets/fonts/static/Inter_18pt-SemiBold.ttf"),
    InterBold: require("../../assets/fonts/static/Inter_18pt-Bold.ttf"),
  });
  const { colors } = useAppTheme();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ConvexProvider client={convex}>
      <ConvexAuthProvider
        client={convex}
        storage={convexAuthTokenStorage}
        storageNamespace="noru">
        <AppContent colors={colors} />
      </ConvexAuthProvider>
    </ConvexProvider>
  );
}

function AppContent({ colors }: { colors: ReturnType<typeof useAppTheme>["colors"] }) {
  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const { signOut } = useAuthActions();
  const [hasShownBan, setHasShownBan] = useState(false);

  useEffect(() => {
    if (!onboarding?.isBanned || hasShownBan) {
      return;
    }

    setHasShownBan(true);
    Alert.alert(
      "Account banned",
      "Your account has been banned. You can no longer access Noru.",
      [{ text: "OK", onPress: () => void signOut() }],
    );
  }, [hasShownBan, onboarding?.isBanned, signOut]);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <Stack
        screenOptions={{
          headerTintColor: colors.headerTint,
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTitleStyle: { fontWeight: "600", color: colors.headerTint, fontFamily: "InterBold" },
          headerTransparent: false,
          headerShadowVisible: false,
          headerRight: () => <HeaderProfileActions />,
          contentStyle: { backgroundColor: colors.contentBackground },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false, headerBackVisible: false }} />
        <Stack.Screen name="host" options={{ title: "Host a ride" }} />
        <Stack.Screen name="ride-details" options={{ title: "Ride details" }} />
        <Stack.Screen name="waiting" options={{ title: "Waiting room" }} />
        <Stack.Screen name="chat" options={{ title: "Group chat" }} />
        <Stack.Screen name="feedback" options={{ title: "Feedback" }} />
        <Stack.Screen name="report" options={{ title: "Report user" }} />
        <Stack.Screen name="moderation" options={{ title: "Moderation" }} />
        <Stack.Screen name="moderation/[reportId]" options={{ title: "Report detail" }} />
        <Stack.Screen name="profile" options={{ title: "Profile", headerRight: () => null }} />
        <Stack.Screen name="ride-history" options={{ title: "Ride history", headerRight: () => null }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: BG }}>
      <AppThemeProvider>
        <StatusBar style="light" backgroundColor="#2E2E2E" translucent={false} />
        <AppNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function RootContainer() {
  const { colors } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.contentBackground }}>
      <StatusBar style="light" backgroundColor={colors.contentBackground} translucent={false} />
      <AppNavigator />
    </View>
  );
}


