import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAppStyles } from "../theme/AppTheme";
import { VEHICLE_LABELS, type VehicleType } from "./constants";

export function RideDetailsScreen() {
  const styles = useAppStyles();
  const params = useLocalSearchParams<{
    ridePostId?: string;
    startPoint?: string;
    endPoint?: string;
    riderName?: string;
    riderPhotoUrl?: string;
    vehicleType?: string;
    seatsLeft?: string;
    totalPrice?: string;
    rideStartAt?: string;
    womenOnly?: string;
    quietRide?: string;
  }>();

  const startPoint = params.startPoint ?? "Start point";
  const endPoint = params.endPoint ?? "Destination";
  const riderName = params.riderName ?? "Host";
  const riderPhotoUrl = params.riderPhotoUrl ?? null;
  const ridePostId = params.ridePostId;
  const vehicleLabel = params.vehicleType
    ? VEHICLE_LABELS[params.vehicleType as VehicleType] ?? params.vehicleType
    : null;
  const seatsLeft = params.seatsLeft !== undefined ? Number(params.seatsLeft) : null;
  const totalPrice = params.totalPrice ? Number(params.totalPrice) : null;
  const rideStartAt = params.rideStartAt ? Number(params.rideStartAt) : null;
  const womenOnly = params.womenOnly === "1";
  const quietRide = params.quietRide === "1";

  const timeLabel = (() => {
    if (!Number.isFinite(rideStartAt) || rideStartAt === null) return null;
    const date = new Date(rideStartAt);
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const dayDiff = Math.round((dateMidnight - todayMidnight) / 86400000);
    if (dayDiff === 0) return time;
    if (dayDiff === 1) return `Tomorrow · ${time}`;
    return `${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
  })();

  const metaParts = [
    vehicleLabel,
    timeLabel,
    totalPrice && Number.isFinite(totalPrice) ? `₹${totalPrice}` : null,
  ].filter(Boolean);

  const joinRidePost = useMutation(api.rides.joinRidePost);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{
    name: string;
    photoUrl: string | null;
    registrationNumber: string | null;
  } | null>(null);

  const extractRegistrationNumber = (name: string) => {
    const bracketMatch = name.match(/\[([^\]]+)\]/);
    if (bracketMatch?.[1]) {
      return bracketMatch[1].trim();
    }
    return null;
  };

  const onJoinRide = async () => {
    if (!ridePostId) {
      Alert.alert("Ride unavailable", "This ride is no longer available.");
      return;
    }

    try {
      setIsJoining(true);
      await joinRidePost({ ridePostId: ridePostId as Id<"ridePosts"> });
      router.push({ pathname: "/waiting", params: { ridePostId } });
    } catch (error) {
      Alert.alert(
        "Could not join ride",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView edges={["bottom"]} style={[styles.safeArea, { paddingHorizontal: 0 }]}>
        <ScrollView contentContainerStyle={[styles.boardContent, { paddingHorizontal: 16 }]}>

          <View style={detailStyles.summaryCard}>
            <Text style={detailStyles.routeText}>{startPoint} → {endPoint}</Text>
            {metaParts.length > 0 && (
              <Text style={detailStyles.metaText}>{metaParts.join(" · ")}</Text>
            )}
            {(seatsLeft !== null || womenOnly || quietRide) && (
              <View style={detailStyles.pillRow}>
                {seatsLeft !== null && (
                  <View style={detailStyles.seatsPill}>
                    <Text style={detailStyles.seatsPillText}>{seatsLeft} seats left</Text>
                  </View>
                )}
                {womenOnly && (
                  <View style={detailStyles.womenOnlyPill}>
                    <Text style={detailStyles.womenOnlyPillText}>Women only</Text>
                  </View>
                )}
                {quietRide && (
                  <View style={detailStyles.quietPill}>
                    <Text style={detailStyles.quietPillText}>Quiet ride</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <Text style={detailStyles.sectionHeading}>HOST</Text>
          <View style={detailStyles.hostCard}>
            <Pressable
              onPress={() =>
                setSelectedProfile({
                  name: riderName,
                  photoUrl: riderPhotoUrl,
                  registrationNumber: extractRegistrationNumber(riderName),
                })
              }>
              {riderPhotoUrl ? (
                <Image source={{ uri: riderPhotoUrl }} style={styles.personAvatarSmall} />
              ) : (
                <View style={styles.personAvatarFallbackSmall}>
                  <Text style={styles.personAvatarFallbackTextSmall}>
                    {riderName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>
            <Text style={styles.postName}>{riderName}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              detailStyles.joinButton,
              isJoining && styles.buttonDisabled,
              pressed && !isJoining && styles.buttonPressed,
            ]}
            onPress={() => void onJoinRide()}
            disabled={isJoining}>
            <Text style={detailStyles.joinButtonText}>
              {isJoining ? "Requesting..." : "Request to join"}
            </Text>
          </Pressable>

          <Text style={detailStyles.footnote}>Payment is settled peer-to-peer outside the app.</Text>

        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={!!selectedProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProfile(null)}>
        <Pressable style={styles.overlayBackdrop} onPress={() => setSelectedProfile(null)}>
          <Pressable style={styles.overlayCard} onPress={() => {}}>
            {selectedProfile && (
              <>
                <Text style={styles.sectionLabel}>Profile details</Text>
                <View style={styles.personRow}>
                  {selectedProfile.photoUrl ? (
                    <Image source={{ uri: selectedProfile.photoUrl }} style={styles.overlayProfileAvatar} />
                  ) : (
                    <View style={styles.overlayProfileAvatarFallback}>
                      <Text style={styles.overlayProfileAvatarFallbackText}>
                        {selectedProfile.name.charAt(0).toUpperCase()}
                      </Text>
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
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  summaryCard: {
    borderWidth: 1,
    borderColor: "#383838",
    backgroundColor: "#222222",
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  routeText: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 27,
    fontFamily: "InterBold",
  },
  metaText: {
    color: "#8A8A8A",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  seatsPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#052E16",
  },
  seatsPillText: {
    color: "#86EFAC",
    fontSize: 12,
    fontFamily: "InterBold",
  },
  womenOnlyPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#1A2C45",
  },
  womenOnlyPillText: {
    color: "#93C5FD",
    fontSize: 12,
    fontFamily: "InterBold",
  },
  quietPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#1A1F2E",
  },
  quietPillText: {
    color: "#818CF8",
    fontSize: 12,
    fontFamily: "InterBold",
  },
  sectionHeading: {
    color: "#8A8A8A",
    fontSize: 12,
    letterSpacing: 0.8,
    fontFamily: "InterBold",
    textTransform: "uppercase",
  },
  hostCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#383838",
    backgroundColor: "#222222",
    borderRadius: 16,
    padding: 14,
  },
  joinButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#276EF1",
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "InterBold",
  },
  footnote: {
    color: "#606060",
    fontSize: 13,
    fontFamily: "InterMedium",
    textAlign: "center",
  },
});
