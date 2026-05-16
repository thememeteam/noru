import { useAuthActions } from "@convex-dev/auth/react";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppStyles } from "../theme/AppTheme";

const OAUTH_VERIFIER_KEY = "__convexAuthOAuthVerifier_noru";

const EASE_OUT_QUART = Easing.out(Easing.poly(4));

WebBrowser.maybeCompleteAuthSession();

export function SignedOutStep() {
  const styles = useAppStyles();
  const { signIn } = useAuthActions();
  const [isBusy, setIsBusy] = useState(false);

  // Animated values — all start hidden
  const ringScale = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandSlide = useRef(new Animated.Value(14)).current;
  const subBrandOpacity = useRef(new Animated.Value(0)).current;
  const subBrandSlide = useRef(new Animated.Value(8)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(10)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        ringScale.setValue(1);
        brandOpacity.setValue(1);
        brandSlide.setValue(0);
        subBrandOpacity.setValue(1);
        subBrandSlide.setValue(0);
        headlineOpacity.setValue(1);
        buttonOpacity.setValue(1);
        buttonSlide.setValue(0);
        footerOpacity.setValue(1);
        return;
      }

      Animated.parallel([
        // Ring springs in first
        Animated.spring(ringScale, {
          toValue: 1,
          tension: 160,
          friction: 12,
          useNativeDriver: true,
        }),

        // Brand name slides up starting at 80ms
        Animated.sequence([
          Animated.delay(80),
          Animated.parallel([
            Animated.timing(brandOpacity, { toValue: 1, duration: 260, easing: EASE_OUT_QUART, useNativeDriver: true }),
            Animated.timing(brandSlide, { toValue: 0, duration: 260, easing: EASE_OUT_QUART, useNativeDriver: true }),
          ]),
        ]),

        // Sub-brand at 200ms
        Animated.sequence([
          Animated.delay(200),
          Animated.parallel([
            Animated.timing(subBrandOpacity, { toValue: 1, duration: 220, easing: EASE_OUT_QUART, useNativeDriver: true }),
            Animated.timing(subBrandSlide, { toValue: 0, duration: 220, easing: EASE_OUT_QUART, useNativeDriver: true }),
          ]),
        ]),

        // Headline at 300ms
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(headlineOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),

        // Button at 420ms
        Animated.sequence([
          Animated.delay(420),
          Animated.parallel([
            Animated.timing(buttonOpacity, { toValue: 1, duration: 240, easing: EASE_OUT_QUART, useNativeDriver: true }),
            Animated.timing(buttonSlide, { toValue: 0, duration: 240, easing: EASE_OUT_QUART, useNativeDriver: true }),
          ]),
        ]),

        // Footer at 540ms
        Animated.sequence([
          Animated.delay(540),
          Animated.timing(footerOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, []);

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

        {/* Trust signal: cobalt verification ring */}
        <Animated.View style={[localStyles.ringWrap, { transform: [{ scale: ringScale }] }]}>
          <View style={localStyles.ringOuter}>
            <View style={localStyles.ringInner} />
          </View>
        </Animated.View>

        {/* Brand identity */}
        <View style={styles.signInHeader}>
          <Animated.Text
            style={[
              styles.signInBrand,
              { opacity: brandOpacity, transform: [{ translateY: brandSlide }] },
            ]}>
            noru
          </Animated.Text>
          <Animated.Text
            style={[
              styles.signInSubBrand,
              { opacity: subBrandOpacity, transform: [{ translateY: subBrandSlide }] },
            ]}>
            campus ridesharing
          </Animated.Text>
        </View>

        <Animated.Text style={[styles.signInHeadline, { opacity: headlineOpacity }]}>
          Sign in with your university account to get started
        </Animated.Text>

        <Animated.View style={{ opacity: buttonOpacity, transform: [{ translateY: buttonSlide }] }}>
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
        </Animated.View>

        <Animated.View style={{ opacity: footerOpacity }}>
          <View style={styles.signInDivider} />
          <Text style={[styles.signInLegalText, { marginTop: 16 }]}>
            By continuing, you agree to our terms and privacy policy
          </Text>
        </Animated.View>

      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  ringWrap: {
    alignItems: "center",
  },
  ringOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: "#60A5FA",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1F3654",
  },
});
