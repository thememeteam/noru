import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";
import { VEHICLE_LABELS } from "./constants";

export function WaitingRoomScreen() {
  const styles = useAppStyles();
  const params = useLocalSearchParams<{ ridePostId?: string }>();
  const ridePostId = params.ridePostId;

  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const stopRidePost = useMutation(api.rides.stopRidePost);
  const removeJoineeFromRide = useMutation(api.rides.removeJoineeFromRide);
  const leaveRidePost = useMutation(api.rides.leaveRidePost);
  const markNotificationRead = useMutation(api.rides.markNotificationRead);
  const unreadNotifications = useQuery(api.rides.getMyUnreadNotifications);
  const hostedRideData = useQuery(
    api.rides.getHostedRidePost,
    ridePostId ? { ridePostId: ridePostId as Id<"ridePosts"> } : "skip",
  );
  const joinedRideData = useQuery(
    api.rides.getJoinedRidePost,
    ridePostId ? { ridePostId: ridePostId as Id<"ridePosts"> } : "skip",
  );

  const [stoppingRideId, setStoppingRideId] = useState<string | null>(null);
  const [cancellingRideId, setCancellingRideId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{
    name: string;
    email: string | null;
    photoUrl: string | null;
    ratingAverage: number | null;
    ratingCount: number;
  } | null>(null);

  useEffect(() => {
    if (!ridePostId || (onboarding && !onboarding.isCompleted)) {
      router.navigate("/");
    }
  }, [onboarding, ridePostId]);

  useEffect(() => {
    if (!joinedRideData || !ridePostId) {
      return;
    }
    if (joinedRideData.ridePost.isStopped) {
      router.replace({ pathname: "/feedback", params: { ridePostId } });
    }
  }, [joinedRideData, ridePostId]);

  useEffect(() => {
    if (!unreadNotifications || unreadNotifications.length === 0) {
      return;
    }

    const notification = unreadNotifications[0];
    Alert.alert(notification.title, notification.message, [
      {
        text: "OK",
        onPress: () => {
          void markNotificationRead({ notificationId: notification._id });
          if (notification.type === "rideRemoved") {
            router.replace("/");
          }
        },
      },
    ]);
  }, [markNotificationRead, unreadNotifications]);

  const onStopRide = async (id: string) => {
    try {
      setStoppingRideId(id);
      await stopRidePost({ ridePostId: id as Id<"ridePosts"> });
      router.replace({ pathname: "/feedback", params: { ridePostId: id } });
    } catch (error) {
      Alert.alert(
        "Could not end ride",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setStoppingRideId(null);
    }
  };

  const onCancelRide = async (id: string) => {
    try {
      setCancellingRideId(id);
      await stopRidePost({ ridePostId: id as Id<"ridePosts"> });
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Could not cancel ride",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setCancellingRideId(null);
    }
  };

  const onLeaveRide = async (id: string) => {
    try {
      setIsLeaving(true);
      await leaveRidePost({ ridePostId: id as Id<"ridePosts"> });
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Could not leave ride",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsLeaving(false);
    }
  };

  const onRemoveJoinee = async (joineeUserId: string) => {
    if (!ridePostId) {
      return;
    }

    try {
      setRemovingUserId(joineeUserId);
      await removeJoineeFromRide({
        ridePostId: ridePostId as Id<"ridePosts">,
        joineeUserId: joineeUserId as Id<"users">,
      });
    } catch (error) {
      Alert.alert(
        "Could not remove participant",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setRemovingUserId(null);
    }
  };

  if (!ridePostId || onboarding === undefined || !onboarding?.isCompleted) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1E6CCC" />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Waiting room</Text>
            {hostedRideData === undefined || joinedRideData === undefined ? (
              <Text style={styles.description}>Loading ride details...</Text>
            ) : hostedRideData ? (
              <>
                <View style={waitingStyles.summaryCard}>
                  <Text style={[styles.postName, waitingStyles.routeText]}>
                    {hostedRideData.ridePost.startPoint} → {hostedRideData.ridePost.endPoint}
                  </Text>
                  <Text style={[styles.postMeta, waitingStyles.metaText]}>
                    {VEHICLE_LABELS[hostedRideData.ridePost.vehicleType]} · {hostedRideData.ridePost.capacity} seats offered
                  </Text>
                  <View style={waitingStyles.pillRow}>
                    <View style={[styles.badge, waitingStyles.pendingPill]}>
                      <Text style={[styles.badgeText, waitingStyles.pendingPillText]}>
                        {hostedRideData.ridePost.joinedCount} joined
                      </Text>
                    </View>
                    <View style={[styles.badge, waitingStyles.acceptedPill]}>
                      <Text style={[styles.badgeText, waitingStyles.acceptedPillText]}>
                        {Math.max(0, hostedRideData.ridePost.capacity - hostedRideData.ridePost.joinedCount)} seats left
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.sectionLabel, waitingStyles.sectionHeading]}>PARTICIPANTS</Text>
                {hostedRideData.joinees.length === 0 ? (
                  <Text style={styles.description}>No one has joined yet.</Text>
                ) : (
                  <View style={styles.postList}>
                    {hostedRideData.joinees.map((joinee) => (
                      <View key={joinee._id} style={[styles.postItem, waitingStyles.participantCard]}>
                        <View style={styles.personRow}>
                          <Pressable
                            onPress={() =>
                              setSelectedProfile({
                                name: joinee.joineeName,
                                email: joinee.joineeEmail,
                                photoUrl: joinee.joineePhotoUrl,
                                ratingAverage: joinee.ratingAverage,
                                ratingCount: joinee.ratingCount,
                              })
                            }>
                            {joinee.joineePhotoUrl ? (
                              <Image source={{ uri: joinee.joineePhotoUrl }} style={styles.personAvatarSmall} />
                            ) : (
                              <View style={styles.personAvatarFallbackSmall}>
                                <Text style={styles.personAvatarFallbackTextSmall}>U</Text>
                              </View>
                            )}
                          </Pressable>
                          <View style={waitingStyles.participantTextWrap}>
                            <Text style={styles.postName}>{joinee.joineeName}</Text>
                            <Text style={styles.postMeta}>{joinee.joineeEmail ?? "No email"}</Text>
                          </View>
                        </View>
                        <Pressable
                          style={({ pressed }) => [
                            waitingStyles.inlineActionButton,
                            removingUserId === joinee.userId && waitingStyles.inlineActionButtonDisabled,
                            pressed && removingUserId !== joinee.userId && styles.buttonPressed,
                          ]}
                          onPress={() => void onRemoveJoinee(String(joinee.userId))}
                          disabled={removingUserId === joinee.userId}>
                          <Text style={waitingStyles.inlineActionButtonText}>
                            {removingUserId === joinee.userId ? "Removing..." : "Remove"}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                <View style={waitingStyles.hostActionRow}>
                  <Pressable
                    style={({ pressed }) => [
                      waitingStyles.stopRideButton,
                      waitingStyles.cancelRideButton,
                      cancellingRideId === hostedRideData.ridePost._id && waitingStyles.stopRideButtonDisabled,
                      pressed && cancellingRideId !== hostedRideData.ridePost._id && styles.buttonPressed,
                    ]}
                    onPress={() => void onCancelRide(hostedRideData.ridePost._id)}
                    disabled={cancellingRideId === hostedRideData.ridePost._id || stoppingRideId === hostedRideData.ridePost._id}>
                    <Text style={waitingStyles.cancelRideButtonText}>
                      {cancellingRideId === hostedRideData.ridePost._id ? "Cancelling..." : "Cancel ride"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      waitingStyles.stopRideButton,
                      waitingStyles.endRideButton,
                      stoppingRideId === hostedRideData.ridePost._id && waitingStyles.stopRideButtonDisabled,
                      pressed && stoppingRideId !== hostedRideData.ridePost._id && styles.buttonPressed,
                    ]}
                    onPress={() => void onStopRide(hostedRideData.ridePost._id)}
                    disabled={stoppingRideId === hostedRideData.ridePost._id || cancellingRideId === hostedRideData.ridePost._id}>
                    <Text style={waitingStyles.stopRideButtonText}>
                      {stoppingRideId === hostedRideData.ridePost._id ? "Ending..." : "End ride"}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : joinedRideData ? (
              <>
                <View style={waitingStyles.summaryCard}>
                  <Text style={[styles.postName, waitingStyles.routeText]}>
                    {joinedRideData.ridePost.startPoint} → {joinedRideData.ridePost.endPoint}
                  </Text>
                  <Text style={[styles.postMeta, waitingStyles.metaText]}>
                    {VEHICLE_LABELS[joinedRideData.ridePost.vehicleType]} · {joinedRideData.ridePost.joinedCount}/{joinedRideData.ridePost.capacity} joined
                  </Text>
                </View>

                <Text style={[styles.sectionLabel, waitingStyles.sectionHeading]}>HOST</Text>
                <View style={[styles.postItem, waitingStyles.participantCard]}>
                  <View style={styles.personRow}>
                    <Pressable
                      onPress={() =>
                        setSelectedProfile({
                          name: joinedRideData.host.name,
                          email: joinedRideData.host.email,
                          photoUrl: joinedRideData.host.photoUrl,
                          ratingAverage: joinedRideData.host.ratingAverage,
                          ratingCount: joinedRideData.host.ratingCount,
                        })
                      }>
                      {joinedRideData.host.photoUrl ? (
                        <Image source={{ uri: joinedRideData.host.photoUrl }} style={styles.personAvatarSmall} />
                      ) : (
                        <View style={styles.personAvatarFallbackSmall}>
                          <Text style={styles.personAvatarFallbackTextSmall}>U</Text>
                        </View>
                      )}
                    </Pressable>
                    <View style={waitingStyles.participantTextWrap}>
                      <Text style={styles.postName}>{joinedRideData.host.name}</Text>
                      <Text style={styles.postMeta}>{joinedRideData.host.email ?? "No email"}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.sectionLabel, waitingStyles.sectionHeading]}>PARTICIPANTS</Text>
                {joinedRideData.joinees.length === 0 ? (
                  <Text style={styles.description}>No participants yet.</Text>
                ) : (
                  <View style={styles.postList}>
                    {joinedRideData.joinees.map((joinee) => (
                      <View key={joinee._id} style={[styles.postItem, waitingStyles.participantCard]}>
                        <View style={styles.personRow}>
                          <Pressable
                            onPress={() =>
                              setSelectedProfile({
                                name: joinee.joineeName,
                                email: joinee.joineeEmail,
                                photoUrl: joinee.joineePhotoUrl,
                                ratingAverage: joinee.ratingAverage,
                                ratingCount: joinee.ratingCount,
                              })
                            }>
                            {joinee.joineePhotoUrl ? (
                              <Image source={{ uri: joinee.joineePhotoUrl }} style={styles.personAvatarSmall} />
                            ) : (
                              <View style={styles.personAvatarFallbackSmall}>
                                <Text style={styles.personAvatarFallbackTextSmall}>U</Text>
                              </View>
                            )}
                          </Pressable>
                          <View style={waitingStyles.participantTextWrap}>
                            <Text style={styles.postName}>{joinee.joineeName}</Text>
                            <Text style={styles.postMeta}>{joinee.joineeEmail ?? "No email"}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <AppButton
                  title={isLeaving ? "Leaving..." : "Leave ride"}
                  onPress={() => void onLeaveRide(joinedRideData.ridePost._id)}
                  disabled={isLeaving}
                  variant="secondary"
                />
              </>
            ) : (
              <Text style={styles.description}>This ride is no longer active.</Text>
            )}
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
                    <Text style={styles.postMeta}>{selectedProfile.email ?? "No email found"}</Text>
                    <Text style={styles.postMeta}>Rating: {selectedProfile.ratingAverage ?? "N/A"}</Text>
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

const waitingStyles = StyleSheet.create({
  summaryCard: {
    borderWidth: 1,
    borderColor: "#4B5563",
    backgroundColor: "#2A2D33",
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  routeText: {
    fontSize: 20,
    lineHeight: 27,
  },
  metaText: {
    color: "#D1D5DB",
    fontSize: 14,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  pendingPill: {
    backgroundColor: "#EAF3FF",
  },
  pendingPillText: {
    color: "#1E477A",
  },
  acceptedPill: {
    backgroundColor: "#E5F7D9",
  },
  acceptedPillText: {
    color: "#335F2D",
  },
  sectionHeading: {
    marginTop: 2,
    fontSize: 14,
    letterSpacing: 0.6,
    color: "#B8C0CC",
  },
  participantCard: {
    backgroundColor: "#2A2D33",
    borderColor: "#4B5563",
    borderRadius: 12,
    paddingVertical: 10,
    gap: 10,
  },
  participantTextWrap: {
    flex: 1,
    gap: 2,
  },
  inlineActionButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    minWidth: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#697284",
    backgroundColor: "#3A3F47",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  inlineActionButtonText: {
    color: "#EAF3FF",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  inlineActionButtonDisabled: {
    opacity: 0.55,
  },
  stopRideButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#7F1D1D",
    backgroundColor: "#3F1D1D",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stopRideButtonText: {
    color: "#FECACA",
    fontSize: 17,
    fontFamily: "InterMedium",
  },
  stopRideButtonDisabled: {
    opacity: 0.6,
  },
  hostActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  cancelRideButton: {
    flex: 1,
    borderColor: "#374151",
    backgroundColor: "#2A2D33",
  },
  cancelRideButtonText: {
    color: "#9CA3AF",
    fontSize: 17,
    fontFamily: "InterMedium",
  },
  endRideButton: {
    flex: 1,
  },
});
