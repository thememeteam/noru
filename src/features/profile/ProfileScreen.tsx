import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { AppButton } from "../../components/AppButton";
import { VEHICLE_LABELS } from "../rides/constants";
import { useAppStyles } from "../theme/AppTheme";

const rideDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatRideDateTime(timestamp: number) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return rideDateFormatter.format(date);
}

export function ProfileScreen() {
  const styles = useAppStyles();
  const { signOut } = useAuthActions();
  const onboardingState = useQuery(api.onboarding.getOnboardingState);
  const moderationAccess = useQuery(
    api.moderation.getModerationAccess,
    onboardingState?.isAuthenticated ? {} : "skip",
  );
  const rideHistory = useQuery(
    api.rides.getMyRideHistory,
    onboardingState?.isAuthenticated ? {} : "skip",
  );
  const myRatingSummary = useQuery(
    api.rides.getMyRatingSummary,
    onboardingState?.isAuthenticated ? {} : "skip",
  );

  const pastRides = useMemo(() => {
    if (!rideHistory) {
      return [];
    }

    return rideHistory.filter((item) => item.status === "Stopped").slice(0, 3);
  }, [rideHistory]);

  const onSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  if (onboardingState === undefined) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#b50246" />
      </View>
    );
  }

  if (!onboardingState.isAuthenticated) {
    return (
      <View style={styles.screenContainer}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.card}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.description}>Sign in to view your profile.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const displayName =
    onboardingState.displayName?.trim() ||
    onboardingState.universityEmail?.split("@")[0] ||
    "Student";
  const avatarInitial = displayName.charAt(0).toUpperCase() || "U";

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Profile</Text>
            <View style={styles.profileIdentityRow}>
              {onboardingState.profilePhotoUrl ? (
                <Image source={{ uri: onboardingState.profilePhotoUrl }} style={styles.profileHeroAvatar} />
              ) : (
                <View style={styles.profileHeroAvatarFallback}>
                  <Text style={styles.profileHeroAvatarFallbackText}>{avatarInitial}</Text>
                </View>
              )}
              <View style={styles.profileIdentityTextWrap}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail}>{onboardingState.universityEmail ?? "No email found"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Last 3 past rides</Text>
            {rideHistory === undefined ? (
              <Text style={styles.description}>Loading your rides...</Text>
            ) : pastRides.length === 0 ? (
              <Text style={styles.description}>No past rides found yet.</Text>
            ) : (
              <View style={styles.postList}>
                {pastRides.map((item) => (
                  <View key={item.id} style={styles.postItem}>
                    <Text>
                      {item.startPoint} {"➡️"} {item.endPoint}
                    </Text>
                    <Text style={styles.postMeta}>{VEHICLE_LABELS[item.vehicleType]}</Text>
                    <Text style={styles.postMeta}>{formatRideDateTime(item.createdAt)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>My rating</Text>
            {myRatingSummary === undefined ? (
              <Text style={styles.description}>Loading rating...</Text>
            ) : myRatingSummary.totalRatings === 0 ? (
              <Text style={styles.description}>No ratings yet.</Text>
            ) : (
              <>
                <Text style={styles.postName}>{myRatingSummary.averageRating} / 5</Text>
              </>
            )}
          </View>
          <View style={styles.card}>
            <AppButton title="Report a user" onPress={() => router.push("/report")} variant="secondary" />
            {moderationAccess?.isAdmin ? (
              <AppButton
                title="Moderation dashboard"
                onPress={() => router.push("/moderation")}
                variant="secondary"
              />
            ) : null}
            <AppButton title="Sign out" onPress={() => void onSignOut()} variant="danger" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
