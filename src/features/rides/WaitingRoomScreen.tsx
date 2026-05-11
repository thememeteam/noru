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

export function WaitingRoomScreen() {
  const styles = useAppStyles();
  const params = useLocalSearchParams<{ ridePostId?: string }>();
  const ridePostId = params.ridePostId;

  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const stopRidePost = useMutation(api.rides.stopRidePost);
  const startRidePost = useMutation(api.rides.startRidePost);
  const acceptJoineeForRide = useMutation(api.rides.acceptJoineeForRide);
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
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
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
      if (joinedRideData.ridePost.stopReason === "ended" && joinedRideData.joinStatus === "accepted") {
        router.replace({ pathname: "/feedback", params: { ridePostId } });
      }
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

  const onStopRide = async (id: string, showFeedback: boolean) => {
    try {
      setStoppingRideId(id);
      await stopRidePost({ ridePostId: id as Id<"ridePosts">, reason: showFeedback ? "ended" : "cancelled" });
      if (showFeedback) {
        router.replace({ pathname: "/feedback", params: { ridePostId: id } });
      } else {
        router.replace("/");
      }
    } catch (error) {
      Alert.alert(
        "Could not stop ride",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setStoppingRideId(null);
    }
  };

  const onStartRide = async (id: string) => {
    try {
      setStoppingRideId(id);
      await startRidePost({ ridePostId: id as Id<"ridePosts"> });
    } catch (error) {
      Alert.alert(
        "Could not start ride",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setStoppingRideId(null);
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

  const onAcceptJoinee = async (joineeUserId: string) => {
    if (!ridePostId) {
      return;
    }

    try {
      await acceptJoineeForRide({
        ridePostId: ridePostId as Id<"ridePosts">,
        joineeUserId: joineeUserId as Id<"users">,
      });
    } catch (error) {
      Alert.alert(
        "Could not accept participant",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  if (!ridePostId || onboarding === undefined || !onboarding?.isCompleted) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1E6CCC" />
      </View>
    );
  }

  const renderHostView = () => {
    if (!hostedRideData) return null;
    const rideStartAt = (hostedRideData.ridePost as any).rideStartAt as number | undefined;
    const pricePerPerson = (hostedRideData.ridePost as any).pricePerPerson as number | undefined;
    const timeLabel = formatRideTime(rideStartAt) ?? "Time TBD";
    const priceLabel = pricePerPerson && Number.isFinite(pricePerPerson)
      ? `₹${pricePerPerson} / person`
      : "Price TBD";
    const isStopping = stoppingRideId === hostedRideData.ridePost._id;
    const isStarted = hostedRideData.ridePost.isStarted === true;

    return (
      <>
        <View style={waitingStyles.summaryCard}>
          <Text style={waitingStyles.routeText}>
            {hostedRideData.ridePost.startPoint} → {hostedRideData.ridePost.endPoint}
          </Text>
          <Text style={waitingStyles.metaText}>
            {VEHICLE_LABELS[hostedRideData.ridePost.vehicleType]} · {timeLabel} · {priceLabel}
          </Text>
          <View style={waitingStyles.pillRow}>
            <View style={waitingStyles.pendingPill}>
              <Text style={waitingStyles.pendingPillText}>
                {hostedRideData.ridePost.joinedCount} joined
              </Text>
            </View>
            <View style={waitingStyles.seatsLeftPill}>
              <Text style={waitingStyles.seatsLeftPillText}>
                {Math.max(0, hostedRideData.ridePost.capacity - hostedRideData.ridePost.joinedCount)} seats left
              </Text>
            </View>
          </View>
        </View>

        <Text style={waitingStyles.sectionHeading}>PENDING REQUESTS</Text>
        {hostedRideData.pendingJoinees.length === 0 ? (
          <Text style={styles.description}>No pending requests.</Text>
        ) : (
          <View style={styles.postList}>
            {hostedRideData.pendingJoinees.map((joinee) => (
              <View key={joinee._id} style={waitingStyles.participantCard}>
                <View style={styles.personRow}>
                  <Pressable
                    onPress={() =>
                      setSelectedProfile({
                        name: joinee.joineeName,
                        photoUrl: joinee.joineePhotoUrl,
                        registrationNumber: extractRegistrationNumber(joinee.joineeName, joinee.joineeEmail),
                      })
                    }>
                    {joinee.joineePhotoUrl ? (
                      <Image source={{ uri: joinee.joineePhotoUrl }} style={styles.personAvatarSmall} />
                    ) : (
                      <View style={styles.personAvatarFallbackSmall}>
                        <Text style={styles.personAvatarFallbackTextSmall}>
                          {joinee.joineeName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  <View style={waitingStyles.participantTextWrap}>
                    <Text style={styles.postName}>{joinee.joineeName}</Text>
                    <Text style={styles.postMeta}>{joinee.joineeEmail ?? "No email"}</Text>
                  </View>
                </View>
                <View style={waitingStyles.actionRow}>
                  <Pressable
                    style={({ pressed }) => [waitingStyles.actionButton, pressed && styles.buttonPressed]}
                    onPress={() => void onAcceptJoinee(String(joinee.userId))}>
                    <Text style={waitingStyles.actionButtonText}>Accept</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      waitingStyles.actionButton,
                      removingUserId === joinee.userId && styles.buttonDisabled,
                      pressed && removingUserId !== joinee.userId && styles.buttonPressed,
                    ]}
                    onPress={() => void onRemoveJoinee(String(joinee.userId))}
                    disabled={removingUserId === joinee.userId}>
                    <Text style={waitingStyles.actionButtonText}>
                      {removingUserId === joinee.userId ? "Removing..." : "Reject"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={waitingStyles.sectionHeading}>ACCEPTED</Text>
        {hostedRideData.acceptedJoinees.length === 0 ? (
          <Text style={styles.description}>No accepted riders yet.</Text>
        ) : (
          <View style={styles.postList}>
            {hostedRideData.acceptedJoinees.map((joinee) => (
              <View key={joinee._id} style={waitingStyles.participantCard}>
                <View style={styles.personRow}>
                  <Pressable
                    onPress={() =>
                      setSelectedProfile({
                        name: joinee.joineeName,
                        photoUrl: joinee.joineePhotoUrl,
                        registrationNumber: extractRegistrationNumber(joinee.joineeName, joinee.joineeEmail),
                      })
                    }>
                    {joinee.joineePhotoUrl ? (
                      <Image source={{ uri: joinee.joineePhotoUrl }} style={styles.personAvatarSmall} />
                    ) : (
                      <View style={styles.personAvatarFallbackSmall}>
                        <Text style={styles.personAvatarFallbackTextSmall}>
                          {joinee.joineeName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  <View style={waitingStyles.participantTextWrap}>
                    <Text style={styles.postName}>{joinee.joineeName}</Text>
                    <Text style={styles.postMeta}>{joinee.joineeEmail ?? "No email"}</Text>
                  </View>
                </View>
                <View style={waitingStyles.actionRow}>
                  <Pressable
                    style={({ pressed }) => [
                      waitingStyles.actionButton,
                      removingUserId === joinee.userId && styles.buttonDisabled,
                      pressed && removingUserId !== joinee.userId && styles.buttonPressed,
                    ]}
                    onPress={() => void onRemoveJoinee(String(joinee.userId))}
                    disabled={removingUserId === joinee.userId}>
                    <Text style={waitingStyles.actionButtonText}>
                      {removingUserId === joinee.userId ? "Removing..." : "Kick"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <AppButton
          title="Group chat"
          onPress={() => router.push({ pathname: "/chat", params: { ridePostId } })}
          variant="secondary"
        />

        <Pressable
          style={({ pressed }) => [
            waitingStyles.rideActionButton,
            waitingStyles.startRideButton,
            (isStarted || isStopping) && styles.buttonDisabled,
            pressed && !isStarted && !isStopping && styles.buttonPressed,
          ]}
          onPress={() => void onStartRide(hostedRideData.ridePost._id)}
          disabled={isStarted || isStopping}>
          <Text style={waitingStyles.startRideButtonText}>
            {isStarted ? "Ride started" : "Start ride"}
          </Text>
        </Pressable>

        <View style={waitingStyles.stopRow}>
          <Pressable
            style={({ pressed }) => [
              waitingStyles.rideActionButton,
              waitingStyles.cancelRideButton,
              isStopping && styles.buttonDisabled,
              pressed && !isStopping && styles.buttonPressed,
            ]}
            onPress={() => void onStopRide(hostedRideData.ridePost._id, false)}
            disabled={isStopping}>
            <Text style={waitingStyles.cancelRideButtonText}>
              {isStopping ? "Stopping..." : "Cancel ride"}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              waitingStyles.rideActionButton,
              waitingStyles.endRideButton,
              isStopping && styles.buttonDisabled,
              pressed && !isStopping && styles.buttonPressed,
            ]}
            onPress={() => void onStopRide(hostedRideData.ridePost._id, true)}
            disabled={isStopping}>
            <Text style={waitingStyles.endRideButtonText}>
              {isStopping ? "Stopping..." : "End ride"}
            </Text>
          </Pressable>
        </View>
      </>
    );
  };

  const renderJoinedView = () => {
    if (!joinedRideData) return null;
    const rideStartAt = (joinedRideData.ridePost as any).rideStartAt as number | undefined;
    const pricePerPerson = (joinedRideData.ridePost as any).pricePerPerson as number | undefined;
    const timeLabel = formatRideTime(rideStartAt) ?? "Time TBD";
    const priceLabel = pricePerPerson && Number.isFinite(pricePerPerson)
      ? `₹${pricePerPerson} / person`
      : "Price TBD";

    return (
      <>
        <View style={waitingStyles.summaryCard}>
          <Text style={waitingStyles.routeText}>
            {joinedRideData.ridePost.startPoint} → {joinedRideData.ridePost.endPoint}
          </Text>
          <Text style={waitingStyles.metaText}>
            {VEHICLE_LABELS[joinedRideData.ridePost.vehicleType]} · {timeLabel} · {priceLabel}
          </Text>
          {joinedRideData.ridePost.isStarted === true && (
            <View style={waitingStyles.startedPill}>
              <Text style={waitingStyles.startedPillText}>Ride started · entries closed</Text>
            </View>
          )}
        </View>

        <Text style={waitingStyles.sectionHeading}>HOST</Text>
        <View style={waitingStyles.participantCard}>
          <View style={styles.personRow}>
            <Pressable
              onPress={() =>
                setSelectedProfile({
                  name: joinedRideData.host.name,
                  photoUrl: joinedRideData.host.photoUrl,
                  registrationNumber: extractRegistrationNumber(
                    joinedRideData.host.name,
                    joinedRideData.host.email,
                  ),
                })
              }>
              {joinedRideData.host.photoUrl ? (
                <Image source={{ uri: joinedRideData.host.photoUrl }} style={styles.personAvatarSmall} />
              ) : (
                <View style={styles.personAvatarFallbackSmall}>
                  <Text style={styles.personAvatarFallbackTextSmall}>
                    {joinedRideData.host.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>
            <View style={waitingStyles.participantTextWrap}>
              <Text style={styles.postName}>{joinedRideData.host.name}</Text>
              <Text style={styles.postMeta}>{joinedRideData.host.email ?? "No email"}</Text>
            </View>
          </View>
        </View>

        <Text style={waitingStyles.sectionHeading}>PARTICIPANTS</Text>
        {joinedRideData.acceptedJoinees.length === 0 ? (
          <Text style={styles.description}>No other participants yet.</Text>
        ) : (
          <View style={styles.postList}>
            {joinedRideData.acceptedJoinees.map((joinee) => (
              <View key={joinee._id} style={waitingStyles.participantCard}>
                <View style={styles.personRow}>
                  <Pressable
                    onPress={() =>
                      setSelectedProfile({
                        name: joinee.joineeName,
                        photoUrl: joinee.joineePhotoUrl,
                        registrationNumber: extractRegistrationNumber(joinee.joineeName, joinee.joineeEmail),
                      })
                    }>
                    {joinee.joineePhotoUrl ? (
                      <Image source={{ uri: joinee.joineePhotoUrl }} style={styles.personAvatarSmall} />
                    ) : (
                      <View style={styles.personAvatarFallbackSmall}>
                        <Text style={styles.personAvatarFallbackTextSmall}>
                          {joinee.joineeName.charAt(0).toUpperCase()}
                        </Text>
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

        {joinedRideData.joinStatus === "accepted" && (
          <AppButton
            title="Group chat"
            onPress={() => router.push({ pathname: "/chat", params: { ridePostId } })}
            variant="secondary"
          />
        )}

        <AppButton
          title={isLeaving ? "Leaving..." : "Leave ride"}
          onPress={() => void onLeaveRide(joinedRideData.ridePost._id)}
          disabled={isLeaving}
          variant="secondary"
        />
      </>
    );
  };

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView edges={["bottom"]} style={[styles.safeArea, { paddingHorizontal: 0 }]}>
        <ScrollView contentContainerStyle={[styles.boardContent, { paddingHorizontal: 16 }]}>
          {hostedRideData === undefined || joinedRideData === undefined ? (
            <Text style={styles.description}>Loading ride details...</Text>
          ) : hostedRideData ? (
            renderHostView()
          ) : joinedRideData ? (
            renderJoinedView()
          ) : (
            <Text style={styles.description}>This ride is no longer active.</Text>
          )}
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
                      <Text style={styles.overlayProfileAvatarFallbackText}>
                        {selectedProfile.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.postName}>{selectedProfile.name}</Text>
                    <Text style={styles.postMeta}>Reg. no.: {selectedProfile.registrationNumber ?? "N/A"}</Text>
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
    color: "#F3F4F6",
    fontSize: 20,
    lineHeight: 27,
    fontFamily: "InterBold",
  },
  metaText: {
    color: "#C7CDD9",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  pendingPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#1F3654",
  },
  pendingPillText: {
    color: "#93C5FD",
    fontSize: 12,
    fontFamily: "InterBold",
  },
  seatsLeftPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#052E16",
  },
  seatsLeftPillText: {
    color: "#86EFAC",
    fontSize: 12,
    fontFamily: "InterBold",
  },
  startedPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#052E16",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  startedPillText: {
    color: "#86EFAC",
    fontSize: 12,
    fontFamily: "InterMedium",
  },
  sectionHeading: {
    color: "#AEB5C0",
    fontSize: 13,
    letterSpacing: 0.6,
    fontFamily: "InterBold",
  },
  participantCard: {
    borderWidth: 1,
    borderColor: "#4B5563",
    backgroundColor: "#2A2D33",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  participantTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    minHeight: 36,
    minWidth: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5B6371",
    backgroundColor: "#3A3F47",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionButtonText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  stopRow: {
    flexDirection: "row",
    gap: 10,
  },
  rideActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  startRideButton: {
    borderColor: "#166534",
    backgroundColor: "#052E16",
  },
  startRideButtonText: {
    color: "#86EFAC",
    fontSize: 16,
    fontFamily: "InterBold",
  },
  cancelRideButton: {
    borderColor: "#4B5563",
    backgroundColor: "#2A2D33",
  },
  cancelRideButtonText: {
    color: "#C7CDD9",
    fontSize: 16,
    fontFamily: "InterMedium",
  },
  endRideButton: {
    borderColor: "#7F1D1D",
    backgroundColor: "#2D1A1F",
  },
  endRideButtonText: {
    color: "#FCA5A5",
    fontSize: 16,
    fontFamily: "InterBold",
  },
});
