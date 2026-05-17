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
import { RouteMap } from "./RouteMap";

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
  const [acceptingUserId, setAcceptingUserId] = useState<string | null>(null);
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
      setAcceptingUserId(joineeUserId);
      await acceptJoineeForRide({
        ridePostId: ridePostId as Id<"ridePosts">,
        joineeUserId: joineeUserId as Id<"users">,
      });
    } catch (error) {
      Alert.alert(
        "Could not accept participant",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setAcceptingUserId(null);
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
          <View style={waitingStyles.routeBlock}>
            <View style={waitingStyles.routeStopRow}>
              <View style={[waitingStyles.routeDot, waitingStyles.routeDotOrigin]} />
              <View style={waitingStyles.routeStopInfo}>
                <Text style={waitingStyles.routeStopLabel}>From</Text>
                <Text style={waitingStyles.routeStopName} numberOfLines={1}>
                  {hostedRideData.ridePost.startPoint}
                </Text>
              </View>
            </View>
            <View style={waitingStyles.routeConnector} />
            <View style={waitingStyles.routeStopRow}>
              <View style={[waitingStyles.routeDot, waitingStyles.routeDotDest]} />
              <View style={waitingStyles.routeStopInfo}>
                <Text style={waitingStyles.routeStopLabel}>To</Text>
                <Text style={waitingStyles.routeStopName} numberOfLines={1}>
                  {hostedRideData.ridePost.endPoint}
                </Text>
              </View>
            </View>
          </View>
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

        <RouteMap
          startPoint={hostedRideData.ridePost.startPoint}
          endPoint={hostedRideData.ridePost.endPoint}
        />

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
                  </View>
                </View>
                <View style={waitingStyles.actionRow}>
                  <Pressable
                    style={({ pressed }) => [
                      waitingStyles.acceptButton,
                      acceptingUserId === joinee.userId && styles.buttonDisabled,
                      pressed && acceptingUserId !== joinee.userId && styles.buttonPressed,
                    ]}
                    onPress={() => void onAcceptJoinee(String(joinee.userId))}
                    disabled={acceptingUserId === joinee.userId}>
                    <Text style={waitingStyles.acceptButtonText}>
                      {acceptingUserId === joinee.userId ? "Accepting..." : "Accept"}
                    </Text>
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
                      {removingUserId === joinee.userId ? "Removing..." : "Remove"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

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
              {isStopping ? "Stopping..." : "Cancel"}
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

        <AppButton
          title="Group chat"
          onPress={() => router.push({ pathname: "/chat", params: { ridePostId } })}
          variant="secondary"
        />
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
          <View style={waitingStyles.routeBlock}>
            <View style={waitingStyles.routeStopRow}>
              <View style={[waitingStyles.routeDot, waitingStyles.routeDotOrigin]} />
              <View style={waitingStyles.routeStopInfo}>
                <Text style={waitingStyles.routeStopLabel}>From</Text>
                <Text style={waitingStyles.routeStopName} numberOfLines={1}>
                  {joinedRideData.ridePost.startPoint}
                </Text>
              </View>
            </View>
            <View style={waitingStyles.routeConnector} />
            <View style={waitingStyles.routeStopRow}>
              <View style={[waitingStyles.routeDot, waitingStyles.routeDotDest]} />
              <View style={waitingStyles.routeStopInfo}>
                <Text style={waitingStyles.routeStopLabel}>To</Text>
                <Text style={waitingStyles.routeStopName} numberOfLines={1}>
                  {joinedRideData.ridePost.endPoint}
                </Text>
              </View>
            </View>
          </View>
          <Text style={waitingStyles.metaText}>
            {VEHICLE_LABELS[joinedRideData.ridePost.vehicleType]} · {timeLabel} · {priceLabel}
          </Text>
          <View style={waitingStyles.pillRow}>
            {joinedRideData.joinStatus === "pending" ? (
              <View style={waitingStyles.pendingPill}>
                <Text style={waitingStyles.pendingPillText}>Waiting for approval</Text>
              </View>
            ) : (
              <View style={waitingStyles.seatsLeftPill}>
                <Text style={waitingStyles.seatsLeftPillText}>You're confirmed</Text>
              </View>
            )}
            {joinedRideData.ridePost.isStarted === true && (
              <View style={waitingStyles.startedPill}>
                <Text style={waitingStyles.startedPillText}>Ride started</Text>
              </View>
            )}
          </View>
        </View>

        <RouteMap
          startPoint={joinedRideData.ridePost.startPoint}
          endPoint={joinedRideData.ridePost.endPoint}
        />

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
            </View>
          </View>
        </View>

        {joinedRideData.acceptedJoinees.length > 0 && (
          <>
            <Text style={waitingStyles.sectionHeading}>RIDERS</Text>
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
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
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
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#1E6CCC" />
            </View>
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
              <View style={{ alignItems: "center", gap: 10 }}>
                {selectedProfile.photoUrl ? (
                  <Image source={{ uri: selectedProfile.photoUrl }} style={styles.overlayProfileAvatar} />
                ) : (
                  <View style={styles.overlayProfileAvatarFallback}>
                    <Text style={styles.overlayProfileAvatarFallbackText}>
                      {selectedProfile.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ alignItems: "center", gap: 3 }}>
                  <Text style={styles.postName}>{selectedProfile.name}</Text>
                  {selectedProfile.registrationNumber && (
                    <Text style={styles.postMeta}>Reg. {selectedProfile.registrationNumber}</Text>
                  )}
                </View>
              </View>
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
    backgroundColor: "#32353B",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  routeBlock: {
    gap: 0,
  },
  routeStopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  routeDotOrigin: {
    borderColor: "#60A5FA",
    backgroundColor: "#1e3a5f",
  },
  routeDotDest: {
    borderColor: "#34D399",
    backgroundColor: "#052e16",
  },
  routeConnector: {
    width: 2,
    height: 10,
    backgroundColor: "#4B5563",
    marginLeft: 4,
    marginVertical: 3,
  },
  routeStopInfo: {
    flex: 1,
    gap: 1,
  },
  routeStopLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontFamily: "InterMedium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  routeStopName: {
    fontSize: 16,
    color: "#F3F4F6",
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
    fontFamily: "InterBold",
  },
  sectionHeading: {
    color: "#9CA3AF",
    fontSize: 14,
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
    minHeight: 44,
    minWidth: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#5B6371",
    backgroundColor: "#3A3F47",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  actionButtonText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  acceptButton: {
    minHeight: 44,
    minWidth: 80,
    borderRadius: 12,
    backgroundColor: "#1E6CCC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  acceptButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontFamily: "InterBold",
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
    borderColor: "#1E6CCC",
    backgroundColor: "#1E6CCC",
  },
  startRideButtonText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontFamily: "InterBold",
  },
  cancelRideButton: {
    borderColor: "#7F1D1D",
    backgroundColor: "#3F1D1D",
  },
  cancelRideButtonText: {
    color: "#FCA5A5",
    fontSize: 15,
    fontFamily: "InterBold",
  },
  endRideButton: {
    borderColor: "#5B6371",
    backgroundColor: "#3A3F47",
  },
  endRideButtonText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontFamily: "InterBold",
  },
});
