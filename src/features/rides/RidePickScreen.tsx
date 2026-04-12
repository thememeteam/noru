import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { deriveDisplayName } from "../../lib/userDisplay";
import { useAppStyles } from "../theme/AppTheme";
import { VEHICLE_LABELS } from "./constants";

export function RidePickScreen() {
  const styles = useAppStyles();
  const onboardingState = useQuery(api.onboarding.getOnboardingState);
  const posts = useQuery(api.rides.listJoinableRidePosts) ?? [];
  const activeJoinedRide = useQuery(api.rides.getMyActiveJoinedRide);
  const joinRidePost = useMutation(api.rides.joinRidePost);

  const [joiningRideId, setJoiningRideId] = useState<string | null>(null);
  const displayName = deriveDisplayName(onboardingState?.displayName, onboardingState?.universityEmail);
  const firstName = displayName.split(" ")[0] || "Student";
  const currentHour = new Date().getHours();
  const dayGreeting = currentHour < 12 ? "Good morning," : currentHour < 17 ? "Good afternoon," : "Good evening,";

  const onJoinRide = async (ridePostId: string) => {
    try {
      setJoiningRideId(ridePostId);
      await joinRidePost({ ridePostId: ridePostId as Id<"ridePosts"> });
      router.replace({ pathname: "/waiting", params: { ridePostId } });
    } catch (error) {
      Alert.alert(
        "Could not join ride",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setJoiningRideId(null);
    }
  };

  return (
    <View style={[styles.pickScreenContainer, ridePickStyles.screen]}>
      <ScrollView contentContainerStyle={[styles.boardContent, ridePickStyles.boardContent]}>
        <View style={ridePickStyles.greetingWrap}>
          <Text style={ridePickStyles.greetingSmall}>{dayGreeting}</Text>
          <Text style={ridePickStyles.greetingName}>{firstName}</Text>
        </View>

        <View style={[styles.card, ridePickStyles.card]}>
          <Text style={[styles.title, ridePickStyles.title]}>Pick a ride</Text>
          <Text style={[styles.description, ridePickStyles.description]}>Browse open rides and join one.</Text>
          {activeJoinedRide ? (
            <View style={[styles.postItem, ridePickStyles.postItem]}>
              <Text style={[styles.postName, ridePickStyles.postName]}>You are currently in a ride</Text>
              <Text style={ridePickStyles.routeText}>
                {activeJoinedRide.startPoint} {"->"} {activeJoinedRide.endPoint}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  ridePickStyles.actionButton,
                  ridePickStyles.actionButtonPrimary,
                  pressed && ridePickStyles.buttonPressed,
                ]}
                onPress={() =>
                  router.replace({ pathname: "/waiting", params: { ridePostId: activeJoinedRide.ridePostId } })
                }>
                <Text style={ridePickStyles.actionButtonText}>Go to waiting room</Text>
              </Pressable>
            </View>
          ) : null}
          {posts.length === 0 ? (
            <Text style={[styles.description, ridePickStyles.description]}>No joinable rides right now.</Text>
          ) : (
            <View style={styles.postList}>
              {posts.map((post) => (
                <View key={post._id} style={[styles.postItem, ridePickStyles.postItem]}>
                  <View style={styles.postHeader}>
                    <View style={styles.personRow}>
                      {post.riderPhotoUrl ? (
                        <Image source={{ uri: post.riderPhotoUrl }} style={styles.personAvatarSmall} />
                      ) : (
                        <View style={styles.personAvatarFallbackSmall}>
                          <Text style={styles.personAvatarFallbackTextSmall}>U</Text>
                        </View>
                      )}
                      <Text style={[styles.postName, ridePickStyles.postName]}>{post.riderName}</Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        post.isFull ? styles.badgeFull : styles.badgeOpen,
                        post.isFull ? ridePickStyles.badgeFull : ridePickStyles.badgeOpen,
                      ]}>
                      <Text
                        style={[
                          styles.badgeText,
                          post.isFull ? styles.badgeTextFull : styles.badgeTextOpen,
                          post.isFull ? ridePickStyles.badgeTextFull : ridePickStyles.badgeTextOpen,
                        ]}>
                        {post.isFull ? "Full" : "Open"}
                      </Text>
                    </View>
                  </View>
                  <Text style={ridePickStyles.routeText}>
                    {post.startPoint} → {post.endPoint}
                  </Text>
                  <Text style={[styles.postMeta, ridePickStyles.metaText]}>{VEHICLE_LABELS[post.vehicleType]}</Text>
                  <Pressable
                    style={({ pressed }) => [
                      ridePickStyles.actionButton,
                      ridePickStyles.actionButtonPrimary,
                      (joiningRideId === post._id || !!activeJoinedRide) && ridePickStyles.buttonDisabled,
                      pressed && !(joiningRideId === post._id || !!activeJoinedRide) && ridePickStyles.buttonPressed,
                    ]}
                    onPress={() => void onJoinRide(post._id)}
                    disabled={joiningRideId === post._id || !!activeJoinedRide}>
                    <Text style={ridePickStyles.actionButtonText}>
                      {joiningRideId === post._id ? "Joining..." : "Join ride"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable style={[styles.fab, ridePickStyles.fab]} onPress={() => router.push("/host")}>
        <Text style={[styles.fabText, ridePickStyles.fabText]}>Host</Text>
      </Pressable>
    </View>
  );
}

const ridePickStyles = StyleSheet.create({
  screen: {
    backgroundColor: "#2E2E2E",
  },
  boardContent: {
    paddingTop: 14,
    paddingBottom: 96,
  },
  greetingWrap: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    marginBottom: 10,
  },
  greetingSmall: {
    color: "#C7CDD9",
    fontSize: 18,
    fontFamily: "GoogleSansFlexMedium",
  },
  greetingName: {
    color: "#F3F4F6",
    fontSize: 34,
    lineHeight: 38,
    fontFamily: "GoogleSansFlexBold",
  },
  card: {
    backgroundColor: "#2E2E2E",
    borderColor: "#4B5563",
    borderRadius: 16,
    shadowOpacity: 0,
    elevation: 0,
  },
  title: {
    color: "#F3F4F6",
  },
  description: {
    color: "#D1D5DB",
  },
  postItem: {
    backgroundColor: "#2E2E2E",
    borderColor: "#4B5563",
    borderRadius: 14,
    gap: 8,
  },
  postName: {
    color: "#F3F4F6",
  },
  routeText: {
    color: "#E5E7EB",
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "GoogleSansFlexMedium",
  },
  metaText: {
    color: "#C7CDD9",
  },
  badgeOpen: {
    backgroundColor: "#E5F7D9",
  },
  badgeFull: {
    backgroundColor: "#FEE2E2",
  },
  badgeTextOpen: {
    color: "#335F2D",
  },
  badgeTextFull: {
    color: "#B91C1C",
  },
  actionButton: {
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  actionButtonPrimary: {
    alignSelf: "flex-start",
    backgroundColor: "#1E6CCC",
    minWidth: 112,
  },
  actionButtonText: {
    color: "#EAF3FF",
    fontSize: 16,
    fontFamily: "GoogleSansFlexMedium",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  fab: {
    backgroundColor: "#1E6CCC",
  },
  fabText: {
    color: "#EAF3FF",
  },
});
