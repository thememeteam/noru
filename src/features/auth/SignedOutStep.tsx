import { useAuthActions } from "@convex-dev/auth/react";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { Alert, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";

const OAUTH_VERIFIER_KEY = "__convexAuthOAuthVerifier_noru";

WebBrowser.maybeCompleteAuthSession();

export function SignedOutStep() {
  const styles = useAppStyles();
  const { signIn } = useAuthActions();
  const [isBusy, setIsBusy] = useState(false);

  const startEntraSignIn = async () => {
    try {
      setIsBusy(true);
      await SecureStore.deleteItemAsync(OAUTH_VERIFIER_KEY);
      const redirectTo = Linking.createURL("/");
      const signInResult = await signIn("microsoft-entra-id", { redirectTo });

      if (!signInResult.redirect) {
        return;
      }

      const authSession = await WebBrowser.openAuthSessionAsync(
        signInResult.redirect.toString(),
        redirectTo,
      );

      if (authSession.type !== "success" || !authSession.url) {
        return;
      }

      const code = new URL(authSession.url).searchParams.get("code");
      if (!code) {
        throw new Error("No auth code returned from Entra callback.");
      }

      await signIn("microsoft-entra-id", { code });
    } catch (error) {
      Alert.alert("Sign-in failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={styles.centeredWrap}>
      <View style={styles.card}>
        <Text style={styles.title}>Trusted campus rides</Text>
        <Text style={styles.description}>
          Sign in with your university account to continue.
        </Text>
        <AppButton
          title={isBusy ? "Connecting to Microsoft Entra..." : "Login with University mail"}
          onPress={() => void startEntraSignIn()}
          disabled={isBusy}
        />
      </View>
    </View>
  );
}
