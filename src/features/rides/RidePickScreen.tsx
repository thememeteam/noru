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

        <View style={ridePickStyles.heroCard}>
          <Text style={ridePickStyles.heroTitle}>Time to head to campus?</Text>
          <Text style={ridePickStyles.heroSubtitle}>Your usual ride is at 8:30 AM</Text>
          <View style={ridePickStyles.heroActionRow}>
            <Pressable
              style={({ pressed }) => [
                ridePickStyles.heroAction,
                ridePickStyles.heroActionPrimary,
                pressed && ridePickStyles.buttonPressed,
              ]}
              onPress={() => router.push("/host")}>
              <Text style={ridePickStyles.heroActionPrimaryText}>Host a ride</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                ridePickStyles.heroAction,
                ridePickStyles.heroActionSecondary,
                pressed && ridePickStyles.buttonPressed,
              ]}
              onPress={() => {}}>
              <Text style={ridePickStyles.heroActionSecondaryText}>Find a ride</Text>
            </Pressable>
          </View>
        </View>

        <Text style={ridePickStyles.sectionTitle}>AVAILABLE RIDES</Text>
        <View style={ridePickStyles.filterRow}>
          <Pressable style={[ridePickStyles.filterChip, ridePickStyles.filterChipActive]} onPress={() => {}}>
            <Text style={[ridePickStyles.filterChipText, ridePickStyles.filterChipTextActive]}>All</Text>
          </Pressable>
          <Pressable style={ridePickStyles.filterChip} onPress={() => {}}>
            <Text style={ridePickStyles.filterChipText}>Women only</Text>
          </Pressable>
          <Pressable style={ridePickStyles.filterChip} onPress={() => {}}>
            <Text style={ridePickStyles.filterChipText}>No talking</Text>
          </Pressable>
          <Pressable style={ridePickStyles.filterChip} onPress={() => {}}>
            <Text style={ridePickStyles.filterChipText}>Auto</Text>
          </Pressable>
          <Pressable style={ridePickStyles.filterChip} onPress={() => {}}>
            <Text style={ridePickStyles.filterChipText}>Cab</Text>
          </Pressable>
        </View>

        {activeJoinedRide ? (
          <View style={ridePickStyles.rideCard}>
            <Text style={ridePickStyles.rideRoute}>You are currently in a ride</Text>
            <Text style={ridePickStyles.rideMeta}>{activeJoinedRide.startPoint} → {activeJoinedRide.endPoint}</Text>
            <Pressable
              style={({ pressed }) => [ridePickStyles.requestButton, pressed && ridePickStyles.buttonPressed]}
              onPress={() =>
                router.replace({ pathname: "/waiting", params: { ridePostId: activeJoinedRide.ridePostId } })
              }>
              <Text style={ridePickStyles.requestButtonText}>Go to waiting room</Text>
            </Pressable>
          </View>
        ) : null}

        {posts.length === 0 ? (
          <Text style={[styles.description, ridePickStyles.description]}>No joinable rides right now.</Text>
        ) : (
          <View style={styles.postList}>
            {posts.map((post) => {
              const seatsLeft = Math.max(0, post.capacity - post.joinedCount);
              return (
                <View key={post._id} style={ridePickStyles.rideCard}>
                  <View style={ridePickStyles.rideHeaderRow}>
                    <Text style={ridePickStyles.rideRoute}>{post.startPoint} → {post.endPoint}</Text>
                    <View style={ridePickStyles.pricePill}>
                      <Text style={ridePickStyles.pricePillText}>₹{post.vehicleType === "cab" ? "60" : "45"} est.</Text>
                    </View>
                  </View>

                  <Text style={ridePickStyles.rideMeta}>8:30 AM · {VEHICLE_LABELS[post.vehicleType]} · {seatsLeft} seats left</Text>

                  <View style={ridePickStyles.rideFooterRow}>
                    <View style={[styles.personRow, ridePickStyles.riderBlock]}>
                      {post.riderPhotoUrl ? (
                        <Image source={{ uri: post.riderPhotoUrl }} style={styles.personAvatarSmall} />
                      ) : (
                        <View style={styles.personAvatarFallbackSmall}>
                          <Text style={styles.personAvatarFallbackTextSmall}>{post.riderName.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <Text style={ridePickStyles.riderMeta} numberOfLines={1}>{post.riderName} · 4.8</Text>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        ridePickStyles.requestButton,
                        (joiningRideId === post._id || !!activeJoinedRide) && ridePickStyles.buttonDisabled,
                        pressed && !(joiningRideId === post._id || !!activeJoinedRide) && ridePickStyles.buttonPressed,
                      ]}
                      onPress={() => void onJoinRide(post._id)}
                      disabled={joiningRideId === post._id || !!activeJoinedRide}>
                      <Text style={ridePickStyles.requestButtonText}>
                        {joiningRideId === post._id ? "Joining..." : "Request"}
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={() => router.push("/ride-details")} style={ridePickStyles.detailsLinkButton}>
                    <Text style={ridePickStyles.detailsLinkText}>View ride details</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={ridePickStyles.bottomTabBar}>
        <Pressable style={ridePickStyles.tabItem} onPress={() => {}}>
          <Text style={[ridePickStyles.tabText, ridePickStyles.tabTextActive]}>Home</Text>
        </Pressable>
        <Pressable style={ridePickStyles.tabItem} onPress={() => {}}>
          <Text style={ridePickStyles.tabText}>Discover</Text>
        </Pressable>
        <Pressable style={ridePickStyles.tabItem} onPress={() => router.push("/host")}>
          <Text style={ridePickStyles.tabText}>Post</Text>
        </Pressable>
        <Pressable style={ridePickStyles.tabItem} onPress={() => router.push("/profile")}>
          <Text style={ridePickStyles.tabText}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const ridePickStyles = StyleSheet.create({
  screen: {
    backgroundColor: "#2E2E2E",
  },
  boardContent: {
    paddingTop: 10,
<<<<<<< HEAD
    paddingBottom: 96,
    gap: 14,
=======
    paddingBottom: 110,
>>>>>>> origin/main
  },
  greetingWrap: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    marginBottom: 8,
  },
  greetingSmall: {
    color: "#C7CDD9",
<<<<<<< HEAD
    fontSize: 18,
    fontFamily: "InterMedium",
  },
  greetingName: {
    color: "#F3F4F6",
    fontSize: 34,
    lineHeight: 38,
    fontFamily: "InterBold",
=======
    fontSize: 15,
    fontFamily: "GoogleSansFlexMedium",
  },
  greetingName: {
    color: "#F3F4F6",
    fontSize: 38,
    lineHeight: 42,
    fontFamily: "GoogleSansFlexBold",
>>>>>>> origin/main
  },
  heroCard: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    borderRadius: 14,
    backgroundColor: "#1F67BC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    marginBottom: 14,
  },
  heroTitle: {
    color: "#EFF6FF",
    fontSize: 23,
    fontFamily: "GoogleSansFlexBold",
  },
  heroSubtitle: {
    color: "#DCEBFF",
    fontSize: 14,
    fontFamily: "GoogleSansFlexMedium",
  },
  heroActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  heroAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  heroActionPrimary: {
    backgroundColor: "#E8EFF7",
    borderColor: "#E8EFF7",
  },
  heroActionSecondary: {
    backgroundColor: "transparent",
    borderColor: "#8DB7E8",
  },
  heroActionPrimaryText: {
    color: "#1F67BC",
    fontSize: 15,
    fontFamily: "GoogleSansFlexMedium",
  },
  heroActionSecondaryText: {
    color: "#EAF3FF",
    fontSize: 15,
    fontFamily: "GoogleSansFlexMedium",
  },
  sectionTitle: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    color: "#AEB5C0",
    fontSize: 14,
    letterSpacing: 0.6,
    fontFamily: "GoogleSansFlexBold",
    marginBottom: 8,
  },
  filterRow: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#5B6371",
    backgroundColor: "#2A2D33",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: "#EAF3FF",
    borderColor: "#EAF3FF",
  },
  filterChipText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontFamily: "GoogleSansFlexMedium",
  },
  filterChipTextActive: {
    color: "#1E477A",
  },
  description: {
    color: "#D1D5DB",
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  rideCard: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    backgroundColor: "#2A2D33",
    borderColor: "#4B5563",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 7,
  },
  rideHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  rideFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
<<<<<<< HEAD
  routeText: {
    color: "#E5E7EB",
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "InterMedium",
=======
  rideRoute: {
    color: "#F3F4F6",
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "GoogleSansFlexBold",
    flex: 1,
  },
  rideMeta: {
    color: "#C7CDD9",
    fontSize: 13,
    fontFamily: "GoogleSansFlexMedium",
>>>>>>> origin/main
  },
  riderMeta: {
    color: "#C7CDD9",
    fontSize: 13,
    fontFamily: "GoogleSansFlexMedium",
    flexShrink: 1,
  },
<<<<<<< HEAD
  badgeOpen: {
    backgroundColor: "#052E16",
  },
  badgeFull: {
    backgroundColor: "#3F1D1D",
  },
  badgeTextOpen: {
    color: "#86EFAC",
  },
  badgeTextFull: {
    color: "#FCA5A5",
  },
  actionButton: {
=======
  riderBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  pricePill: {
    borderRadius: 999,
    backgroundColor: "#E5F7D9",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pricePillText: {
    color: "#335F2D",
    fontSize: 12,
    fontFamily: "GoogleSansFlexBold",
  },
  requestButton: {
>>>>>>> origin/main
    minHeight: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#1E6CCC",
    minWidth: 92,
  },
  requestButtonText: {
    color: "#EAF3FF",
<<<<<<< HEAD
    fontSize: 16,
    fontFamily: "InterMedium",
=======
    fontSize: 15,
    fontFamily: "GoogleSansFlexMedium",
>>>>>>> origin/main
  },
  detailsLinkButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  detailsLinkText: {
    color: "#8DB7E8",
    fontSize: 12,
    fontFamily: "GoogleSansFlexMedium",
    textDecorationLine: "underline",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  bottomTabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 68,
    backgroundColor: "#2A2D33",
    borderTopWidth: 1,
    borderTopColor: "#4B5563",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  tabText: {
    color: "#A8B0BD",
    fontSize: 13,
    fontFamily: "GoogleSansFlexMedium",
  },
  tabTextActive: {
    color: "#1E6CCC",
  },
});
