import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignedOutStep } from "../auth/SignedOutStep";
import { FaceCaptureStep } from "../onboarding/FaceCaptureStep";
import { useAppStyles } from "../theme/AppTheme";

export function HomeScreen() {
  const styles = useAppStyles();

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <AuthLoading>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#1E6CCC" />
          </View>
        </AuthLoading>

        <Unauthenticated>
          <SignedOutStep />
        </Unauthenticated>

        <Authenticated>
          <FaceCaptureStep />
        </Authenticated>
      </SafeAreaView>
    </View>
  );
}
