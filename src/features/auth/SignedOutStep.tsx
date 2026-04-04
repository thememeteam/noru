import { useAuthActions } from "@convex-dev/auth/react";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

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
      <View style={styles.signInCard}>
        <View style={styles.signInHeader}>
          <Text style={styles.signInBrand}>noru</Text>
          <Text style={styles.signInSubBrand}>campus ridesharing</Text>
        </View>

        <Text style={styles.signInHeadline}>Sign in with your university account to get started</Text>

        <Pressable
          onPress={() => void startEntraSignIn()}
          disabled={isBusy}
          style={({ pressed }) => [
            styles.signInMicrosoftButton,
            pressed && !isBusy && styles.buttonPressed,
            isBusy && styles.buttonDisabled,
          ]}>
          <View style={styles.signInMicrosoftIcon}>
            <View style={styles.signInMicrosoftRow}>
              <View style={[styles.signInMicrosoftTile, styles.signInMicrosoftTileRed]} />
              <View style={[styles.signInMicrosoftTile, styles.signInMicrosoftTileGreen]} />
            </View>
            <View style={styles.signInMicrosoftRow}>
              <View style={[styles.signInMicrosoftTile, styles.signInMicrosoftTileBlue]} />
              <View style={[styles.signInMicrosoftTile, styles.signInMicrosoftTileYellow]} />
            </View>
          </View>
          <Text style={styles.signInMicrosoftButtonText}>
            {isBusy ? "Connecting to Microsoft..." : "Continue with Microsoft"}
          </Text>
        </Pressable>

        <Text style={styles.signInRestriction}>Restricted to @amrita.edu accounts</Text>

        <View style={styles.signInDivider} />

        <Text style={styles.signInLegalText}>By continuing, you agree to our terms and privacy policy</Text>
      </View>
    </View>
  );
}
