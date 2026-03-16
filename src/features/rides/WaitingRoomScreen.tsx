import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { styles } from "../styles";
import { VEHICLE_LABELS } from "./constants";

export function WaitingRoomScreen() {
  const params = useLocalSearchParams<{ ridePostId?: string }>();
  const ridePostId = params.ridePostId;

  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const stopRidePost = useMutation(api.rides.stopRidePost);
  const hostedRideData = useQuery(
    api.rides.getHostedRidePost,
    ridePostId ? { ridePostId: ridePostId as Id<"ridePosts"> } : "skip",
  );

  const [stoppingRideId, setStoppingRideId] = useState<string | null>(null);

  useEffect(() => {
    if (!ridePostId || (onboarding && !onboarding.isCompleted)) {
      router.replace("/");
    }
  }, [onboarding, ridePostId]);

  const onStopRide = async (id: string) => {
    try {
      setStoppingRideId(id);
      await stopRidePost({ ridePostId: id as Id<"ridePosts"> });
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Could not stop ride",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setStoppingRideId(null);
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
            {!hostedRideData ? (
              <Text style={styles.description}>Loading your hosted ride…</Text>
            ) : (
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
                        <Text style={styles.postName}>{joinee.joineeName}</Text>
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
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
