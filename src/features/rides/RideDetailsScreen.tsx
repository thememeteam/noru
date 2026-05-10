import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppStyles } from "../theme/AppTheme";

export function RideDetailsScreen() {
  const styles = useAppStyles();
  const params = useLocalSearchParams<{
    ridePostId?: string;
    startPoint?: string;
    endPoint?: string;
    riderName?: string;
    riderPhotoUrl?: string;
    totalPrice?: string;
    rideStartAt?: string;
  }>();
  const startPoint = params.startPoint ?? "Start point";
  const endPoint = params.endPoint ?? "Destination";
  const riderName = params.riderName ?? "Host";
  const riderPhotoUrl = params.riderPhotoUrl ?? null;
  const ridePostId = params.ridePostId;
  const totalPrice = params.totalPrice ? Number(params.totalPrice) : null;
  const fareLabel = Number.isFinite(totalPrice) ? `fare: ${totalPrice}` : "fare: TBD";
  const rideStartAt = params.rideStartAt ? Number(params.rideStartAt) : null;
  const timeLabel = Number.isFinite(rideStartAt)
    ? new Date(rideStartAt as number).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "Time TBD";
  const joinRidePost = useMutation(api.rides.joinRidePost);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{
    name: string;
    photoUrl: string | null;
    registrationNumber: string | null;
  } | null>(null);

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

  const onJoinRide = async () => {
    if (!ridePostId) {
      Alert.alert("Ride unavailable", "This ride is no longer available.");
      return;
    }

    try {
      setIsJoining(true);
      await joinRidePost({ ridePostId: ridePostId as Id<"ridePosts"> });
      router.replace({ pathname: "/waiting", params: { ridePostId } });
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
      <SafeAreaView style={styles.safeArea}>  
        <ScrollView contentContainerStyle={styles.boardContent}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Ride details</Text>

            <View style={detailStyles.mapCard}>
              <Text style={detailStyles.mapTitle}>Route preview</Text>
              <Text style={detailStyles.mapSubtitle}>{startPoint} → {endPoint}</Text>
            </View>

            <View style={detailStyles.infoRow}><Text style={styles.postMeta}>Departure</Text><Text style={styles.postName}>{timeLabel}</Text></View>
            <View style={detailStyles.infoRow}><Text style={styles.postMeta}>Vehicle</Text><Text style={styles.postName}>Auto (booked by host)</Text></View>
            <View style={detailStyles.infoRow}><Text style={styles.postMeta}>Seats available</Text><Text style={styles.postName}>2 of 3</Text></View>
            <View style={detailStyles.infoRow}><Text style={styles.postMeta}>Fare</Text><Text style={detailStyles.farePill}>{fareLabel}</Text></View>

            <Text style={styles.sectionLabel}>Host</Text>
            <View style={styles.postItem}>
              <View style={styles.personRow}>
                <Pressable
                  onPress={() =>
                    setSelectedProfile({
                      name: riderName,
                      photoUrl: riderPhotoUrl,
                      registrationNumber: extractRegistrationNumber(riderName, null),
                    })
                  }>
                  {riderPhotoUrl ? (
                    <Image source={{ uri: riderPhotoUrl }} style={styles.personAvatarSmall} />
                  ) : (
                    <View style={styles.personAvatarFallbackSmall}>
                      <Text style={styles.personAvatarFallbackTextSmall}>{riderName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                </Pressable>
                <Text style={styles.postName}>{riderName}</Text>
              </View>
              <View style={styles.quickRow}>
                <Pressable onPress={() => {}} style={detailStyles.tagChip}><Text style={detailStyles.tagChipText}>Punctual</Text></Pressable>
                <Pressable onPress={() => {}} style={detailStyles.tagChip}><Text style={detailStyles.tagChipText}>Good music</Text></Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                detailStyles.requestButton,
                isJoining && detailStyles.requestButtonDisabled,
                pressed && !isJoining && detailStyles.requestButtonPressed,
              ]}
              onPress={() => void onJoinRide()}
              disabled={isJoining}>
              <Text style={detailStyles.requestButtonText}>
                {isJoining ? "Requesting..." : "Request to join"}
              </Text>
            </Pressable>

            <Text style={styles.postMeta}>Payment is settled peer-to-peer outside the app.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>

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

const detailStyles = StyleSheet.create({
  mapCard: {
    borderWidth: 1,
    borderColor: "#9DBA7E",
    backgroundColor: "#DCEBCE",
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  mapTitle: {
    color: "#335F2D",
    fontSize: 13,
    fontFamily: "GoogleSansFlexBold",
  },
  mapSubtitle: {
    color: "#335F2D",
    fontSize: 12,
    fontFamily: "GoogleSansFlexMedium",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  farePill: {
    color: "#335F2D",
    backgroundColor: "#E5F7D9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontFamily: "GoogleSansFlexBold",
  },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#8DB7E8",
    backgroundColor: "#EAF3FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagChipText: {
    color: "#1E477A",
    fontSize: 12,
    fontFamily: "GoogleSansFlexMedium",
  },
  requestButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#1E6CCC",
    alignItems: "center",
    justifyContent: "center",
  },
  requestButtonPressed: {
    opacity: 0.88,
  },
  requestButtonDisabled: {
    opacity: 0.6,
  },
  requestButtonText: {
    color: "#EAF3FF",
    fontSize: 16,
    fontFamily: "GoogleSansFlexMedium",
  },
});
