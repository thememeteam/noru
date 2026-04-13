import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { AppButton } from "../../components/AppButton";
import { deriveDisplayName, getAvatarInitial } from "../../lib/userDisplay";
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
        <ActivityIndicator size="large" color="#1E6CCC" />
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

  const displayName = deriveDisplayName(onboardingState.displayName, onboardingState.universityEmail);
  const avatarInitial = getAvatarInitial(displayName);

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent}>
          <View style={[styles.card, profileStyles.centerCard]}>
            <View style={profileStyles.centerIdentityWrap}>
              {onboardingState.profilePhotoUrl ? (
                <Image source={{ uri: onboardingState.profilePhotoUrl }} style={styles.profileHeroAvatar} />
              ) : (
                <View style={styles.profileHeroAvatarFallback}>
                  <Text style={styles.profileHeroAvatarFallbackText}>{avatarInitial}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.profileName, profileStyles.centerName]}>{displayName}</Text>
            <Text style={[styles.profileEmail, profileStyles.centerEmail]}>{onboardingState.universityEmail ?? "No email found"}</Text>
            <View style={styles.quickRow}>
              <Pressable onPress={() => {}} style={profileStyles.traitChip}><Text style={profileStyles.traitChipText}>Quiet</Text></Pressable>
              <Pressable onPress={() => {}} style={profileStyles.traitChip}><Text style={profileStyles.traitChipText}>Punctual</Text></Pressable>
              <Pressable onPress={() => {}} style={profileStyles.traitChip}><Text style={profileStyles.traitChipText}>Friendly</Text></Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Ride history</Text>
            {rideHistory === undefined ? (
              <Text style={styles.description}>Loading your rides...</Text>
            ) : pastRides.length === 0 ? (
              <Text style={styles.description}>No past rides found yet.</Text>
            ) : (
              <View style={styles.postList}>
                {pastRides.map((item) => (
                  <View key={item.id} style={[styles.postItem, profileStyles.historyRow]}>
                    <View style={profileStyles.historyLeft}>
                      <Text style={styles.postName}>{item.startPoint} {"→"} {item.endPoint}</Text>
                      <Text style={styles.postMeta}>{VEHICLE_LABELS[item.vehicleType]} · {formatRideDateTime(item.createdAt)}</Text>
                    </View>
                    <View style={profileStyles.completedPill}><Text style={profileStyles.completedPillText}>Completed</Text></View>
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
            <Text style={styles.sectionLabel}>Account</Text>
            <Pressable onPress={() => {}} style={profileStyles.accountRow}>
              <Text style={styles.postName}>Edit preferences</Text>
              <Text style={styles.postMeta}>{">"}</Text>
            </Pressable>

            <AppButton title="Report a user" onPress={() => router.push("/report")} variant="secondary" />
            {moderationAccess?.isAdmin ? (
              <AppButton
                title="Moderation dashboard"
                onPress={() => router.push("/moderation")}
                variant="secondary"
              />
            ) : null}
            <Pressable
              onPress={() => void onSignOut()}
              style={({ pressed }) => [
                styles.buttonBase,
                {
                  backgroundColor: "#A83856",
                  borderWidth: 1,
                  borderColor: "#C85A77",
                },
                pressed && styles.buttonPressed,
              ]}>
              <Text style={[styles.buttonText, { color: "#FFE8EE" }]}>Sign out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  centerCard: {
    alignItems: "center",
  },
  centerIdentityWrap: {
    marginBottom: 6,
  },
  centerName: {
    textAlign: "center",
  },
  centerEmail: {
    textAlign: "center",
    marginBottom: 4,
  },
  traitChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#8DB7E8",
    backgroundColor: "#EAF3FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  traitChipText: {
    color: "#1E477A",
    fontSize: 12,
    fontFamily: "GoogleSansFlexMedium",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  historyLeft: {
    flex: 1,
    gap: 2,
  },
  completedPill: {
    borderRadius: 999,
    backgroundColor: "#E5F7D9",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedPillText: {
    color: "#335F2D",
    fontSize: 12,
    fontFamily: "GoogleSansFlexBold",
  },
  accountRow: {
    borderWidth: 1,
    borderColor: "#5B6371",
    backgroundColor: "#2A2D33",
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
