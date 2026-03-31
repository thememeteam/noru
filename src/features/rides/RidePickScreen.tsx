import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { styles } from "../styles";
import { VEHICLE_LABELS } from "./constants";

export function RidePickScreen() {
  const posts = useQuery(api.rides.listJoinableRidePosts) ?? [];
  const joinRidePost = useMutation(api.rides.joinRidePost);

  const [joiningRideId, setJoiningRideId] = useState<string | null>(null);

  const onJoinRide = async (ridePostId: string) => {
    try {
      setJoiningRideId(ridePostId);
      await joinRidePost({ ridePostId: ridePostId as Id<"ridePosts"> });
      Alert.alert("Joined", "You have joined this ride post.");
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
    <View style={styles.pickScreenContainer}>
      <ScrollView contentContainerStyle={styles.boardContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Pick a ride</Text>
          <Text style={styles.description}>Browse open rides and join one.</Text>
          {posts.length === 0 ? (
            <Text style={styles.description}>No joinable rides right now.</Text>
          ) : (
            <View style={styles.postList}>
              {posts.map((post) => (
                <View key={post._id} style={styles.postItem}>
                  <View style={styles.postHeader}>
                    <Text style={styles.postName}>{post.riderName}</Text>
                    <View style={[styles.badge, post.isFull ? styles.badgeFull : styles.badgeOpen]}>
                      <Text style={[styles.badgeText, post.isFull ? styles.badgeTextFull : styles.badgeTextOpen]}>
                        {post.isFull ? "Full" : "Open"}
                      </Text>
                    </View>
                  </View>
                  <Text>
                    {post.startPoint} → {post.endPoint}
                  </Text>
                  <Text style={styles.postMeta}>{VEHICLE_LABELS[post.vehicleType]}</Text>
                  <AppButton
                    title={joiningRideId === post._id ? "Joining..." : "Join ride"}
                    onPress={() => void onJoinRide(post._id)}
                    disabled={joiningRideId === post._id}
                  />
                  <AppButton
                    title="Report user"
                    onPress={() =>
                      router.push({
                        pathname: "/report",
                        params: {
                          reportedUserId: String(post.userId),
                          reportedName: post.riderName,
                          ridePostId: post._id,
                        },
                      })
                    }
                    variant="secondary"
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push("/host")}>
        <Text style={styles.fabText}>Host</Text>
      </Pressable>
    </View>
  );
}
