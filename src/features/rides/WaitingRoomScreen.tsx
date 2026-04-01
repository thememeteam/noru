import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
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
        "Could not stop ride",
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

  if (!ridePostId || onboarding === undefined || !onboarding?.isCompleted) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#b50246" />
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
                <Text>
                  {hostedRideData.ridePost.startPoint} → {hostedRideData.ridePost.endPoint}
                </Text>
                <Text>
                  {VEHICLE_LABELS[hostedRideData.ridePost.vehicleType]} · {hostedRideData.ridePost.joinedCount}/
                  {hostedRideData.ridePost.capacity}
                </Text>

                <Text style={styles.sectionLabel}>Joinees</Text>
                {hostedRideData.joinees.length === 0 ? (
                  <Text style={styles.description}>No one has joined yet.</Text>
                ) : (
                  <View style={styles.postList}>
                    {hostedRideData.joinees.map((joinee) => (
                      <View key={joinee._id} style={styles.postItem}>
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
                          <Text style={styles.postName}>{joinee.joineeName}</Text>
                        </View>
                        <AppButton
                          title={removingUserId === joinee.userId ? "Removing..." : "Remove participant"}
                          onPress={() => void onRemoveJoinee(String(joinee.userId))}
                          disabled={removingUserId === joinee.userId}
                          variant="danger"
                        />
                      </View>
                    ))}
                  </View>
                )}

                <AppButton
                  title={
                    stoppingRideId === hostedRideData.ridePost._id ? "Stopping..." : "Stop ride"
                  }
                  onPress={() => void onStopRide(hostedRideData.ridePost._id)}
                  disabled={stoppingRideId === hostedRideData.ridePost._id}
                  variant="danger"
                />
              </>
            ) : joinedRideData ? (
              <>
                <Text>
                  {joinedRideData.ridePost.startPoint} → {joinedRideData.ridePost.endPoint}
                </Text>
                <Text>
                  {VEHICLE_LABELS[joinedRideData.ridePost.vehicleType]} · {joinedRideData.ridePost.joinedCount}/
                  {joinedRideData.ridePost.capacity}
                </Text>

                <Text style={styles.sectionLabel}>Host</Text>
                <View style={styles.postItem}>
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
                    <Text style={styles.postName}>{joinedRideData.host.name}</Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Participants</Text>
                {joinedRideData.joinees.length === 0 ? (
                  <Text style={styles.description}>No participants yet.</Text>
                ) : (
                  <View style={styles.postList}>
                    {joinedRideData.joinees.map((joinee) => (
                      <View key={joinee._id} style={styles.postItem}>
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
                          <Text style={styles.postName}>{joinee.joineeName}</Text>
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
