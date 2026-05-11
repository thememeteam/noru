import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { deriveDisplayName, getAvatarInitial } from "../../lib/userDisplay";
import { useAppStyles } from "../theme/AppTheme";
import { VEHICLE_LABELS, VEHICLE_OPTIONS } from "./constants";

function formatRideTime(rideStartAt?: number | null) {
  if (!rideStartAt || !Number.isFinite(rideStartAt)) {
    return null;
  }

  const date = new Date(rideStartAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function RidePickScreen() {
  const styles = useAppStyles();
  const onboardingState = useQuery(api.onboarding.getOnboardingState);
  const posts = useQuery(api.rides.listJoinableRidePosts) ?? [];
  const activeJoinedRide = useQuery(api.rides.getMyActiveJoinedRide);
  const activeHostedRide = useQuery(api.rides.getMyActiveHostedRide);
  const joinRidePost = useMutation(api.rides.joinRidePost);
  const scrollRef = useRef<ScrollView>(null);

  const [joiningRideId, setJoiningRideId] = useState<string | null>(null);
  const [discoverTargetY, setDiscoverTargetY] = useState(0);
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);
  const [womenOnlyFilter, setWomenOnlyFilter] = useState(false);
  const [quietRideFilter, setQuietRideFilter] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{
    name: string;
    photoUrl: string | null;
    registrationNumber: string | null;
  } | null>(null);
  const displayName = deriveDisplayName(onboardingState?.displayName, onboardingState?.universityEmail);
  const firstName = displayName.split(" ")[0] || "Student";
  const avatarInitial = getAvatarInitial(displayName);
  const userGender = (onboardingState as any)?.gender as string | null | undefined;
  const canSeeWomenOnly = userGender === "female" || userGender === "nonBinary";
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const dayGreeting = minutesNow <= 11 * 60
    ? "Good morning,"
    : minutesNow <= 16 * 60
      ? "Good afternoon,"
      : "Good evening,";

  const extractRegistrationNumber = (name: string, email?: string | null) => {
    const bracketMatch = name.match(/\[([^\]]+)\]/);
    if (bracketMatch && bracketMatch[1]) {
      return bracketMatch[1].trim();
    }

    if (email) {
      const emailHandle = email.split("@")[0]?.trim();
      return emailHandle || null;
    }

    return null;
  };

  const onJoinRide = async (ridePostId: string) => {
    try {
      setJoiningRideId(ridePostId);
      await joinRidePost({ ridePostId: ridePostId as Id<"ridePosts"> });
      router.push({ pathname: "/waiting", params: { ridePostId } });
    } catch (error) {
      Alert.alert(
        "Could not join ride",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setJoiningRideId(null);
    }
  };

  const onDiscoverPress = () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, discoverTargetY - 8), animated: true });
  };

  const onHostPress = () => {
    if (activeHostedRide) {
      Alert.alert(
        "You already have an active ride",
        "Open your waiting room to manage the riders.",
        [
          {
            text: "Go to waiting room",
            onPress: () =>
              router.replace({ pathname: "/waiting", params: { ridePostId: activeHostedRide.ridePostId } }),
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }

    router.push("/host");
  };

  return (
    <View style={[styles.pickScreenContainer, ridePickStyles.screen]}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.boardContent, ridePickStyles.boardContent]}>
        <View style={ridePickStyles.greetingWrap}>
          <View style={ridePickStyles.greetingTextCol}>
            <Text style={ridePickStyles.greetingSmall}>{dayGreeting}</Text>
            <Text style={ridePickStyles.greetingName}>{firstName}</Text>
          </View>
          <Pressable onPress={() => router.push("/profile")}>
            {onboardingState?.profilePhotoUrl ? (
              <Image source={{ uri: onboardingState.profilePhotoUrl }} style={ridePickStyles.profileAvatar} />
            ) : (
              <View style={ridePickStyles.profileAvatarFallback}>
                <Text style={ridePickStyles.profileAvatarFallbackText}>{avatarInitial}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={ridePickStyles.heroCard}>
          <Text style={ridePickStyles.heroTitle}>Time to head to campus?</Text>
          <View style={ridePickStyles.heroActionRow}>
            <Pressable
              style={({ pressed }) => [
                ridePickStyles.heroAction,
                ridePickStyles.heroActionPrimary,
                pressed && ridePickStyles.buttonPressed,
              ]}
              onPress={onHostPress}>
              <Text style={ridePickStyles.heroActionPrimaryText}>Host a ride</Text>
            </Pressable>
          </View>
        </View>

        <View style={ridePickStyles.filterSection} onLayout={(event) => setDiscoverTargetY(event.nativeEvent.layout.y)}>
          <Text style={ridePickStyles.sectionTitle}>AVAILABLE RIDES</Text>

          <View style={ridePickStyles.filterRow}>
            {canSeeWomenOnly && (
              <Pressable
                style={[ridePickStyles.filterChip, womenOnlyFilter && ridePickStyles.filterChipActive]}
                onPress={() => setWomenOnlyFilter(!womenOnlyFilter)}>
                <Text style={[ridePickStyles.filterChipText, womenOnlyFilter && ridePickStyles.filterChipTextActive]}>
                  Women only
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[ridePickStyles.filterChip, quietRideFilter && ridePickStyles.filterChipActive]}
              onPress={() => setQuietRideFilter(!quietRideFilter)}>
              <Text style={[ridePickStyles.filterChipText, quietRideFilter && ridePickStyles.filterChipTextActive]}>
                Quiet ride
              </Text>
            </Pressable>
          </View>

          <View style={ridePickStyles.filterRow}>
            {VEHICLE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[ridePickStyles.filterChip, vehicleFilter === option && ridePickStyles.filterChipActive]}
                onPress={() => setVehicleFilter(vehicleFilter === option ? null : option)}>
                <Text style={[ridePickStyles.filterChipText, vehicleFilter === option && ridePickStyles.filterChipTextActive]}>
                  {VEHICLE_LABELS[option]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {activeHostedRide ? (
          <View style={ridePickStyles.rideCard}>
            <Text style={ridePickStyles.rideRoute}>You are hosting a ride</Text>
            <Text style={ridePickStyles.rideMeta}>
              {activeHostedRide.startPoint} → {activeHostedRide.endPoint}
            </Text>
            <Pressable
              style={({ pressed }) => [ridePickStyles.requestButton, pressed && ridePickStyles.buttonPressed]}
              onPress={() =>
                router.push({ pathname: "/waiting", params: { ridePostId: activeHostedRide.ridePostId } })
              }>
              <Text style={ridePickStyles.requestButtonText}>Go to waiting room</Text>
            </Pressable>
          </View>
        ) : activeJoinedRide ? (
          <View style={ridePickStyles.rideCard}>
            <Text style={ridePickStyles.rideRoute}>You are currently in a ride</Text>
            <Text style={ridePickStyles.rideMeta}>{activeJoinedRide.startPoint} → {activeJoinedRide.endPoint}</Text>
            <Pressable
              style={({ pressed }) => [ridePickStyles.requestButton, pressed && ridePickStyles.buttonPressed]}
              onPress={() =>
                router.push({ pathname: "/waiting", params: { ridePostId: activeJoinedRide.ridePostId } })
              }>
              <Text style={ridePickStyles.requestButtonText}>Go to waiting room</Text>
            </Pressable>
          </View>
        ) : null}

        {(() => {
          const filteredPosts = posts.filter((post) => {
            if (vehicleFilter && post.vehicleType !== vehicleFilter) return false;
            if (womenOnlyFilter && !(post as any).womenOnly) return false;
            if (quietRideFilter && !(post as any).quietRide) return false;
            return true;
          });

          if (posts.length === 0) {
            return <Text style={[styles.description, ridePickStyles.description]}>No joinable rides right now.</Text>;
          }
          if (filteredPosts.length === 0) {
            return <Text style={[styles.description, ridePickStyles.description]}>No rides match the selected filters.</Text>;
          }

          return (
            <View style={styles.postList}>
              {filteredPosts.map((post) => {
                const seatsLeft = Math.max(0, post.capacity - post.joinedCount);
                const totalPrice = (post as any).totalPrice as number | undefined;
                const rideStartAt = (post as any).rideStartAt as number | undefined;
                const timeLabel = formatRideTime(rideStartAt) ?? "8:30 AM";
                const priceLabel = totalPrice && Number.isFinite(totalPrice)
                  ? `fare: ₹${totalPrice}`
                  : "fare: TBD";
                return (
                  <View
                    key={post._id}
                    style={ridePickStyles.rideCard}>
                    <View style={ridePickStyles.rideHeaderRow}>
                      <Text style={ridePickStyles.rideRoute}>{post.startPoint} → {post.endPoint}</Text>
                      <View style={ridePickStyles.pricePill}>
                        <Text style={ridePickStyles.pricePillText}>{priceLabel}</Text>
                      </View>
                    </View>

                    <Text style={ridePickStyles.rideMeta}>
                      {timeLabel} · {VEHICLE_LABELS[post.vehicleType]} · {seatsLeft} seats left
                    </Text>

                    <View style={ridePickStyles.rideFooterRow}>
                      <View style={[styles.personRow, ridePickStyles.riderBlock]}>
                        <Pressable
                          onPress={() =>
                            setSelectedProfile({
                              name: post.riderName,
                              photoUrl: post.riderPhotoUrl ?? null,
                              registrationNumber: extractRegistrationNumber(post.riderName, null),
                            })
                          }>
                          {post.riderPhotoUrl ? (
                            <Image source={{ uri: post.riderPhotoUrl }} style={styles.personAvatarSmall} />
                          ) : (
                            <View style={styles.personAvatarFallbackSmall}>
                              <Text style={styles.personAvatarFallbackTextSmall}>
                                {post.riderName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </Pressable>
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
                  </View>
                );
              })}
            </View>
          );
        })()}
      </ScrollView>

      <Modal visible={!!selectedProfile} transparent animationType="fade" onRequestClose={() => setSelectedProfile(null)}>
        <Pressable style={styles.overlayBackdrop} onPress={() => setSelectedProfile(null)}>
          <Pressable style={styles.overlayCard} onPress={() => {}}>
            {selectedProfile ? (
              <>
                <Text style={styles.sectionLabel}>Profile details</Text>
                <View style={styles.personRow}>
                  {selectedProfile.photoUrl ? (
                    <Image source={{ uri: selectedProfile.photoUrl }} style={styles.overlayProfileAvatar} />
                  ) : (
                    <View style={styles.overlayProfileAvatarFallback}>
                      <Text style={styles.overlayProfileAvatarFallbackText}>U</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.postName}>{selectedProfile.name}</Text>
                    <Text style={styles.postMeta}>
                      Reg. no.: {selectedProfile.registrationNumber ?? "N/A"}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const ridePickStyles = StyleSheet.create({
  screen: {
    backgroundColor: "#2E2E2E",
  },
  boardContent: {
    paddingTop: 20,
    paddingBottom: 32,
  },
  greetingWrap: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  greetingTextCol: {
    flex: 1,
  },
  greetingSmall: {
    color: "#C7CDD9",
    fontSize: 15,
    fontFamily: "InterMedium",
  },
  greetingName: {
    color: "#F3F4F6",
    fontSize: 38,
    lineHeight: 42,
    fontFamily: "InterBold",
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#60A5FA",
  },
  profileAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#60A5FA",
    backgroundColor: "#1F3654",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarFallbackText: {
    color: "#DBEAFE",
    fontSize: 14,
    fontFamily: "InterBold",
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
    fontFamily: "InterBold",
  },
  heroSubtitle: {
    color: "#DCEBFF",
    fontSize: 14,
    fontFamily: "InterMedium",
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
  heroActionPrimaryText: {
    color: "#1F67BC",
    fontSize: 15,
    fontFamily: "InterBold",
  },
  filterSection: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    gap: 6,
  },
  sectionTitle: {
    color: "#AEB5C0",
    fontSize: 14,
    letterSpacing: 0.6,
    fontFamily: "InterBold",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    backgroundColor: "#1F3654",
    borderColor: "#60A5FA",
  },
  filterChipText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  filterChipTextActive: {
    color: "#DBEAFE",
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
  rideRoute: {
    color: "#F3F4F6",
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "InterBold",
    flex: 1,
  },
  rideMeta: {
    color: "#C7CDD9",
    fontSize: 13,
    fontFamily: "InterMedium",
  },
  riderMeta: {
    color: "#C7CDD9",
    fontSize: 13,
    fontFamily: "InterMedium",
    flexShrink: 1,
  },
  riderBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  pricePill: {
    borderRadius: 999,
    backgroundColor: "#052E16",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pricePillText: {
    color: "#86EFAC",
    fontSize: 12,
    fontFamily: "InterBold",
  },
  requestButton: {
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
    fontSize: 15,
    fontFamily: "InterBold",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
