import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export function FeedbackScreen() {
  const styles = useAppStyles();
  const params = useLocalSearchParams<{ ridePostId?: string }>();
  const ridePostId = params.ridePostId;
  const feedbackTargets = useQuery(
    api.rides.getRideFeedbackTargets,
    ridePostId ? { ridePostId: ridePostId as Id<"ridePosts"> } : "skip",
  );
  const submitRideUserFeedback = useMutation(api.rides.submitRideUserFeedback);

  const [ratingsByUser, setRatingsByUser] = useState<Record<string, number>>({});
  const [elseByUser, setElseByUser] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (isSubmitting || !feedbackTargets || feedbackTargets.targets.length === 0) {
      return false;
    }

    return feedbackTargets.targets.every((target) => (ratingsByUser[String(target.userId)] ?? 0) > 0);
  }, [feedbackTargets, isSubmitting, ratingsByUser]);

  const onStarPress = (userId: string, value: number) => {
    setRatingsByUser((prev) => ({
      ...prev,
      [userId]: prev[userId] === value ? 0 : value,
    }));
  };

  const onSubmit = async () => {
    if (!canSubmit || !feedbackTargets || !ridePostId) {
      return;
    }

    try {
      setIsSubmitting(true);

      await submitRideUserFeedback({
        ridePostId: ridePostId as Id<"ridePosts">,
        ratings: feedbackTargets.targets.map((target) => {
          const key = String(target.userId);
          return {
            rateeUserId: target.userId,
            rating: ratingsByUser[key] ?? 0,
            anythingElse: elseByUser[key]?.trim() || undefined,
          };
        }),
      });

      Alert.alert("Thanks!", "Your feedback has been submitted.", [
        {
          text: "OK",
          onPress: () => router.replace("/"),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Could not submit feedback",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Ride feedback</Text>
            {feedbackTargets === undefined ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#b50246" />
              </View>
            ) : feedbackTargets.targets.length === 0 ? (
              <Text style={styles.description}>No users to rate for this ride.</Text>
            ) : (
              <>
                <Text style={styles.description}>Rate each user from this completed ride.</Text>
                {feedbackTargets.targets.map((target) => {
                  const key = String(target.userId);
                  const selectedRating = ratingsByUser[key] ?? target.existingRating ?? 0;

                  return (
                    <View key={key} style={styles.postItem}>
                      <View style={styles.personRow}>
                        {target.photoUrl ? (
                          <Image source={{ uri: target.photoUrl }} style={styles.personAvatarSmall} />
                        ) : (
                          <View style={styles.personAvatarFallbackSmall}>
                            <Text style={styles.personAvatarFallbackTextSmall}>U</Text>
                          </View>
                        )}
                        <View>
                          <Text style={styles.postName}>{target.displayName}</Text>
                          <Text style={styles.postMeta}>{target.email ?? "No email found"}</Text>
                        </View>
                      </View>

                      <Text style={styles.sectionLabel}>Rating</Text>
                      <View style={styles.starRow}>
                        {STAR_VALUES.map((value) => {
                          const isActive = value <= selectedRating;
                          return (
                            <Pressable
                              key={`${key}-${value}`}
                              style={[styles.starButton, isActive && styles.starButtonActive]}
                              onPress={() => onStarPress(key, value)}>
                              <Text style={[styles.starText, isActive && styles.starTextActive]}>★</Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <TextInput
                        style={[styles.input, styles.feedbackTextArea]}
                        value={elseByUser[key] ?? ""}
                        onChangeText={(value) => setElseByUser((prev) => ({ ...prev, [key]: value }))}
                        placeholder="Anything else?"
                        placeholderTextColor="#7B879C"
                        multiline
                        textAlignVertical="top"
                      />
                    </View>
                  );
                })}

                <AppButton
                  title={isSubmitting ? "Submitting..." : "Submit feedback"}
                  onPress={() => void onSubmit()}
                  disabled={!canSubmit}
                />
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
